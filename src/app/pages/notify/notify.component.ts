import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type Payload = {
  title?: string;
  body?: string;
  url?: string;
  meta?: {
    cliente_id?: string;
    status?: string;
    factura_url?: string;
    datos_faltan?: string[];
  };
  ts?: number;
};

@Component({
  selector: 'asm-notify',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notify.component.html',
  styleUrls: ['./notify.component.scss']
})
export class NotifyComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<Payload | null>(null);

  async ngOnInit() {
    try {
      const res = await fetch('/asemar-api/push/poll.php', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: Payload = await res.json();
      this.data.set(json);
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudieron cargar los datos');
    } finally {
      this.loading.set(false);
    }
  }
}