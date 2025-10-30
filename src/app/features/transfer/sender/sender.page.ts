import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PushService } from '../../../services/push.service';

@Component({
  standalone: true,
  selector: 'asm-sender-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sender.page.html',
  styleUrls: ['./sender.page.scss'],
})

export class SenderPage implements OnInit {
  private fb = new FormBuilder();
  private router = inject(Router);
  private pushService = inject(PushService);
  sending = signal(false);

  form = this.fb.group({
    cliente_id: ['CL-00042', Validators.required],
    status: ['pending', Validators.required],
    factura_url: ['https://example.com/facturas/INV-2025-0001.pdf', [Validators.required]],
    datos_faltan: this.fb.array<string>(['NIF', 'Dirección']),
  });

  get datosFaltan() { return this.form.get('datos_faltan') as FormArray; }
  addDato() { this.datosFaltan.push(this.fb.control('')); }
  removeDato(i: number) { this.datosFaltan.removeAt(i); }

  async ngOnInit() {
    try {
      await this.pushService.notifyAdmin({
        title: 'El cliente ha entrado en la página',
        body: "Haz click para acceder",
        url: '/asemar/notify'
      });
    } catch (e) {
      console.log("No se pudo enviar la notificación", e);
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.sending.set(true);

    const clienteId = this.form.value.cliente_id!;
    const status = this.form.value.status!;
    const facturaUrl = this.form.value.factura_url!;
    const datosFaltan = this.form.value.datos_faltan!;

    try {
      await this.pushService.notifyAdmin({
        title: 'Asemar - nuevos datos recibidos',
        body: `Cliente ${clienteId}: ${status}
        - Factura URL: ${facturaUrl}
        - Datos que faltan: ${datosFaltan}
        `,
        url: '/asemar/notify'
      })
    } catch (e) {
      console.error('No se pudo notificar al admin', e);
    }

    this.sending.set(false);
  }

  // Relleno rápido de demo
  fillDemo() {
    while (this.datosFaltan.length) this.datosFaltan.removeAt(0);
    ['NIF', 'Dirección de facturación'].forEach(v => this.datosFaltan.push(this.fb.control(v)));
    this.form.patchValue({
      cliente_id: 'CL-00042',
      status: 'ok',
      factura_url: 'https://example.com/facturas/INV-2025-0001.pdf',
    });
  }
}
