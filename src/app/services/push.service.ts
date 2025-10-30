// src/app/services/push.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly VAPID_PUBLIC_KEY = 'BFX7nOV7WoZD1wDZ4sYcN9UrTyRHiHPeiop5Okjw1cFXM3SmQPPSAXrHq2Lw7zOF3m0c8jaIb2q01ODlTTgx8Bc'; // del vapid_keys.json
  private readonly API_BASE = '/asemar-api';

  async registerServiceWorker(path = '/asemar/asm-sw.js') {
    if (!('serviceWorker' in navigator)) throw new Error('SW not supported');
    const reg = await navigator.serviceWorker.register(path);
    await navigator.serviceWorker.ready;
    return reg;
  }

  async requestPermission() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notification permission denied');
  }

  async subscribeAndSend() {
    await this.requestPermission();
    const reg = await this.registerServiceWorker();

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
    });

    // Manda la suscripción al backend
    const res = await fetch(`${this.API_BASE}/subscribe.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    if (!res.ok) throw new Error('Failed to store subscription');
    return await res.json();
  }

  // VAPID
  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  // Enviar notificaciones
  async notifyAdmin(payload: { title: string; body: string; url: string }) {
    const res = await fetch(`${this.API_BASE}/push/notify-admin.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
}
