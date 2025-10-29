import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class NotifyService {
    get supported() {
        return typeof window !== 'undefined' && 'Notification' in window;
    }

    async ensurePermission(): Promise<NotificationPermission> {
        if (!this.supported) return 'denied';
        if (Notification.permission === 'default') {
            return await Notification.requestPermission();
        }
        return Notification.permission;
    }

    async push(title: string, body?: string): Promise<boolean> {
        if (!this.supported) {
            console.warn('No se puede enviar notificaciones en este navegador');
            return false;
        }

        const perm = await this.ensurePermission();
        if (perm === 'granted') {
            new Notification(title, { body });
            return true;
        }

        alert(title + (body ? `\n\n${body}` : ''));
        return false;
    }
}