import { Component, OnInit, computed, signal, inject, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Payload, InvoiceItem } from './types';
import { InvoiceVisualizerComponent } from './invoice-visualizer/invoice-visualizer.component';
import { SseService } from '../../core/sse.service';

@Component({
  selector: 'app-notify',
  standalone: true,
  imports: [CommonModule, InvoiceVisualizerComponent],
  templateUrl: './notify.component.html',
  styleUrls: ['./notify.component.scss'],
})
export class NotifyComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<Payload | null>(null);

  okCounter = signal<number>(0);
  totalCounter = computed(() => this.data()?.invoices.length ?? 0);

  private paramMapSig = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  selected = signal<InvoiceItem | null>(null);

  invoices = computed(() => this.data()?.invoices ?? []);

  constructor(private sse: SseService) {
    effect(() => {
      const id = this.paramMapSig()?.get('id');
      if (!id) {
        this.selected.set(null);
        return;
      }
      const found = this.invoices().find(i => i.id === id) ?? null;
      this.selected.set(found);
    });
  }

  async ngOnInit() {
    await this.load();
    this.sse.stream<Payload>('/asemar-api/push/stream.php')
      .subscribe(payload => {
        this.data.set(payload);
      });
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
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

  async loadCounters() {
    try {
      const res = await fetch('/asemar-api/push/counter.php?action=get', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json();
        this.okCounter.set(Number(json?.ok ?? 0));
      }
    } catch {

    }
  }

  async onInvoiceFixed() {
    try {
      await fetch('/asemar-api/push/counter.php?action=inc', { method: 'POST' });
    } catch { }
    await this.loadCounters();
  }

  open(invoice: InvoiceItem) {
    this.router.navigate(['/notify', invoice.id]);
  }

  closeModal() {
    this.router.navigate(['/notify']);
  }

  badgeClass(status: string) {
    return {
      ok: 'badge--ok',
      failed: 'badge--failed',
      pending: 'badge--pending',
    }[status] ?? 'badge--pending';
  }
}
