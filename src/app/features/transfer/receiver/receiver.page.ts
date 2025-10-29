import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NotifyService } from '../../../core/notify.service';

@Component({
  standalone: true,
  selector: 'asm-receiver-page',
  imports: [CommonModule],
  templateUrl: './receiver.page.html',
  styleUrls: ['./receiver.page.scss'],
})
export class ReceiverPage {
  private route = inject(ActivatedRoute);
  private notify = inject(NotifyService);
  payload = signal<any>(null);

  constructor() {
    effect(() => {
      const q = this.route.snapshot.queryParamMap;
      const cliente_id = q.get('cliente_id');
      const status = q.get('status');
      const factura_url = q.get('factura_url');
      const datos_faltan = JSON.parse(q.get('datos_faltan') ?? '[]');

      if (cliente_id && status && factura_url) {
        this.payload.set({ cliente_id, status, factura_url, datos_faltan });

        this.notify.push(
          'Nuevos datos recibidos',
          `Cliente: ${cliente_id} · Estado: ${status}`
        );
      }
    });
  }
}
