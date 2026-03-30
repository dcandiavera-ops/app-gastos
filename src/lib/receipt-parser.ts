type ParsedReceipt = {
  merchant: string;
  amount: number | null;
  date: string | null;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  rawText: string;
  suggestedCategory: {
    name: string;
    color: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
};

type CategoryRule = {
  name: string;
  color: string;
  keywords: string[];
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
  'autorizacion',
  'vuelto',
  'cliente',
];

const CATEGORY_RULES: CategoryRule[] = [
  {
    name: 'Supermercado',
    color: '#6EE7B7',
    keywords: ['lider', 'jumbo', 'unimarc', 'tottus', 'santa isabel', 'supermercado', 'express de lider'],
  },
  {
    name: 'Farmacia',
    color: '#93C5FD',
    keywords: ['cruz verde', 'salcobrand', 'ahumada', 'farmacia', 'dr simi'],
  },
  {
    name: 'Combustible',
    color: '#FCA5A5',
    keywords: ['copec', 'shell', 'petrobras', 'terpel', 'bencina', 'combustible'],
  },
  {
    name: 'Transporte',
    color: '#FDE68A',
    keywords: ['uber', 'cabify', 'didi', 'metro', 'red movilidad', 'transporte', 'peaje'],
  },
  {
    name: 'Comida',
    color: '#FDBA74',
    keywords: ['mcdonald', 'burger king', 'starbucks', 'kfc', 'subway', 'restaurant', 'cafeteria', 'juan maestro'],
  },
  {
    name: 'Hogar',
    color: '#C4B5FD',
    keywords: ['sodimac', 'easy', 'ikea', 'construmart', 'hogar', 'ferreteria'],
  },
  {
    name: 'Mascotas',
    color: '#F9A8D4',
    keywords: ['pet', 'mascota', 'veterinaria', 'animal', 'puppy', 'dog', 'cat'],
  },
  {
    name: 'Salud',
    color: '#67E8F9',
    keywords: ['clinica', 'hospital', 'medico', 'consulta', 'laboratorio', 'salud'],
  },
];

function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeLine(line: string) {
  return line.replace(/\s+/g, ' ').trim();
}

function parseAmountToken(token: string) {
  const normalized = token.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function extractAmount(lines: string[]) {
  const rankedMatches: Array<{ value: number; score: number }> = [];

  for (const [index, line] of lines.entries()) {
    const numbers = line.match(/\$?\s*\d[\d.,]{2,}/g) ?? [];
    const parsed = numbers.map(parseAmountToken).filter((value): value is number => value !== null && value > 0);

    if (!parsed.length) {
      continue;
    }

    const lower = normalizeText(line);
    const lineBias = Math.max(0, lines.length - index);

    for (const value of parsed) {
      let score = lineBias;

      if (/(total|monto total|total a pagar|importe|saldo|total tarjeta|total \$)/.test(lower)) {
        score += 100;
      }

      if (/(subtotal|neto|iva|vuelto|propina)/.test(lower)) {
        score -= 25;
      }

      if (value > 1000) {
        score += 15;
      }

      rankedMatches.push({ value, score });
    }
  }

  rankedMatches.sort((a, b) => b.score - a.score || b.value - a.value);
  return rankedMatches[0]?.value ?? null;
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
  const candidates: Array<{ line: string; score: number }> = [];

  for (const [index, rawLine] of lines.slice(0, 12).entries()) {
    const line = normalizeLine(rawLine);
    if (line.length < 3) {
      continue;
    }

    const lower = normalizeText(line);
    if (MERCHANT_BLOCKLIST.some((word) => lower.includes(word))) {
      continue;
    }

    if (!/[a-zA-Z]/.test(line)) {
      continue;
    }

    let score = 20 - index;

    if (/[A-Z]{3,}/.test(line) || /^[A-Z0-9 &.-]+$/.test(line)) {
      score += 10;
    }

    if (line.length <= 40) {
      score += 8;
    }

    if (/\d{6,}/.test(line)) {
      score -= 10;
    }

    candidates.push({ line: line.slice(0, 80), score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.line ?? 'Boleta escaneada';
}

function suggestCategory(merchant: string, rawText: string) {
  const haystack = `${merchant}\n${rawText}`;
  const normalized = normalizeText(haystack);
  const matches = CATEGORY_RULES.map((rule) => {
    const hits = rule.keywords.filter((keyword) => normalized.includes(keyword)).length;
    return {
      ...rule,
      hits,
    };
  }).filter((rule) => rule.hits > 0);

  if (!matches.length) {
    return null;
  }

  matches.sort((a, b) => b.hits - a.hits);
  const bestMatch = matches[0];

  return {
    name: bestMatch.name,
    color: bestMatch.color,
    confidence: bestMatch.hits >= 2 ? 'high' as const : 'medium' as const,
  };
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const merchant = extractMerchant(lines);
  const amount = extractAmount(lines);
  const date = extractDate(rawText);
  const suggestedCategory = suggestCategory(merchant, rawText);

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
    suggestedCategory,
  };
}
