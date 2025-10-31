export interface Entity {
  [key: string]: any;
}

export interface EntityConfig {
  name: string;
  endpoint: string;
  readOnly?: boolean;
  clickable?: boolean;
  fields: {
    name: string;
    type: 'text' | 'textarea' | 'number' | 'json' | 'custom';
    label: string;
    required?: boolean;
    hideInTable?: boolean;
    custom?: string;
  }[];
}