import { Injectable } from '@angular/core';
import { DynamicFields } from '../../models/dynamic-fields.types';
import { InvoiceRow } from '../../models/invoice.models';

type FieldType = 'text' | 'date' | 'number';

@Injectable({
  providedIn: 'root'
})
export class DynamicFieldResolverService {

  private readonly CATALOG: Record<string, DynamicFields<keyof InvoiceRow>> = {
    '301': { key: '301', label: 'IVA-1', control: 'iva1', type: 'number'},
    '302': { key: '302', label: 'Asiento', control: 'num_apunte', type: 'number', step: '0.01'},
    '303': { key: '303', label: 'Longitud', control: 'longitud', type: 'text'},
    '304': { key: '304', label: 'Cuenta contable', control: 'cuenta_contable', type: 'number'},
    '305': { key: '305', label: 'Importe Total (€)', control: 'importe_total', type: 'number'},
    '306': { key: '306', label: 'Tipo factura', control: 'tipo', type: 'text'},
    '307': { key: '307', label: 'Fecha', control: 'fecha', type: 'date'}
  }
  resolve(codes: Array<Number | string>, labelOverride?: Record<string, string>): DynamicFields<keyof InvoiceRow>[] {
    const out: DynamicFields<keyof InvoiceRow>[] = [];

    for (const raw of codes ?? []) {
      const code = String(raw);
      const base = this.CATALOG[code];
      if (!base) {
        console.warn('[DynamicFieldResolver] Código desconocido:', code);
        continue;
      }
      const label = (labelOverride?.[code] ?? base.label).trim();
      out.push({...base, label});
    }
    return out;
  }
}
