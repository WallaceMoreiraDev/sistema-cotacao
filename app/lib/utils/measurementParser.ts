export interface ParsedMeasurements {
  innerDiameter?: number;
  outerDiameter?: number;
  height1?: number;
  height2?: number;
  thickness?: number;
  cs?: number;
}

/**
 * Extracts measurements from a generic product string.
 * Looks for patterns like "30x40x7", "63.50x107.95", "45 X 70 - IMP"
 */
export function extractMeasurementsFromName(name: string): ParsedMeasurements | null {
  if (!name) return null;

  // Normaliza a string para facilitar o regex (troca vírgula por ponto se estiver numérico)
  // Mas não quebra os nomes
  const normalized = name.replace(/,/g, '.');

  // Regex para capturar DI x DE x Altura (opcional) x Altura2 (opcional)
  // Formatos esperados:
  // 30x40
  // 30x40x7
  // 30 x 40 x 7/10
  // 63.50x107.95
  const regex = /\b(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)(?:\s*[xX*]\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?)?\b/;
  const match = normalized.match(regex);

  if (!match) {
    return null; // Nenhuma medida no padrão encontrada
  }

  const result: ParsedMeasurements = {};

  const di = parseFloat(match[1]);
  if (!isNaN(di)) result.innerDiameter = di;

  const de = parseFloat(match[2]);
  if (!isNaN(de)) result.outerDiameter = de;

  const alt1 = parseFloat(match[3]);
  if (!isNaN(alt1)) {
    // Determinar a categoria para saber se o terceiro valor é Altura ou Espessura (CS)
    const category = extractCategoryFromName(name);
    const isORing = category === 'Anel O-Ring' || category === 'Anel Anti-Extrusão';

    if (isORing) {
      result.cs = alt1;
      result.thickness = alt1;
    } else {
      result.height1 = alt1;
    }
  }

  const alt2 = parseFloat(match[4]);
  if (!isNaN(alt2)) {
    result.height2 = alt2;
  }

  return result;
}

/**
 * Extracts possible part type from a string
 * Looks for "PU 90", "NBR", "VITON", "SILICONE" etc
 */
export function extractPartTypeFromName(name: string): string | null {
  if (!name) return null;
  const upper = name.toUpperCase();

  if (upper.includes(' PU ') || upper.match(/\bPU\b/)) return 'PU';
  if (upper.includes(' NBR ') || upper.match(/\bNBR\b/)) return 'NBR';
  if (upper.includes(' VITON ') || upper.match(/\bVITON\b/)) return 'VITON';
  if (upper.includes(' SILICONE ') || upper.match(/\bSILICONE\b/)) return 'SILICONE';
  if (upper.includes(' TEFLON ') || upper.match(/\bTEFLON\b/) || upper.match(/\bPTFE\b/)) return 'TEFLON';
  if (upper.includes(' BA ') || upper.match(/\bBA\b/)) return 'BA';
  if (upper.includes(' METAL PATENTE ') || upper.match(/\bMETAL PATENTE\b/)) return 'Metal Patente';

  return null;
}

/**
 * Extracts possible brand from a string
 */
export function extractBrandFromName(name: string): string | null {
  if (!name) return null;
  const upper = name.toUpperCase();

  // Known suffixes
  if (upper.match(/- ?A$/) || upper.match(/\bAGEL\b/)) return 'Agel';
  if (upper.match(/- ?PK$/) || upper.match(/\bPARKITS\b/)) return 'ParKits';
  if (upper.match(/\bPARKER\b/)) return 'Parker';
  if (upper.match(/- ?L$/)) return 'L';
  if (upper.match(/- ?HBY$/) || upper.match(/\bHBY\b/)) return 'HBY';
  if (upper.match(/- ?S$/)) return 'S';
  
  // Known inline words
  if (upper.match(/\bNOK\b/)) return 'NOK';
  if (upper.match(/\bAPC\b/)) return 'APC';
  if (upper.match(/\bSABO\b/) || upper.match(/\bSABÓ\b/)) return 'Sabó';
  if (upper.match(/\bCORTECO\b/)) return 'Corteco';

  return null;
}

/**
 * Extracts possible category from a string
 */
export function extractCategoryFromName(name: string): string {
  if (!name) return 'Desconhecida';
  const u = name.toUpperCase();
  if (u.includes('BUCHA') || u.includes('GUIA')) return 'Anel Guia / Fita Guia';
  if (u.includes('ANEL') || u.includes('O-RING') || u.includes('ORING')) return 'Anel O-Ring';
  if (u.includes('GAXETA') || u.includes('U-CUP')) return 'Gaxeta';
  if (u.includes('RASPADOR')) return 'Raspador';
  if (u.includes('RETENTOR')) return 'Retentor';
  if (u.includes('CHEVRON')) return 'Jogo Chevron';
  if (u.includes('MOLA') || u.includes('PRATO')) return 'Mola Prato';
  if (u.includes('SELO')) return 'Selo Mecânico';
  if (u.includes('BUFFER')) return 'Anel Buffer';
  if (u.includes('ANTI-EXTRUSAO') || u.includes('ANTI EXTRUSAO') || u.includes('BACKUP') || u.includes('BACK-UP')) return 'Anel Anti-Extrusão';
  if (u.includes('GOTA')) return 'Gota';
  if (u.includes('K-DAS') || u.includes('KDAS')) return 'K-DAS';
  if (u.includes('TIRANTE')) return 'Tirante';
  return 'Desconhecida';
}

/**
 * Extracts possible codes (OEM, Parker, Supplier) from the string.
 * Uses heuristics to find typical code formats (e.g., UB913, JIC367, 25003500375)
 */
export function extractCodesFromName(name: string): { oem_code?: string; parker_code?: string; supplier_code?: string } {
  if (!name) return {};
  const result: any = {};

  // Remove the brand at the end (e.g. "-A", "- HBY", "-L") to avoid mixing it up
  let cleanName = name.replace(/\s*-\s*[A-Z]+$/, '');
  // Also remove PK
  cleanName = cleanName.replace(/\s*-\s*PK$/, '');

  // Remove measurements to avoid picking them up as codes
  cleanName = cleanName.replace(/\b\d+(?:\.\d+)?\s*[xX*]\s*\d+(?:\.\d+)?(?:\s*[xX*]\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)?\b/g, '');

  // Remove known words
  const ignoreWords = ['GAXETA', 'RASPADOR', 'RETENTOR', 'ANEL', 'O-RING', 'ORING', 'BUCHA', 'GUIA', 'CHEVRON', 'MOLA', 'PRATO', 'SELO', 'BUFFER', 'ANTI-EXTRUSAO', 'GOTA', 'K-DAS', 'TIRANTE', 'PU', 'NBR', 'VITON', 'SILICONE', 'TEFLON', 'PTFE', 'BA', 'METAL', 'PATENTE', 'SH', 'IMP', 'UIP2', 'DP', 'MDU', 'VME'];

  const tokens = cleanName.split(/[\s+\/]+/).filter(Boolean);

  const possibleCodes = tokens.filter(t => {
    const isIgnore = ignoreWords.includes(t.toUpperCase());
    const isMeasurement = /^\d+(\.\d+)?$/.test(t) && parseFloat(t) < 1000; // Small numbers are usually thickness or diameter
    const isTooShort = t.length < 3; // codes are usually 3+ chars
    return !isIgnore && !isMeasurement && !isTooShort;
  });

  if (possibleCodes.length > 0) {
    // We assign them arbitrarily to supplier, then OEM, then Parker
    if (possibleCodes.length === 1) {
      result.supplier_code = possibleCodes[0];
    } else if (possibleCodes.length === 2) {
      result.supplier_code = possibleCodes[0];
      result.oem_code = possibleCodes[1];
    } else {
      result.supplier_code = possibleCodes[0];
      result.oem_code = possibleCodes[1];
      result.parker_code = possibleCodes[2];
    }
  }

  return result;
}
