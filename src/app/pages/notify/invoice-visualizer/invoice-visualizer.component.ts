import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InvoiceItem } from '../types';

@Component({
  selector: 'app-invoice-visualizer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './invoice-visualizer.component.html',
  styleUrls: ['./invoice-visualizer.component.scss'],
})
export class InvoiceVisualizerComponent {
  @Input() invoice!: InvoiceItem;
  @Output() close = new EventEmitter<void>();
  @Output() fixed = new EventEmitter<void>();

  private sanitizer = inject(DomSanitizer);
  safePdfUrl!: SafeResourceUrl;

  fb = new FormBuilder();
  form = this.fb.group({
    number: [''],
    date: [''],
    supplierName: [''],
    supplierVat: [''],
    subtotal: [0, [Validators.min(0)]],
    vat: [0, [Validators.min(0)]],
    total: [0, [Validators.min(0)]],
  });

  async ngOnInit() {
    // Rellenar formulario
    const e = this.invoice.extracted ?? {};
    this.form.patchValue({
      number: e.number ?? '',
      date: e.date ?? '',
      supplierName: e.supplierName ?? '',
      supplierVat: e.supplierVat ?? '',
      subtotal: e.subtotal ?? 0,
      vat: e.vat ?? 0,
      total: e.total ?? 0,
    });

    // --- Sanear URL del PDF ---
    const raw = this.invoice.pdfUrl;

    // valida mismo origen
    const urlObj = new URL(raw, window.location.origin);
    if (urlObj.origin !== window.location.origin) {
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(urlObj.href);
    } else {
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(urlObj.href);
    }
  }

  async save() {
    const payload = { id: this.invoice.id, corrections: this.form.value };
    try {
      const res = await fetch('/asemar-api/push/confirm-invoice.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.close.emit();
    } catch (e) {
      alert('No se pudo guardar. Revisa la consola.');
      console.error(e);
    }
  }
}
