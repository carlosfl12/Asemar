import { Component, OnInit, computed, signal, inject, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Payload, InvoiceItem } from './types';
import { InvoiceVisualizerComponent } from './invoice-visualizer/invoice-visualizer.component';
import { SseService } from '../../core/sse.service';
import { environment } from '../../../environments/environment';
import { WebSocketService } from '../../features/components/web-socket-service/web-socket-service.component';
import { Subscription } from 'rxjs';
import { InvoiceRow } from '../../models/invoice.models';
interface RealTimeData {
  value: number;
  timestamp: number | string;
}

@Component({
  selector: 'app-notify',
  standalone: true,
  imports: [CommonModule, InvoiceVisualizerComponent],
  templateUrl: './notify.component.html',
  styleUrls: ['./notify.component.scss'],
})

export class NotifyComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  rows = signal<InvoiceRow[]>([]);

  selectedRow = signal<InvoiceRow | null>(null);
  selectedIndex = signal<number | null>(null);

  private paramMapSig = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  lastReceivedAt = signal<string | null>(null);

  wsService = inject(WebSocketService);
  public ultimoValor: number | null = null;
  public datosRecibidos: RealTimeData[] = [];
  subscription!: Subscription;

  ngOnInit() {
    // this.dashboard.setMenuItem(this.menuItemId);
    this.subscription = this.wsService.messages$.subscribe(
      (data) => {
        this.ultimoValor = data.value;
        console.log(data);
        this.renderIncoming(data, true);
      },
      (error) => {
        console.error('Error en la suscripción de datos:', error);
      }

    );
  }

  constructor() {
    effect(() => {
      const id = this.paramMapSig()?.get('id'); // '/facturas/:id'
      if (!id) {
        this.selectedRow.set(null); // no hay id => modal cerrado
        return;
      }

      // Busca la fila por id (si tu id lo generas tú, asegúrate de asignarlo en handleIncoming)
      const found = this.rows().find((r: any) => r?.id === id) ?? null;
      this.selectedRow.set(found);
    });
  }

  renderIncoming(raw: unknown, append = false): void {
    let data: any = (raw && typeof raw === 'object' && 'value' in (raw as any))
      ? (raw as any).value
      : raw;

    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { }
    }

    let rows: InvoiceRow[] = [];
    const pick = (x: any): InvoiceRow[] =>
      Array.isArray(x) ? (x as InvoiceRow[]) :
        (x && typeof x === 'object') ? [x as InvoiceRow] : [];

    if (data.data) {
      rows = pick(data.data);
    } else {
      rows = pick(data);
    }

    this.rows.update(curr => append ? [...curr, ...rows] : [...rows]);
    this.lastReceivedAt.set(new Date().toISOString());
  }


  filename(row: InvoiceRow, idx: number): string {
    const nf = (row as any)?.numero_factura ? String((row as any).numero_factura).trim() : '';
    if (nf) return `${nf}.pdf`;
    const pref = (row as any)?.prefijo ? String((row as any).prefijo).trim() : 'DOC';
    const base = String((row as any)?.nombre_proveedor ?? (row as any)?.nombre_cliente ?? '0000')
      .replace(/\s+/g, '')
      .slice(0, 6)
      .toUpperCase();
    return `${pref}-${base}${String(idx).padStart(2, '0')}.pdf`;
  }

  buildFilename(row: InvoiceRow, idx: number): string {
    const nf = (row as any)?.numero_factura ? String((row as any).numero_factura).trim() : '';
    if (nf) return `${nf}.pdf`;

    const pref = (row as any)?.prefijo ? String((row as any).prefijo).trim() : 'DOC';
    const base = String((row as any)?.nombre_proveedor ?? (row as any)?.nombre_cliente ?? '0000')
      .replace(/\s+/g, '')
      .slice(0, 6)
      .toUpperCase();

    return `${pref}-${base}${String(idx).padStart(2, '0')}.pdf`;
  }

  onFixedAndClose(patch?: Partial<InvoiceRow>) {
    if (patch && this.selectedIndex() !== null) {
      const i = this.selectedIndex()!;
      const clone = [...this.rows()];
      clone[i] = { ...clone[i], ...patch };
      this.rows.set(clone);
    }
    this.closeModal();
  }

  open(index: number) {
    this.router.navigate(['/facturas', index]);
  }

  closeModal(): void {
    this.router.navigate(['/facturas']).then(() => {
      window.location.reload();
    });
  }

  isOk(row: InvoiceRow): boolean {
    return !!(row as any)?.valid;
  }

  badgeClass(row: InvoiceRow): string {
    return this.isOk(row) ? 'badge--ok' : 'badge--failed';
  }

  statusLabel(row: InvoiceRow): string {
    return this.isOk(row) ? 'Correcto' : 'Fallido';
  }

  openRow(row: InvoiceRow) {
    // navega o abre modal con la fila (si tienes id propio úsalo)
    this.router.navigate(['/facturas']); // ajusta si necesitas un id
  }
}
