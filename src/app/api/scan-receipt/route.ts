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
  name: string;
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
    config,
    payload,
    parsedText,
  };
}

function scoreReceiptCandidate(parsedText: string, receipt: ReturnType<typeof parseReceiptText>) {
  let score = 0;
  const normalized = parsedText.toLowerCase();

  if (receipt.amount !== null) {
    score += 40;
  }

  if (receipt.date) {
    score += 20;
  }

  if (receipt.confidence === 'high') {
    score += 30;
  } else if (receipt.confidence === 'medium') {
    score += 15;
  }

  if (/(total|tota1|tota\]|totai|toial)/.test(normalized)) {
    score += 20;
  }

  if (/\biva\b/.test(normalized)) {
    score += 10;
  }

  if (/\b(compra|subtotal|neto)\b/.test(normalized)) {
    score += 10;
  }

  score += Math.min(parsedText.length / 40, 20);

  return score;
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
      { name: 'table-engine-3', isTable: 'true', ocrEngine: '3' },
      { name: 'plain-engine-2', isTable: 'false', ocrEngine: '2', detectOrientation: 'true' },
    ];

    let bestCandidate:
      | {
          parsedText: string;
          receipt: ReturnType<typeof parseReceiptText>;
          score: number;
          configName: string;
        }
      | null = null;
    let lastPayload: OcrResponse | null = null;

    for (const attempt of attempts) {
      const result = await runOcrAttempt(file, apiKey, attempt);
      lastPayload = result.payload;

      if (!result.parsedText) {
        continue;
      }

      const receipt = parseReceiptText(result.parsedText);
      const score = scoreReceiptCandidate(result.parsedText, receipt);

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = {
          parsedText: result.parsedText,
          receipt,
          score,
          configName: result.config.name,
        };
      }
    }

    if (!bestCandidate) {
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
      receipt: bestCandidate.receipt,
      provider: {
        selectedAttempt: bestCandidate.configName,
        usedFallbackKey: !process.env.OCR_SPACE_API_KEY,
      },
    });
  } catch (error) {
    console.error('OCR scan error:', error);
    return NextResponse.json({ error: 'Failed to scan receipt' }, { status: 500 });
  }
}
