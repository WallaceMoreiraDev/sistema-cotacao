/**
 * Utilities for formatting product names, SKU and measurements based on "Força Máxima" business rules.
 */

export interface SmartDescriptionParams {
  category: string; // Nome da Peça (e.g. GAXETA, RETENTOR)
  measurements?: {
    innerDiameter?: number | string;
    outerDiameter?: number | string;
    height1?: number | string;
    height2?: number | string;
    thickness?: number | string;
    cs?: number | string; // Seção transversal
  };
  partType?: string; // e.g. PU 90 SH, NBR
  supplierCode?: string; // Código Fornecedor
  parkerOemCode?: string; // Parker ou OEM
  brand?: string; // e.g. Agel, APC
}

/**
 * Regra 1: Geração Automática do Código Força Máxima (SKU)
 * O campo de código interno deve ser gerado automaticamente no padrão: FM-[CÓDIGO_DO_FORNECEDOR]
 */
export function generateFMCode(params: SmartDescriptionParams): string {
  const initial = (params.category || '').trim().charAt(0).toUpperCase();
  let baseCode = '';

  if (params.supplierCode && params.supplierCode.trim() !== '') {
    baseCode = `FM-${initial}${params.supplierCode.trim().toUpperCase()}`;
  } else {
    // Auto-generate if missing
    let measStr = '';
    if (params.measurements) {
      const { innerDiameter, outerDiameter, height1, height2, thickness, cs } = params.measurements;
      // We concatenate them in a standard order, ignoring empty ones.
      const order = [innerDiameter, outerDiameter, height1, height2, thickness, cs];
      for (const val of order) {
        if (val !== undefined && val !== null && val !== '') {
          // Keep exactly what the user typed (including trailing zeros), just removing dots/commas
          measStr += val.toString().trim().replace(/[.,]/g, '');
        }
      }
    }
    if (!initial && !measStr) return '';
    baseCode = `FM-${initial}${measStr}`;
  }

  // Append Brand Suffix (e.g. -AC)
  if (params.brand && params.brand.trim() !== '') {
    const b = params.brand.trim().toUpperCase();
    const first = b.charAt(0);
    const last = b.length > 1 ? b.charAt(b.length - 1) : '';
    baseCode += `-${first}${last}`;
  }

  return baseCode;
}

/**
 * Helper para formatar as medidas no formato padrão: DIxDExA1 (etc.)
 */
function formatMeasurements(measurements: SmartDescriptionParams['measurements']): string {
  if (!measurements) return '';
  
  const parts: string[] = [];
  
  // A ordem sugerida é geralmente DI x DE x Altura(s)
  if (measurements.innerDiameter) parts.push(measurements.innerDiameter.toString());
  if (measurements.outerDiameter) parts.push(measurements.outerDiameter.toString());
  
  // Alturas
  if (measurements.height1 && measurements.height2) {
    parts.push(`${measurements.height1}/${measurements.height2}`);
  } else if (measurements.height1) {
    parts.push(measurements.height1.toString());
  } else if (measurements.height2) {
    parts.push(measurements.height2.toString());
  }
  
  // Espessura ou CS
  if (measurements.thickness) parts.push(measurements.thickness.toString());
  if (measurements.cs) parts.push(measurements.cs.toString());

  return parts.join('X').toUpperCase();
}

/**
 * Regra 2: Construtor Inteligente de Descrição
 * Regra: [NOME DA PEÇA] + [MEDIDAS] + [TIPO DE PEÇA] + [CÓD. FORNECEDOR] + [CÓD. PARKER/OEM] + -[INICIAL DA MARCA]
 * Exemplo: GAXETA 30X40X7 PU 90 SH 5102 25003500375 -A
 */
export function buildSmartDescription(params: SmartDescriptionParams): string {
  const parts: string[] = [];

  if (params.category) parts.push(params.category.toUpperCase().trim());
  
  const meas = formatMeasurements(params.measurements);
  if (meas) parts.push(meas);
  
  if (params.partType) parts.push(params.partType.toUpperCase().trim());
  
  const generatedCode = generateFMCode(params);
  if (generatedCode) {
    parts.push(generatedCode.replace('FM-', ''));
  }

  if (params.parkerOemCode) parts.push(params.parkerOemCode.toUpperCase().trim());
  
  // Note: Brand suffix is already included at the end of generatedCode!

  // Remove empty spaces and join
  return parts.filter(Boolean).join(' ');
}
