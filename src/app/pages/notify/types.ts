export type InvoiceStatus = 'err' | 'ok';

export interface InvoiceExtract {
    number?: string;
    date?: string;
    supplierName?: string;
    supplierVat?: string;
    subtotal?: number;
    vat?: number;
    total?: number;
}

export interface InvoiceItem {
    id: string;
    fileName: string;
    createdAt: string;
    status: InvoiceStatus;
    pdfUrl: string;
    extracted?: InvoiceExtract;
    error?: string;
}

export interface Payload {
    invoices: InvoiceItem[];
}