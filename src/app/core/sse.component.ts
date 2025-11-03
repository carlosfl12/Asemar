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
  selector: 'app-sse',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>Server-Sent Events - Modo Escucha Continua</h1>
      
      <div class="controls">
        <button 
          (click)="toggleConnection()" 
          [class.btn-danger]="isConnected"
          [class.btn-primary]="!isConnected"
          class="btn">
          {{ isConnected ? 'Desconectar' : 'Conectar' }}
        </button>
        <button 
          (click)="clearLogs()"
          class="btn btn-secondary">
          Limpiar Logs
        </button>
        <button 
          (click)="simulateEvent()"
          [disabled]="!isConnected"
          class="btn btn-success">
          Simular Evento (Test)
        </button>
      </div>

      <div class="status-container">
        <div class="status" [class.connected]="isConnected" [class.disconnected]="!isConnected">
          <span class="status-icon">{{ isConnected ? '🟢' : '🔴' }}</span>
          Estado: {{ isConnected ? 'Conectado - Esperando eventos...' : 'Desconectado' }}
        </div>
        <div class="stats">
          <span>Total eventos: <strong>{{ eventLogs.length }}</strong></span>
          <span *ngIf="lastEvent">Último: {{ lastEvent.time }}</span>
        </div>
      </div>

      <div class="data-display">
        <div class="card highlight">
          <h3>📨 Último Evento Recibido</h3>
          <div *ngIf="lastEvent" class="event-data">
            <div class="data-row">
              <span class="label">ID:</span>
              <span class="value">{{ lastEvent.id }}</span>
            </div>
            <div class="data-row">
              <span class="label">Tipo:</span>
              <span class="value badge">{{ lastEvent.event }}</span>
            </div>
            <div class="data-row">
              <span class="label">Fecha/Hora:</span>
              <span class="value">{{ lastEvent.data.datetime }}</span>
            </div>
            <div class="data-row">
              <span class="label">Mensaje:</span>
              <span class="value">{{ lastEvent.data.message }}</span>
            </div>
            <div class="data-row">
              <span class="label">Valor Random:</span>
              <span class="value">{{ lastEvent.data.randomValue }}</span>
            </div>
          </div>
          <div *ngIf="!lastEvent" class="no-data">
            <p>⏳ Esperando el primer evento...</p>
            <p class="hint">Los eventos aparecerán aquí automáticamente cuando se envíen desde el servidor</p>
          </div>
        </div>

        <div class="card">
          <h3>📊 Estadísticas</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-number">{{ eventLogs.length }}</div>
              <div class="stat-label">Total Eventos</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ isConnected ? '✓' : '✗' }}</div>
              <div class="stat-label">Conexión Activa</div>
            </div>
          </div>
        </div>
      </div>

      <div class="logs">
        <h3>📋 Historial de Eventos</h3>
        <div class="log-container">
          <div 
            *ngFor="let log of eventLogs; let i = index" 
            class="log-entry"
            [class.new-entry]="i === 0">
            <div class="log-header">
              <span class="log-time">🕐 {{ log.time }}</span>
              <span class="log-event">{{ log.event }}</span>
              <span class="log-id">ID: {{ log.id }}</span>
            </div>
            <pre class="log-data">{{ log.data | json }}</pre>
          </div>
          <p *ngIf="eventLogs.length === 0" class="no-data">
            No hay eventos registrados todavía.
            <br><br>
            <span class="hint">
              💡 Tip: Mientras estés conectado, cualquier llamada a <code>send-event.php</code> 
              enviará un evento que aparecerá aquí automáticamente.
            </span>
          </p>
        </div>
      </div>

      <div class="error" *ngIf="error">
        <strong>⚠ Error:</strong> {{ error }}
      </div>

      <div class="info-box">
        <h4>ℹ Cómo funciona:</h4>
        <ol>
          <li>Haz clic en <strong>"Conectar"</strong> para iniciar la escucha de eventos</li>
          <li>El frontend quedará esperando eventos continuamente</li>
          <li>Cuando llames a <code>send-event.php</code> desde cualquier lugar, el evento llegará automáticamente</li>
          <li>Puedes probar con el botón "Simular Evento" o llamando directamente al PHP</li>
        </ol>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    h1 {
      color: #2c3e50;
      margin-bottom: 25px;
      font-size: 28px;
    }

    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-danger {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .btn-secondary {
      background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
      color: #333;
    }

    .btn-success {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
    }

    .status-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }

    .status {
      flex: 1;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .status.connected {
      background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
      color: #155724;
      animation: pulse-green 2s ease-in-out infinite;
    }

    .status.disconnected {
      background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
      color: #721c24;
    }

    @keyframes pulse-green {
      0%, 100% { box-shadow: 0 2px 8px rgba(21, 87, 36, 0.2); }
      50% { box-shadow: 0 2px 16px rgba(21, 87, 36, 0.4); }
    }

    .status-icon {
      font-size: 20px;
      animation: blink 2s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .stats {
      display: flex;
      gap: 20px;
      padding: 15px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .stats span {
      color: #666;
    }

    .stats strong {
      color: #2c3e50;
    }

    .data-display {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .card {
      border-radius: 12px;
      padding: 25px;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: transform 0.3s;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }

    .card.highlight {
      border: 2px solid #667eea;
    }

    .card h3 {
      margin-top: 0;
      color: #2c3e50;
      font-size: 20px;
      margin-bottom: 20px;
    }

    .event-data {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .data-row {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }

    .label {
      font-weight: 600;
      color: #495057;
    }

    .value {
      color: #212529;
    }

    .badge {
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .stat-item {
      text-align: center;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stat-number {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }

    .stat-label {
      color: #6c757d;
      font-size: 12px;
      text-transform: uppercase;
    }

    .no-data {
      color: #6c757d;
      font-style: italic;
      text-align: center;
      padding: 30px 20px;
    }

    .hint {
      font-size: 13px;
      color: #868e96;
      margin-top: 10px;
    }

    .logs {
      margin-top: 30px;
    }

    .logs h3 {
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 22px;
    }

    .log-container {
      max-height: 500px;
      overflow-y: auto;
      border-radius: 12px;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .log-entry {
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      transition: all 0.3s;
    }

    .log-entry:hover {
      background-color: #f8f9fa;
    }

    .log-entry.new-entry {
      animation: slideIn 0.5s ease-out;
      background-color: #e7f3ff;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .log-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .log-time {
      color: #495057;
      font-size: 13px;
      font-weight: 500;
    }

    .log-event {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .log-id {
      color: #adb5bd;
      font-size: 11px;
      font-family: 'Courier New', monospace;
    }

    .log-data {
      margin: 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
      border-left: 4px solid #667eea;
      font-family: 'Courier New', monospace;
    }

    .error {
      margin-top: 20px;
      padding: 15px 20px;
      background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
      color: #721c24;
      border-radius: 8px;
      border-left: 4px solid #dc3545;
      box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
    }

    .info-box {
      margin-top: 30px;
      padding: 25px;
      background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
      border-radius: 12px;
      border-left: 4px solid #00acc1;
    }

    .info-box h4 {
      margin-top: 0;
      color: #006064;
    }

    .info-box ol {
      color: #00838f;
      line-height: 1.8;
    }

    .info-box code {
      background: #006064;
      color: #b2ebf2;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }

    .example {
      margin-top: 15px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 8px;
    }

    .example code {
      display: block;
      margin-top: 10px;
      padding: 10px;
      background: #263238;
      color: #aed581;
      border-radius: 6px;
      overflow-x: auto;
    }
  `]
})
export class SseComponent implements OnInit, OnDestroy {
  private eventSource: EventSource | null = null;

  isConnected = false;
  lastEvent: EventLog | null = null;
  eventLogs: EventLog[] = [];
  error: string | null = null;

  // URLs - ajusta según tu servidor
  private readonly SSE_URL = 'https://demo.esphera.ai/ws/n8n/signals_to_frontend/sse-server.php';
  private readonly SEND_EVENT_URL = 'https://demo.esphera.ai/ws/n8n/signals_to_frontend/send-event.php';

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