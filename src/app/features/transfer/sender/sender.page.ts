import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'asm-sender-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sender.page.html',
  styleUrls: ['./sender.page.scss'],
})
export class SenderPage {
  private fb = new FormBuilder();
  private router = inject(Router);

  form = this.fb.group({
    cliente_id: ['CL-00042', Validators.required],
    status: ['pending', Validators.required],
    factura_url: ['https://example.com/facturas/INV-2025-0001.pdf', [Validators.required]],
    datos_faltan: this.fb.array<string>(['NIF', 'Dirección']),
  });

  get datosFaltan() { return this.form.get('datos_faltan') as FormArray; }
  addDato() { this.datosFaltan.push(this.fb.control('')); }
  removeDato(i: number) { this.datosFaltan.removeAt(i); }

  // Enviar por query params (el archivo no viaja por aquí)
  onSubmit() {
    const v = this.form.value;
    this.router.navigate(['/display'], {
      queryParams: {
        cliente_id: v.cliente_id,
        status: v.status,
        factura_url: v.factura_url,
        datos_faltan: JSON.stringify((v.datos_faltan ?? []).filter(Boolean)),
      },
    });
  }

  // Relleno rápido de demo
  fillDemo() {
    while (this.datosFaltan.length) this.datosFaltan.removeAt(0);
    ['NIF', 'Dirección de facturación'].forEach(v => this.datosFaltan.push(this.fb.control(v)));
    this.form.patchValue({
      cliente_id: 'CL-00042',
      status: 'pending',
      factura_url: 'https://example.com/facturas/INV-2025-0001.pdf',
    });
  }
}
