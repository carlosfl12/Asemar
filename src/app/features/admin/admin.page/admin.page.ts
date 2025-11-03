import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PushService } from '../../../services/push.service';

@Component({
  standalone: true,
  selector: 'asm-admin.page',
  imports: [CommonModule],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss'
})

export class AdminPage implements OnInit {
  ngOnInit() {
    // Asegura que la cola existe (por si navegas directo)
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    console.log(window.OneSignalDeferred);
  }

  activar() {
    (window as any).OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId: '41a4d282-847d-4a34-a61b-3e82a732204d',   // <-- tu APP ID
        allowLocalhostAsSecureOrigin: true,               // para localhost
        serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/asemar/onesignal/' } // respeta tu baseHref
        // Más opciones: promptOptions, notifyButton, etc.
      });
      await OneSignal.login('admin');
      sessionStorage.setItem('isAdmin', '1');

      // Muestra prompt v16 (slidedown). Si no sale, usa showNativePrompt().
      if (OneSignal?.Slidedown?.promptPush) {
        await OneSignal.Slidedown.promptPush();
      } else if (OneSignal?.Notifications?.requestPermission) {
        await OneSignal.Notifications.requestPermission(); // fallback
      }
    });
  }
}
