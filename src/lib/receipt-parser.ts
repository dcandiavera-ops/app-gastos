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
    keywords: [
      'mcdonald',
      'burger king',
      'starbucks',
      'kfc',
      'subway',
      'restaurant',
      'cafeteria',
      'juan maestro',
      'mariscos',
      'pescado',
      'especializados de pescado',
      'venta al por menor en comercios',
      'alimentos',
      'comida',
      'cocineria',
      'fuente de soda',
    ],
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

function extractLineAmount(line: string) {
  const numbers = line.match(/\$?\s*\d[\d.,]{2,}/g) ?? [];

  if (!numbers.length) {
    return null;
  }

  const lastToken = numbers[numbers.length - 1];
  return parseAmountToken(lastToken);
}

function looksLikeRutToken(token: string) {
  const compact = token.replace(/\s+/g, '');

  return (
    /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(compact) ||
    /^\d{7,8}-[\dkK]$/.test(compact) ||
    /^\d{9,10}$/.test(compact)
  );
}

function lineLooksLikeLocationOrMetadata(line: string) {
  return /(av\.?|avenida|calle|pasaje|psje|direccion|concepcion|bio bio|region|chile|local|n°|nº|numero|fecha de emision)/.test(
    line,
  );
}

function extractAmount(lines: string[]) {
  const rankedMatches: Array<{ value: number; score: number }> = [];
  let subtotalAmount: number | null = null;
  let ivaAmount: number | null = null;
  let totalAmount: number | null = null;

  for (const [index, line] of lines.entries()) {
    const numbers = line.match(/\$?\s*\d[\d.,]{2,}/g) ?? [];
    const lower = normalizeText(line);
    const lineBias = Math.max(0, lines.length - index);
    const isTotalLine = /(total|monto total|total a pagar|importe|saldo|total tarjeta|total \$)/.test(lower);
    const isTaxLine = /(subtotal|neto|iva|vuelto|propina)/.test(lower);

    if (
      /(rut|rol unico tributario|folio|cajero|caja|cliente|tarjeta|transbank|autorizacion|operacion|terminal)/.test(lower)
    ) {
      continue;
    }

    if (/(^|\s)(compra|subtotal|neto)(\s|$)/.test(lower)) {
      subtotalAmount = extractLineAmount(line);
    }

    if (/\biva\b/.test(lower)) {
      ivaAmount = extractLineAmount(line);
    }

    if (isTotalLine) {
      totalAmount = extractLineAmount(line);
    }

    for (const token of numbers) {
      const value = parseAmountToken(token);
      if (value === null || value <= 0) {
        continue;
      }

      let score = lineBias;

      if (isTotalLine) {
        score += 160;
      }

      if (isTaxLine) {
        score -= 25;
      }

      if (looksLikeRutToken(token)) {
        score -= 120;
      }

      if (/\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/i.test(line) || /\brut\b/i.test(line)) {
        score -= 120;
      }

      if (lineLooksLikeLocationOrMetadata(lower) && !isTotalLine) {
        score -= 80;
      }

      if (/\b\d{3,5}\b/.test(token) && lineLooksLikeLocationOrMetadata(lower) && !isTotalLine) {
        score -= 60;
      }

      if (value >= 1_000_000 && !isTotalLine) {
        score -= 30;
      }

      if (index <= 2 && !isTotalLine) {
        score -= 20;
      }

      if (value > 1000) {
        score += 15;
      }

      if (isTotalLine && /\$\s*\d/.test(token)) {
        score += 40;
      }

      if (isTotalLine && token === numbers[numbers.length - 1]) {
        score += 25;
      }

      rankedMatches.push({ value, score });
    }
  }

  if (totalAmount !== null) {
    return totalAmount;
  }

  if (subtotalAmount !== null && ivaAmount !== null) {
    const computedTotal = Math.round(subtotalAmount + ivaAmount);
    return computedTotal;
  }

  rankedMatches.sort((a, b) => b.score - a.score || b.value - a.value);
  return rankedMatches[0]?.value ?? null;
}

function extractDate(text: string) {
  const patterns = [
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
    /\b(\d{2})[/-](\d{2})[/-](\d{4})\b/,
    /\b(\d{2})[.-](\d{2})[.-](\d{4})\b/,
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/,
    /\b(\d{1,2})[.-](\d{1,2})[.-](\d{2})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    if (pattern === patterns[0]) {
      return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`).toISOString();
    }

    if (pattern === patterns[3] || pattern === patterns[4]) {
      const year = Number(match[3]) >= 70 ? `19${match[3]}` : `20${match[3]}`;
      return new Date(`${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}T00:00:00.000Z`).toISOString();
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
