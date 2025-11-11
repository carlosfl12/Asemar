export interface InvoiceRow {
    numero_factura: string | null;
    nombre_cliente: string | null;
    nombre_proveedor: string | null;
    fecha: string | null;
    nif_emision: string | null;
    nif_receptor: string | null;
    cif_lateral: string | null;
    base1: number | null;
    iva1: number | null;
    cuota1: number | null;
    recargo1: number | null;
    base2: number | null;
    iva2: number | null;
    cuota2: number | null;
    recargo2: number | null;
    base3: number | null;
    iva3: number | null;
    cuota3: number | null;
    recargo3: number | null;
    base_retencion: number | null;
    porcentaje_retencion: number | null;
    cuota_retencion: number | null;
    importe_total: number | null;
    metodo_pago: string | null;
    prefijo: string | null;
    valid: boolean;
    url: string | null;
    corregido: number | null;
}

export interface IncomingEnvelope {
    received_at: string;
    client_ip: string;
    payload: { data: InvoiceRow[] };
}
export interface StoredRow extends InvoiceRow {
    received_at: string;
    client_ip: string;
}

