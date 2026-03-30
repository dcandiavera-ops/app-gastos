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
  const normalized = token
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function extractLineAmount(line: string) {
  const numbers = line.match(/\$?\s*\d(?:[\d.,\s]{1,}\d)?/g) ?? [];

  if (!numbers.length) {
    return null;
  }

  const lastToken = numbers[numbers.length - 1];
  return parseAmountToken(lastToken);
}

function findNearbyAmount(lines: string[], startIndex: number) {
  for (let offset = 0; offset <= 2; offset += 1) {
    const candidateLine = lines[startIndex + offset];
    if (!candidateLine) {
      continue;
    }

    const amount = extractLineAmount(candidateLine);
    if (amount !== null) {
      return amount;
    }
  }

  return null;
}

function fuzzyIncludesTotal(line: string) {
  return /\b(total|tota[l1i\]]?|totai|tota1|toial|a pagar|importe total|monto total|saldo)\b/.test(line);
}

function isPaymentLine(line: string) {
  return /(efectivo|debito|credito|master|visa|redcompra|transbank|forma de pago|vuelto|cambio)/.test(line);
}

function isSubtotalLine(line: string) {
  return /(^|\s)(compra|subtotal|neto|afecto)(\s|$)/.test(line);
}

function isTaxAmountLine(line: string) {
  return /\b(iva|impuesto|vat|tax)\b/.test(line);
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
  const subtotalAmounts: number[] = [];
  const ivaAmounts: number[] = [];
  const totalAmounts: number[] = [];
  let totalLineIndex = -1;

  for (const [index, line] of lines.entries()) {
    const numbers = line.match(/\$?\s*\d(?:[\d.,\s]{1,}\d)?/g) ?? [];
    const lower = normalizeText(line);
    const lineBias = Math.max(0, lines.length - index);
    const isTotalLine = fuzzyIncludesTotal(lower);
    const isTaxLine = /(subtotal|neto|iva|vuelto|propina|impuesto)/.test(lower);
    const lineAmount = extractLineAmount(line);

    if (
      /(rut|rol unico tributario|folio|cajero|caja|cliente|tarjeta|transbank|autorizacion|operacion|terminal)/.test(lower)
    ) {
      continue;
    }

    if (isSubtotalLine(lower) && lineAmount !== null) {
      subtotalAmounts.push(lineAmount);
    }

    if (isTaxAmountLine(lower) && lineAmount !== null) {
      ivaAmounts.push(lineAmount);
    }

    if (isTotalLine) {
      totalLineIndex = index;
      const nearbyAmount = lineAmount ?? findNearbyAmount(lines, index + 1);
      if (nearbyAmount !== null) {
        totalAmounts.push(nearbyAmount);
      }
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

      if (
        /(descripcion|detalle|kg|pza|pzq|unidad|cant|cantidad|x\s*\d|^\d+[.,]\d+\s+\d{2,})/.test(lower) ||
        numbers.length >= 3
      ) {
        score -= 45;
      }

      if (isPaymentLine(lower) && !isTotalLine) {
        score -= 40;
      }

      if (isSubtotalLine(lower) && !isTotalLine) {
        score -= 10;
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

      if (totalLineIndex >= 0 && Math.abs(index - totalLineIndex) <= 2) {
        score += 35;
      }

      if (totalLineIndex >= 0 && index < totalLineIndex - 1) {
        score -= 15;
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

  if (totalAmounts.length) {
    return totalAmounts.sort((a, b) => b - a)[0];
  }

  if (subtotalAmounts.length && ivaAmounts.length) {
    const bestComputedTotal = Math.round(Math.max(...subtotalAmounts) + Math.max(...ivaAmounts));

    if (bestComputedTotal > 0) {
      return bestComputedTotal;
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
