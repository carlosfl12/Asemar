import { Component, computed, effect, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SafeUrlPipe } from '../../../shared/safe-url.pipe';
import { InvoiceRow } from '../../../models/invoice.models';
import { WebSocketService } from '../web-socket-service/web-socket-service.component';
import { Subscription } from 'rxjs';
import { map } from 'rxjs';

interface RealTimeData {
  value: number;
  timestamp: number | string;
  // otras propiedades...
}
type InvoiceStatus = 'fallido' | 'procesando' | 'ok';
interface UiInvoiceItem {
  id: number | string;
  fileName: string;
  createdAt: string;
  status: InvoiceStatus;
  row: InvoiceRow;
}

@Component({
  selector: 'app-invoice-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SafeUrlPipe],
  templateUrl: './invoice-manager.component.html',
  styleUrls: ['./invoice-manager.component.scss'],
})
export class InvoiceManagerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // TEST
  invoices = signal<UiInvoiceItem[]>([
    {
      id: 1,
      fileName: '0123–3164667128.pdf',
      createdAt: '28/10/2025, 11:05:28',
      status: 'fallido',
      row: {
        numero_factura: null,
        nombre_cliente: 'LOCATEC APLICACIONES',
        nombre_proveedor: 'GUILLEM EXPORT, S.L.U.',
        fecha: null,
        nif_emision: null,
        nif_receptor: null,
        cif_lateral: null,
        base1: 0,
        iva1: 0,
        cuota1: 0,
        recargo1: 0,
        base2: null, iva2: null, cuota2: null, recargo2: null,
        base3: null, iva3: null, cuota3: null, recargo3: null,
        base_retencion: null, porcentaje_retencion: null, cuota_retencion: null,
        importe_total: 0,
        metodo_pago: null,
        prefijo: null,
        valid: false,
        url: '/assets/invoices/00_25002805.pdf'
      }
    }
  ]);

  selectedId = signal<string | null>(null);
  selectedInvoice = computed(() =>
    this.invoices().find(i => String(i.id) === (this.selectedId() ?? ''))
  );

  form = this.fb.nonNullable.group({
    numero_factura: this.fb.control<string | null>(null),
    nombre_cliente: this.fb.control<string | null>(null),
    nombre_proveedor: this.fb.control<string | null>(null),
    fecha: this.fb.control<string | null>(null),
    nif_emision: this.fb.control<string | null>(null),
    nif_receptor: this.fb.control<string | null>(null),
    cif_lateral: this.fb.control<string | null>(null),

    base1: this.fb.control<number | null>(0),
    iva1: this.fb.control<number | null>(0),
    cuota1: this.fb.control<number | null>(0),
    recargo1: this.fb.control<number | null>(0),

    base2: this.fb.control<number | null>(null),
    iva2: this.fb.control<number | null>(null),
    cuota2: this.fb.control<number | null>(null),
    recargo2: this.fb.control<number | null>(null),

    base3: this.fb.control<number | null>(null),
    iva3: this.fb.control<number | null>(null),
    cuota3: this.fb.control<number | null>(null),
    recargo3: this.fb.control<number | null>(null),

    base_retencion: this.fb.control<number | null>(null),
    porcentaje_retencion: this.fb.control<number | null>(null),
    cuota_retencion: this.fb.control<number | null>(null),

    importe_total: this.fb.control<number | null>(0),
    metodo_pago: this.fb.control<string | null>(null),
    prefijo: this.fb.control<string | null>(null),

    valid: this.fb.control<boolean>(false),
    url: this.fb.control<string | null>(null),
  });

  constructor() {
    // Sincroniza URL → modal + form
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      this.selectedId.set(id);
      const inv = this.selectedInvoice();
      if (inv) {
        this.form.reset({}, { emitEvent: false });
        this.patchRowOnlyFilled(inv.row);
      }
    })
  }

  private getPayload(evt: any): InvoiceRow | InvoiceRow[] | null {
    const p = evt?.data ?? evt?.value ?? evt ?? null;
    return p;
  }

  wsService = inject(WebSocketService);
  public ultimoValor: number | null = null;
  public datosRecibidos: RealTimeData[] = [];
  subscription!: Subscription;

  ngOnInit() {
    this.subscription = this.wsService.messages$.subscribe({
      next: (data: any) => {
        this.ultimoValor = data?.value ?? data;
        const payload = this.getPayload(data);
        console.log(payload);

        if (Array.isArray(payload)) {
          const mapped = payload.map((row: InvoiceRow, idx: number) => this.toUiItem(row, idx));
          this.invoices.set(mapped);
        } else if (payload && typeof payload === 'object') {
          const item = this.toUiItem(payload as InvoiceRow, this.invoices().length + 1);
          this.invoices.update(list => {
            const key = (payload as InvoiceRow).numero_factura ?? item.id;
            const i = list.findIndex(x => (x.row.numero_factura ?? x.id) === key);
            if (i >= 0) {
              const copy = [...list];
              copy[i] = { ...copy[i], row: item.row, fileName: item.fileName, status: item.status };
              return copy;
            }
            return [item, ...list];
          });
        }
      },
      error: err => console.error('Error en la suscripción de datos:', err)
    });
  }

  private isFilled(v: unknown) {
    if (typeof v === 'number') return true;
    return v !== null && v !== undefined && String(v).trim() !== '';
  }

  private toInputDate(fecha: string | null): string | null {
    if (!this.isFilled(fecha)) return null;
    const txt = String(fecha);
    const dmy = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (dmy) {
      const [, d, m, y] = dmy;
      return `${y}-${m}-${d}`;
    }
    const iso = txt.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];

    const ms = Date.parse(txt);
    if (!isNaN(ms)) {
      const d = new Date(ms);
      const pad = (n: number) => `${n}`.padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    return null;
  }

  private patchRowOnlyFilled(row: InvoiceRow) {
    const partial: any = {};
    (Object.keys(this.form.controls) as (keyof InvoiceRow)[]).forEach((k) => {
      const val = row[k];
      if (k === 'fecha') {
        const f = this.toInputDate(val as string | null);
        if (this.isFilled(f)) partial[k] = f;
        return;
      }
      if (this.isFilled(val)) partial[k] = val;
    });
    this.form.patchValue(partial, { emitEvent: false });
  }

  private toUiItem(row: InvoiceRow, fallbackId: number | string): UiInvoiceItem {
    const fileName =
      row.numero_factura ? `${row.numero_factura}.pdf` : 'factura.pdf';
    const status: 'ok' | 'fallido' =
      row.valid ? 'ok' : 'fallido';

    return {
      id: row.numero_factura ?? fallbackId,
      fileName,
      createdAt: row.fecha ?? new Date().toLocaleString(),
      status,
      row,
    };
  }

  open(inv: UiInvoiceItem) {
    this.router.navigate(['/facturas', inv.id]);
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    document.body.style.overflow = '';
    this.router.navigate(['/facturas']);
  }

  saveAndSend() {
    const inv = this.selectedInvoice();
    if (!inv) return;

    const updated = this.form.getRawValue() as InvoiceRow;

    updated.valid = !!updated.numero_factura && !!updated.nombre_proveedor && !!updated.importe_total;

    // actualiza en memoria
    this.invoices.update(list =>
      list.map(x => (x.id === inv.id ? { ...x, row: { ...updated } } : x))
    );

    this.closeModal();
    location.reload();
  }

  pdfUrl() {
    return this.selectedInvoice()?.row.url ?? null;
  }
}
