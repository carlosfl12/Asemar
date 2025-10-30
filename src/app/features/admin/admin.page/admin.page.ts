import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PushService } from '../../../services/push.service';

@Component({
  standalone: true,
  selector: 'asm-admin.page',
  imports: [CommonModule],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss'
})

export class AdminPage {
  loading = signal(false);
  msg = signal<string | null>(null);
  constructor(private push: PushService) { }
  async activate() {
    this.loading.set(true);
    try {
      await this.push.subscribeAndSend();
      this.msg.set('Suscripción registrada. Este dispositivo recibirá notificaciones.');
    } catch (e: any) {
      this.msg.set(e?.message ?? 'Error al suscribirse');
    } finally {
      this.loading.set(false);
    }
  }
}
