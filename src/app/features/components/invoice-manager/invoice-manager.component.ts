import { Component, computed, effect, inject, signal, OnInit, viewChild, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { InvoiceRow } from '../../../models/invoice.models';
import { WebSocketService } from '../web-socket-service/web-socket-service.component';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { DynamicFields } from '../../../models/dynamic-fields.types';
import { DynamicFieldResolverService } from '../../../shared/resolvers/dynamic-field-resolver.service';
import { DomSanitizer, SafeResourceUrl  } from '@angular/platform-browser';
import { CounterService } from '../../../core/stores/counter.service';

interface RealTimeData {
  value: number;
  timestamp: number | string;
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
  @ViewChild ("visualizador") visualizador!: ElementRef;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private readonly apiUrl = environment.apiUrl;
  private resolver = inject(DynamicFieldResolverService);
  lastNumDoc = signal<number | null>(null);
  pdfUrl1!: SafeResourceUrl;

  iframe: any;

  // HTML
  showAll = signal(false);

  // Facturas
  invoices = signal<UiInvoiceItem[]>([]);
  get correctInvoices() { return this.counters.correctInvoices }
  get totalInvoices() { return this.counters.totalInvoices };
  tipo = signal<string | null>("");

  // Códigos de error
  fields: DynamicFields<keyof InvoiceRow>[] = [];
  errorCode = signal("");

  selectedId = signal<string | null>(null);
  selectedUserId = signal<string | null>(null);
  selectedInvoice = computed(() =>
    this.invoices().find(i => String(i.id) === (this.selectedId() ?? ''))
  );


  form = this.fb.nonNullable.group({
    numero_factura: this.fb.control<string | null>(null),
    nombre_factura: this.fb.control<string | null>(null),
    nombre_cliente: this.fb.control<string | null>(null),
    nombre_proveedor: this.fb.control<string | null>(null),
    fecha: this.fb.control<string | null>(null),
    codigo_empresa: this.fb.control<number | null>(null),
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
    tipo: this.fb.control<string | null>(null),

    importe_total: this.fb.control<number | null>(0),
    metodo_pago: this.fb.control<string | null>(null),
    prefijo: this.fb.control<string | null>(null),
    cuenta_contable: this.fb.control<number | null>(0),
    num_apunte: this.fb.control<number | null>(0),
    longitud: this.fb.control<string |null>(null),

    valid: this.fb.control<boolean>(false),
    url: this.fb.control<string | null>(null),
    corregido: this.fb.control<number | null>(1),
  });

  constructor(private sanitizer: DomSanitizer, private counters: CounterService) {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      const userId = this.route.snapshot.paramMap.get('userId');
      const row = this.selectedInvoice();
      if (row?.row?.error_code) {
        this.loadErrorCodes(row.row.error_code);
      }
      
      // Ids
      this.selectedId.set(id);
      this.selectedUserId.set(userId);

      const inv = this.selectedInvoice();
      if (inv) {
        this.form.reset({}, { emitEvent: false });
        this.patchRowOnlyFilled(inv.row);
      }
    })
  }

  wsService = inject(WebSocketService);
  public ultimoValor: number | null = null;
  public datosRecibidos: RealTimeData[] = [];
  subscription!: Subscription;

  ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('userId');
    this.selectedUserId.set(userId);

    this.loadAll();
    this.subscription = this.wsService.messages$.subscribe({
      next: (evt: any) => {
        const payload = evt?.data ?? evt?.value ?? evt ?? null;
        const pdfUrl = evt?.url ?? payload?.url ?? null;
        const numDoc = evt?.num_doc ?? null;
        const codeError = evt?.code_error ?? '';
        this.lastNumDoc.set(numDoc);
        this.errorCode.set(codeError);
        console.log("DATA: ", evt);

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

          this.totalInvoices.set(numDoc); 
        }
      },
      error: err => console.error('WS error:', err),
    });
    this.loadTotalInvoices();
    // this.loadErrorCodes('308');
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

  async fetchAllInvoices(apiUrl: string, opts: { userId?: string}): Promise<any[]> {
    const params = new URLSearchParams();
    if (opts.userId) params.set('user_id', opts.userId);
    const url = `${apiUrl}/api/invoices${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async loadAll() {
    const userId = this.selectedUserId() ?? '0';
    try {
      const rows = await this.fetchAllInvoices(this.apiUrl, {userId});
      this.invoices.set(rows.map((row: any, idx: number) => this.toUiItem(row, row.id ?? idx + 1)));
      if(this.selectedId()) {
        this.createIframe()
      }
    } catch (e) {
      console.error(e);
    }
  }
  open(inv: UiInvoiceItem) {
    const userId = this.selectedUserId() ?? '0';
    this.router.navigate(['/', userId, 'facturas', inv.id]);

    this.loadErrorCodes(inv.row.error_code);
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    const userId = this.selectedUserId() ?? '0';
    document.body.style.overflow = '';
    this.router.navigate(['/', userId ,'facturas']);
  }

  async saveDataAndSend() {
    const inv = this.selectedInvoice();
    if (!inv) return;
    const updated = this.form.getRawValue() as InvoiceRow;
    const options = {
          prefijo: updated.prefijo ?? null,
          numero_factura: updated.numero_factura ?? null,
          nombre_cliente: updated.nombre_cliente ?? null,
          nombre_proveedor: updated.nombre_proveedor ?? null,
          fecha: updated.fecha ?? null,
          nif_emision: updated.nif_emision,
          nif_receptor: updated.nif_receptor,
          cif_lateral: updated.cif_lateral,
          base1: updated.base1,
          iva1: updated.iva1,
          cuota1: updated.cuota1,
          recargo1: updated.recargo1,
          base2: updated.base2,
          iva2: updated.iva2,
          cuota2: updated.cuota2,
          recargo2: updated.recargo2,
          base3: updated.base3,
          iva3: updated.iva3,
          cuota3: updated.cuota3,
          recargo3: updated.recargo3,
          base_retencion: updated.base_retencion,
          porcentaje_retencion: updated.porcentaje_retencion,
          cuota_retencion: updated.cuota_retencion,
          importe_total: updated.importe_total,
          metodo_pago: updated.metodo_pago,
          valid: updated.valid,
          url: updated.url,
          corregido: updated.corregido ?? 1,
          cuenta_contable: updated.cuenta_contable,
          tipo: updated.tipo,
          longitud: updated.longitud,
          nombre_factura: updated.nombre_factura,
          num_apunte: updated.num_apunte,
          codigo_empresa: updated.codigo_empresa
    }

    // try {
    //   await fetch(`${this.apiUrl}/api/invoices`, {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    //     body: JSON.stringify(options)
    //   })
    //   this.closeModal();
    // } catch (err) {
    //   console.error("Error al hacer el método PUT", err);
    // }

    this.sendData(options);
  }

  toggleShowAll(): void {
    this.showAll.update(v => !v);
  }

  async loadErrorCodes(errorCode = '') {
    const codes = [errorCode];

    this.fields = this.resolver.resolve(codes)
  }

  async loadTotalInvoices() {
    const params = new URLSearchParams();
    const userId = this.selectedUserId() ?? 0;

    if (userId) params.set('user_id', userId);
    const url = `${this.apiUrl}/api/pages${params.toString() ? `?${params.toString()}` : ''}`;
    
    try{
      const res = await fetch(url, {headers: { 'Accept': 'application/json' }})
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = await res.json();
      this.totalInvoices.set(Number(total) || 0);
    } catch (err) {
      console.error('Error cárgando facturas correctas: ', err);
    }
  }

  async sendData(options: any) {
    const userId = this.route.snapshot.paramMap.get('userId') ?? '';
    const inv = this.selectedInvoice();
    const total = Number(this.totalInvoices() ?? 0);
    const qs = new URLSearchParams({
      timestamp: '',
      file: options.nombre_factura,
      tipo: options.tipo,
      totalFiles: String(total),
      userId: userId,
    })

    const url = `https://demo99.esphera.ai/ws/n8n/getCuentaContable.php?${qs.toString()}`;
    
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          data: options
        })
      })

      if (!resp.ok) {
        throw new Error(`Error HTTP: ${resp.status}`);
      }

      const data = await resp.json();
      this.counters.setCorrect(data?.currentCount);
    } catch (err) {
      console.log("Error", err);
      throw err;
    }
  }

  pdfUrl() {
    const url = `${this.selectedInvoice()?.row.url}/preview?access_token=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`
    return url;
  }

  createIframe() {
    const iframe = '<iframe src="'+ this.pdfUrl() +'"  width="640" height="480"></iframe>';
    this.iframe = this.sanitizer.bypassSecurityTrustHtml( iframe);
  }
}
