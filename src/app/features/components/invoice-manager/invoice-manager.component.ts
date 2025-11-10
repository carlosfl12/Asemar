import { Component, computed, effect, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SafeUrlPipe } from '../../../shared/safe-url.pipe';
import { InvoiceRow } from '../../../models/invoice.models';
import { WebSocketService } from '../web-socket-service/web-socket-service.component';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { PdfViewerModule } from 'ng2-pdf-viewer';

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
  imports: [CommonModule, ReactiveFormsModule, NgxExtendedPdfViewerModule, PdfViewerModule],
  templateUrl: './invoice-manager.component.html',
  styleUrls: ['./invoice-manager.component.scss'],
})
export class InvoiceManagerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private readonly apiUrl = environment.apiUrl;
  lastNumDoc = signal<number | null>(null);

  // TEST
  invoices = signal<UiInvoiceItem[]>([]);

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
    this.loadAll();
    this.subscription = this.wsService.messages$.subscribe({
      next: (evt: any) => {
        const payload = evt?.data ?? evt?.value ?? evt ?? null;
        const pdfUrl = evt?.url ?? payload?.url ?? null;
        const numDoc = evt?.num_doc ?? null;
        console.log("DATA RECIBIDA: ", evt);

        if (numDoc !== null && numDoc !== undefined) {
          this.lastNumDoc.set(Number(numDoc));
        }

        if (!payload) return;

        if (Array.isArray(payload)) {
          const mapped = payload.map((row: any, i: number) => {
            if (!row.url && pdfUrl) row.url = pdfUrl;
            return this.toUiItem(row as InvoiceRow, i + 1);
          });
          this.invoices.set(mapped);
        } else {
          const row = payload as InvoiceRow;
          if (!row.url && pdfUrl) row.url = pdfUrl;

          const item = this.toUiItem(row, this.invoices().length + 1);

          this.invoices.update(list => {
            const ix = list.findIndex(x => String(x.id) === String(item.id));
            if (ix >= 0) {
              const copy = [...list];
              copy[ix] = { ...copy[ix], row: item.row, fileName: item.fileName, status: item.status };
              return copy;
            }
            return [item, ...list];
          });

          const opened = this.selectedInvoice();
          if (opened && String(opened.id) === String(item.id)) {
            this.patchRowOnlyFilled(item.row);
          }
        }
      },
      error: err => console.error('WS error:', err),
    });
  }

  get resolvedSrc(): string {
    if (!this.pdfUrl() || typeof this.pdfUrl() !== 'string') return this.pdfUrl();
    const m = this.pdfUrl().match(/https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/);
    return m?.[1] ? `https://drive.google.com/uc?export=download&id=${m[1]}` : this.pdfUrl();
  }

  private hashKey(input: string): string {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) + h) + input.charCodeAt(i);
    }
    
    return (h >>> 0).toString(36);
  }
  private makeClientId(row: InvoiceRow, fallbackIndex: number): string {
    if (row.numero_factura && String(row.numero_factura).trim() !== '') {
      return String(row.numero_factura);
    }
    const keyParts = [
      row.prefijo ?? '',
      row.nif_emision ?? '',
      row.nif_receptor ?? '',
      row.nombre_proveedor ?? '',
      row.nombre_cliente ?? '',
      row.fecha ?? '',
      row.url ?? ''
    ].join('|');
    const hash = this.hashKey(keyParts);

    return `tmp-${hash}-${fallbackIndex}`;
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

  private toUiItem(row: InvoiceRow, fallbackIndex: number | string): UiInvoiceItem {
    const id = this.makeClientId(row, Number(fallbackIndex) || 0);

    const fileName =
      row.numero_factura?.toString().trim()
        ? `${row.numero_factura}.pdf`
        : (row.prefijo ? `${row.prefijo}.pdf` : 'factura.pdf');

    const status: 'ok' | 'fallido' = row.valid ? 'ok' : 'fallido';

    return {
      id,                                        
      fileName,
      createdAt: row.fecha ?? new Date().toLocaleString(),
      status,
      row: { ...row },
    };
  }

  async fetchAllInvoices(apiUrl: string, limit = '', search = ''): Promise<any[]> {
    const url = `${apiUrl}/api/index.php?route=invoices${limit}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async loadAll() {
    try {
      const rows = await this.fetchAllInvoices(this.apiUrl);
      this.invoices.set(rows.map((row: any, idx: number) => this.toUiItem(row, row.id ?? idx + 1)));
    } catch (e) {
      console.error(e);
    }
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
    return this.selectedInvoice()?.row.url ?? '';
  }
}
