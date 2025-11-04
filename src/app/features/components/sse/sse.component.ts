import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { InvoiceRow, IncomingEnvelope, StoredRow } from '../../../models/sse.models';

interface NotificationEvent {
  timestamp: number;
  datetime: string;
  message: string;
  customData: any;
  randomValue: number;
  status: string;
}

interface EventLog {
  id: string;
  event: string;
  data: any;
  time: string;
}

@Component({
  selector: 'asm-sse',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sse.component.html',
  styleUrls: ['./sse.component.scss']
})
export class SseComponent implements OnInit, OnDestroy {
  private eventSource: EventSource | null = null;

  isConnected = false;
  lastEvent: EventLog | null = null;
  eventLogs: EventLog[] = [];
  error: string | null = null;

  // Guardar los registros que vayan llegando por evento
  invoices: StoredRow[] = [];
  private readonly STORAGE_KEY = 'asm_sse_invoices';

  // URLs - ajusta según tu servidor
  private readonly SSE_URL = '/sse';
  private readonly SEND_EVENT_URL = '/send-event';

  constructor(private http: HttpClient) { }


  ngOnInit(): void {
    // Auto-conectar al cargar
    this.loadFromStorage();
    this.connect();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.invoices = raw ? JSON.parse(raw) as StoredRow[] : [];
    } catch { this.invoices = []; }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.invoices))
    } catch { }
  }

  toggleConnection(): void {
    if (this.isConnected) {
      this.disconnect();
    } else {
      this.connect();
    }
  }

  connect(): void {
    if (this.isConnected) {
      return;
    }

    try {
      this.eventSource = new EventSource(this.SSE_URL);

      this.eventSource.onopen = () => {
        console.log('✅ Conexión SSE establecida - Esperando eventos...');
        this.isConnected = true;
        this.error = null;
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ Error en SSE:', error);
        this.error = 'Error de conexión con el servidor';
        this.isConnected = false;
      };

      // Handler genérico: cualquier mensaje del SSE
      this.eventSource.onmessage = (event: MessageEvent) => {
        this.handleEnvelope(event.data);
      }

      // Escuchar el evento 'notification' (o cualquier otro tipo que envíes)
      this.eventSource.addEventListener('notification', (event: MessageEvent) => {
        console.log('📨 Evento recibido:', event);
        const data = JSON.parse(event.data);
        this.addLog(event.lastEventId, 'notification', data);
      });

      // Puedes agregar más tipos de eventos aquí
      this.eventSource.addEventListener('alert', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        this.addLog(event.lastEventId, 'alert', data);
      });

    } catch (err) {
      this.error = 'No se pudo establecer la conexión';
      console.error(err);
    }
  }

  buildFilename(inv: any): string {
    // arma un nombre "bonito" si no tienes nombre de archivo real
    const base =
      inv?.numero_factura ??
      `${inv?.prefijo ?? '000'}-${inv?.nif_emision ?? 'SN'}`;
    return `${base}.pdf`;
  }

  open(inv: any): void {
    // TODO: abre modal/ruta de corrección
    console.log('Corregir →', inv);
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      console.log('🔌 Conexión SSE cerrada');
    }
  }

  private handleEnvelope(raw: string): void {
    try {
      const env: IncomingEnvelope = JSON.parse(raw);
      const rows = env?.payload?.data ?? [];
      if (!Array.isArray(rows)) return;

      const stamped: StoredRow[] = rows.map(r => ({
        ...r,
        received_at: env.received_at,
        client_ip: env.client_ip
      }));

      const key = (x: StoredRow) => [
        x.received_at, x.nif_emision, x.nif_receptor, x.importe_total, x.numero_factura
      ].join('|');

      const existing = new Set(this.invoices.map(key));

      for (const row of stamped) {
        const k = key(row);
        if (!existing.has(k)) {
          this.invoices.unshift(row);
          existing.add(k);
        }
      }

      this.saveToStorage();
    } catch (e) {
      console.warn('Evento SSE no es el JSON esperado:', raw);
    }
  }

  clearInvoices(): void {
    this.invoices = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  simulateIncoming(partial?: Partial<IncomingEnvelope>): void {
    const now = new Date();

    const mock = {
      received_at: new Date().toISOString(),
      client_ip: '172.17.0.3',
      payload: {
        data: [
          {
            numero_factura: null,
            nombre_cliente: 'LOCATEC APLICACIONES',
            nombre_proveedor: 'GUILLEM EXPORT, S.L.U.',
            fecha: null,
            nif_emision: 'B98165095',
            nif_receptor: 'B42878389',
            cif_lateral: 'B98165095',
            base1: null, iva1: null, cuota1: null, recargo1: null,
            base2: null, iva2: null, cuota2: null, recargo2: null,
            base3: null, iva3: null, cuota3: null, recargo3: null,
            base_retencion: null, porcentaje_retencion: null, cuota_retencion: null,
            importe_total: null, metodo_pago: null, prefijo: '600',
            valid: false
          }
        ]
      }
    };

    const id = `sim-fixed-${Date.now()}`;
    this.addLog(id, 'notification', mock);
    // usa exactamente el mismo flujo que en producción
    this.handleEnvelope(JSON.stringify(mock));
  }



  simulateEvent(): void {
    // Enviar un evento de prueba al servidor
    const testData = {
      message: 'Evento de prueba desde Angular',
      event_type: 'notification',
      timestamp: Date.now()
    };

    this.http.post(this.SEND_EVENT_URL, testData).subscribe({
      next: (response) => {
        console.log('✅ Evento enviado:', response);
      },
      error: (error) => {
        console.error('❌ Error al enviar evento:', error);
        this.error = 'Error al enviar el evento de prueba';
      }
    });
  }

  clearLogs(): void {
    this.eventLogs = [];
    this.lastEvent = null;
  }

  private addLog(id: string, event: string, data: any): void {
    const log: EventLog = {
      id,
      event,
      data,
      time: new Date().toLocaleTimeString()
    };

    this.lastEvent = log;
    this.eventLogs.unshift(log);

    // Opcional: limitar el número de logs guardados
    if (this.eventLogs.length > 50) {
      this.eventLogs = this.eventLogs.slice(0, 50);
    }
  }
}