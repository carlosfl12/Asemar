import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

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

  // URLs - ajusta según tu servidor
  private readonly SSE_URL = '/sse';
  private readonly SEND_EVENT_URL = '/send-event';

  constructor(private http: HttpClient) { }


  ngOnInit(): void {
    // Auto-conectar al cargar
    this.connect();
  }

  ngOnDestroy(): void {
    this.disconnect();
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

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      console.log('🔌 Conexión SSE cerrada');
    }
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

  private addLog(id: string, event: string, data: NotificationEvent): void {
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