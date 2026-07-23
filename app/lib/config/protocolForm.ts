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
  name: string;
  oem: string;
  nickname: string;
  code: string;
  brand: string;
  quantity: string;
  ignoreStock: boolean;
  measurements: Record<MeasurementKey, string>;
}

export const EMPTY_ITEM_FORM: ItemFormState = {
  name: '',
  oem: '',
  nickname: '',
  code: '',
  brand: '',
  quantity: '',
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
