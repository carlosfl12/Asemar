import { Injectable } from "@angular/core";

function urlBase64ToUint8Array(b64: string) {
    const p = "=".repeat((4 - (b64.length % 4)) % 4);
    const s = (b64 + p).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(s); const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
}

@Injectable({ providedIn: 'root' })
export class PushService {
    VAPID_PUBLIC_KEY = '';

    async subscribeAdmin(backendUrl: string) {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert('Navegador sin Web Push'); return;
        }
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { alert('Permiso no concedido'); return; }

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
        });

        await fetch(`${backendUrl}/api/push/subscribe.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
        });

        alert('Admin suscrito a notificaciones');
    }
}