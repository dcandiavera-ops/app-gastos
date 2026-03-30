type ParsedReceipt = {
  merchant: string;
  amount: number | null;
  date: string | null;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  rawText: string;
};

const MERCHANT_BLOCKLIST = [
  'boleta',
  'factura',
  'rut',
  'folio',
  'cajero',
  'caja',
  'fecha',
  'hora',
  'total',
  'iva',
  'neto',
  'transbank',
  'debito',
  'credito',
];

function normalizeLine(line: string) {
  return line.replace(/\s+/g, ' ').trim();
}

function parseAmountToken(token: string) {
  const normalized = token.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function extractAmount(lines: string[]) {
  const keywordMatches: number[] = [];
  const fallbackMatches: number[] = [];

  for (const line of lines) {
    const numbers = line.match(/\$?\s*\d[\d.,]{2,}/g) ?? [];
    const parsed = numbers.map(parseAmountToken).filter((value): value is number => value !== null && value > 0);

    if (!parsed.length) {
      continue;
    }

    const lower = line.toLowerCase();
    if (/(total|monto total|total a pagar|importe|saldo)/.test(lower)) {
      keywordMatches.push(...parsed);
    } else {
      fallbackMatches.push(...parsed);
    }
  }

  const pool = keywordMatches.length ? keywordMatches : fallbackMatches;
  return pool.length ? Math.max(...pool) : null;
}

function extractDate(text: string) {
  const patterns = [
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
    /\b(\d{2})[/-](\d{2})[/-](\d{4})\b/,
    /\b(\d{2})[.-](\d{2})[.-](\d{4})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    if (pattern === patterns[0]) {
      return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`).toISOString();
    }

    return new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`).toISOString();
  }

  return null;
}

function extractMerchant(lines: string[]) {
  for (const rawLine of lines.slice(0, 8)) {
    const line = normalizeLine(rawLine);
    if (line.length < 3) {
      continue;
    }

    const lower = line.toLowerCase();
    if (MERCHANT_BLOCKLIST.some((word) => lower.includes(word))) {
      continue;
    }

    if (!/[a-zA-Z]/.test(line)) {
      continue;
    }

    return line.slice(0, 80);
  }

  return 'Boleta escaneada';
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const merchant = extractMerchant(lines);
  const amount = extractAmount(lines);
  const date = extractDate(rawText);

  let confidence: ParsedReceipt['confidence'] = 'low';
  if (merchant !== 'Boleta escaneada' && amount !== null && date) {
    confidence = 'high';
  } else if (amount !== null || date || merchant !== 'Boleta escaneada') {
    confidence = 'medium';
  }

  return {
    merchant,
    amount,
    date,
    description: merchant,
    confidence,
    rawText,
  };
}
