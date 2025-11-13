import { InvoiceRow } from "./invoice.models";
export type FieldType = 'text' | 'date' | 'number';
export interface DynamicFields<TKey extends keyof InvoiceRow = keyof InvoiceRow>{
    key: string;
    label: string;
    control: TKey;
    type: FieldType;
    step?: string;
}
