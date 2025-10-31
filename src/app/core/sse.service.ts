// src/app/core/sse.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SseService {
  constructor(private zone: NgZone) { }

  stream<T = any>(url: string): Observable<T> {
    return new Observable<T>(observer => {
      const es = new EventSource(url);

      const onPayload = (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          observer.next(parsed as T);
        } catch (err) {
          console.warn('SSE payload no es JSON válido:', e.data);
          // opcional: observer.error(err);
        }
      };

      es.addEventListener('payload', onPayload);
      es.addEventListener('ping', () => { });
      es.onerror = () => { };

      return () => es.close();
    });
  }
}
