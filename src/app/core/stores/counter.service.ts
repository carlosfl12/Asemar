import { Injectable, effect, signal } from '@angular/core';
type CounterSnapshot = {
  correct: number;
  total: number;
}
const STORAGE_KEY = 'counters:v1';
@Injectable({
  providedIn: 'root'
})
export class CounterService {
  correctInvoices = signal<number>(0);
  totalInvoices = signal<number>(0);

  constructor() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const snap = JSON.parse(raw) as Partial<CounterSnapshot>;
        if (snap.correct != null) this.correctInvoices.set(Number(snap.correct) || 0);
        if (snap.total != null) this.totalInvoices.set(Number(snap.total) || 0);
      }
    } catch {}

    effect(() => {
      const snap: CounterSnapshot = {
        correct: this.correctInvoices(),
        total: this.totalInvoices(),
      };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
      } catch {}
    })
  }

  setCorrect(n: Number) {
    this.correctInvoices.set(Number(n) || 0);
  }
  setTotal(n: Number) {
    this.totalInvoices.set(Number(n) || 0);
  }
  incrementCorrect(by = 1) {
    this.correctInvoices.update(v => v + by);
  }
  reset() {
    this.setCorrect(0);
    this.setTotal(0);
  }
}
