import { NextResponse } from 'next/server';
import { getOptionalAuthUser } from '@/lib/auth';
import { parseReceiptText } from '@/lib/receipt-parser';

export const dynamic = 'force-dynamic';

type OcrResponse = {
  ParsedResults?: Array<{
    ParsedText?: string;
  }>;
  ErrorMessage?: string | string[] | null;
  ErrorDetails?: string | null;
};

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
    const ocrForm = new FormData();
    ocrForm.append('file', new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' }), file.name);
    ocrForm.append('language', 'spa');
    ocrForm.append('isTable', 'true');
    ocrForm.append('scale', 'true');
    ocrForm.append('OCREngine', '3');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        apikey: apiKey,
      },
      body: ocrForm,
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'OCR provider request failed' }, { status: 502 });
    }

    const payload = (await response.json()) as OcrResponse;
    const parsedText =
      payload.ParsedResults?.map((item) => item.ParsedText?.trim() || '').filter(Boolean).join('\n\n') || '';

    if (!parsedText) {
      return NextResponse.json(
        {
          error: 'No se pudo leer texto de la boleta',
          providerError: payload.ErrorMessage ?? payload.ErrorDetails ?? null,
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
