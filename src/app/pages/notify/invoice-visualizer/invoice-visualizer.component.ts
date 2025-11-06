// invoice-visualizer.component.ts (solo lo esencial para el HTML)
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InvoiceRow } from '../../../models/invoice.models';

@Component({
  selector: 'app-invoice-visualizer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // ⬅️ IMPORTANTE
  templateUrl: './invoice-visualizer.component.html',
  styleUrls: ['./invoice-visualizer.component.scss'],
})
export class InvoiceVisualizerComponent implements OnChanges {
  @Input() row: InvoiceRow | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Partial<InvoiceRow>>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      numero_factura: [null],
      fecha: [null],
      nombre_proveedor: [null],
      nif_emision: [null],
      base1: [null],
      iva1: [null],
      importe_total: [null],
      valid: [false],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('row' in changes && this.row) {
      this.form.patchValue(this.row); // carga los valores en el form
    }
  }

  cancel() { this.close.emit(); }

  save() {
    // emite solo lo que hay en el form; el padre ya sabe qué fila es
    this.saved.emit(this.form.value as Partial<InvoiceRow>);
  }

  // opcional, por si lo usas en el título
  filename(): string {
    const v = this.form.value as any;
    const nf = (v.numero_factura ?? this.row?.numero_factura ?? '').toString().trim();
    if (nf) return `${nf}.pdf`;
    const pref = (v.prefijo ?? (this.row as any)?.prefijo ?? 'DOC').toString().trim();
    const baseSrc = v.nombre_proveedor ?? this.row?.nombre_proveedor
      ?? v.nombre_cliente ?? (this.row as any)?.nombre_cliente ?? '0000';
    const base = String(baseSrc).replace(/\s+/g, '').slice(0, 6).toUpperCase();
    return `${pref}-${base}.pdf`;
  }
}
