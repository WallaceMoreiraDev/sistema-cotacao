export const AUTOSAVE_DELAY = 1500;

export const MEASUREMENT_FIELDS = [
  { key: 'innerDiameter', label: 'D. Interno', suffix: 'mm' },
  { key: 'outerDiameter', label: 'D. Externo', suffix: 'mm' },
  { key: 'height1', label: 'Altura 1', suffix: 'mm' },
  { key: 'height2', label: 'Altura 2', suffix: 'mm' },
  { key: 'thickness', label: 'Espessura', suffix: 'mm' },
  { key: 'cs', label: 'CS', suffix: 'mm' },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]['key'];

export interface ItemFormState {
  category: string; // Nome da Peça
  partType: string;
  supplierCode: string;
  parkerCode: string;
  oemCode: string;
  brand: string;
  quantity: string;
  description: string; // Descrição Gerada Manualmente ou Auto
  observation: string; // Observação livre
  ignoreStock: boolean;
  measurements: Record<MeasurementKey, string>;
  // Mantendo para compatibilidade antiga temporariamente ou removendo
  // name, oem, nickname, code são substituídos pela nova lógica
}

export const EMPTY_ITEM_FORM: ItemFormState = {
  category: '',
  partType: '',
  supplierCode: '',
  parkerCode: '',
  oemCode: '',
  brand: '',
  quantity: '',
  description: '',
  observation: '',
  ignoreStock: false,
  measurements: {
    innerDiameter: '',
    outerDiameter: '',
    height1: '',
    height2: '',
    thickness: '',
    cs: '',
  },
};
