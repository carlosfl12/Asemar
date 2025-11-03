import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PushService } from '../../../services/push.service';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'asm-sender-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sender.page.html',
  styleUrls: ['./sender.page.scss'],
})

export class SenderPage implements OnInit {

  private readonly baseUrl = environment.serveUrl;
  private readonly api_serve = environment.apiUrl;


  private fb = new FormBuilder();
  private router = inject(Router);
  private pushService = inject(PushService);
  sending = signal(false);

  form = this.fb.group({
    cliente_id: ['', Validators.required],
    status: ['pending', Validators.required],
    factura_url: ['', Validators.required],
    datos_faltan: this.fb.array<string>([]),
    extracted: this.fb.group({
      number: [''],
      date: [''],
      supplierName: [''],
      supplierVat: [''],
      subtotal: [''],
      vat: [''],
      total: [''],
    }),
  });

  get datosFaltan() { return this.form.get('datos_faltan') as FormArray; }
  get extracted() { return this.form.get('extracted')!; }
  addDato() { this.datosFaltan.push(this.fb.control('')); }
  removeDato(i: number) { this.datosFaltan.removeAt(i); }

  async ngOnInit() {

    try {
      // if (sessionStorage.getItem('isAdmin') && sessionStorage.getItem("isAdmin") === '1') return;
      await fetch(`${this.api_serve}/onesignal/notify-enter.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: this.form?.value?.cliente_id || null,
          send_to_all: true,
          // external_id: 'admin'
        })
      })
    } catch (err) {
      console.error(err)
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.sending.set(true);

    const v = this.form.value;

    const payload = {
      cliente_id: v.cliente_id!,
      status: v.status!,
      factura_url: v.factura_url!,
      datos_faltan: (v.datos_faltan ?? []).filter(Boolean),
      extracted: v.extracted ? {
        number: v.extracted['number'] || null,
        date: v.extracted['date'] || null,
        supplierName: v.extracted['supplierName'] || null,
        supplierVat: v.extracted['supplierVat'] || null,
        subtotal: v.extracted['subtotal'],
        vat: v.extracted['vat'],
        total: v.extracted['total'],
      } : null
    };


    // ENVÍO al backend
    const res = await fetch(`${environment.apiUrl}/db/append_invoice.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('Append invoice failed', await res.text());
    }

    this.sending.set(false);
  }


  // Relleno rápido de demo
  fillDemo() {
    while (this.datosFaltan.length) this.datosFaltan.removeAt(0);
    ['NIF', 'Dirección de facturación'].forEach(v => this.datosFaltan.push(this.fb.control(v)));
    this.form.patchValue({
      cliente_id: 'CL-00042',
      status: 'err',
      factura_url: '/asemar-api/db/uploads/invoices/00_25002805.pdf',
      extracted: {
        number: '25002807',
        date: Date.now().toLocaleString(),
        supplierName: 'Pepe',
        supplierVat: '325',
        subtotal: '393',
        vat: '68',
        total: '393'
      }
    });
  }
}
