import { NextResponse } from 'next/server';
import { getOptionalAuthUser } from '@/lib/auth';
import { parseReceiptText } from '@/lib/receipt-parser';

export const dynamic = 'force-dynamic';

type OcrResponse = {
  ParsedResults?: Array<{
    ParsedText?: string;
  }>;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[] | null;
  ErrorDetails?: string | null;
};

type OcrAttemptConfig = {
  isTable: 'true' | 'false';
  ocrEngine: '2' | '3';
  detectOrientation?: 'true';
};

function getProviderError(payload: OcrResponse) {
  const errorMessage = Array.isArray(payload.ErrorMessage)
    ? payload.ErrorMessage.filter(Boolean).join(' | ')
    : payload.ErrorMessage;

  return errorMessage || payload.ErrorDetails || null;
}

async function runOcrAttempt(file: File, apiKey: string, config: OcrAttemptConfig) {
  const ocrForm = new FormData();
  ocrForm.append('file', new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' }), file.name);
  ocrForm.append('language', 'spa');
  ocrForm.append('isTable', config.isTable);
  ocrForm.append('scale', 'true');
  ocrForm.append('OCREngine', config.ocrEngine);

  if (config.detectOrientation) {
    ocrForm.append('detectOrientation', config.detectOrientation);
  }

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: apiKey,
    },
    body: ocrForm,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('OCR provider request failed');
  }

  const payload = (await response.json()) as OcrResponse;
  const parsedText =
    payload.ParsedResults?.map((item) => item.ParsedText?.trim() || '').filter(Boolean).join('\n\n') || '';

  return {
    payload,
    parsedText,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getOptionalAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';
    const attempts: OcrAttemptConfig[] = [
      { isTable: 'true', ocrEngine: '3' },
      { isTable: 'false', ocrEngine: '2', detectOrientation: 'true' },
    ];

    let parsedText = '';
    let lastPayload: OcrResponse | null = null;

    for (const attempt of attempts) {
      const result = await runOcrAttempt(file, apiKey, attempt);
      lastPayload = result.payload;

      if (result.parsedText) {
        parsedText = result.parsedText;
        break;
      }
    }

    if (!parsedText) {
      const providerError = lastPayload ? getProviderError(lastPayload) : null;

      return NextResponse.json(
        {
          error: !process.env.OCR_SPACE_API_KEY
            ? 'No se pudo leer la boleta. Falta configurar OCR_SPACE_API_KEY en el servidor.'
            : 'No se pudo leer texto de la boleta',
          providerError,
          usedFallbackKey: !process.env.OCR_SPACE_API_KEY,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      receipt: parseReceiptText(parsedText),
      provider: {
        usedFallbackKey: !process.env.OCR_SPACE_API_KEY,
      },
    });
  } catch (error) {
    console.error('OCR scan error:', error);
    return NextResponse.json({ error: 'Failed to scan receipt' }, { status: 500 });
  }
}
