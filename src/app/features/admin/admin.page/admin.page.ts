import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnesignalService } from '../../../services/onesignal.service';

@Component({
  standalone: true,
  selector: 'app-admin-page',
  imports: [CommonModule],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
})
export class AdminPage implements OnInit {
  estaSuscrito = false;
  cargando = false;

  constructor(private onesignalService: OnesignalService) {}

  async ngOnInit() {
    // Inicializar OneSignal al cargar la página
    try {
      await this.onesignalService.initialize();
      this.estaSuscrito = await this.onesignalService.estaSuscritoComoAdmin();
    } catch (error) {
      console.error('Error al inicializar:', error);
    }
  }

  async activarNotificaciones() {
    this.cargando = true;

    try {
      const exito = await this.onesignalService.suscribirComoAdmin();

      if (exito) {
        this.estaSuscrito = true;
        alert('✅ ¡Notificaciones activadas correctamente!');
      } else {
        alert('❌ No se pudieron activar las notificaciones');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al activar las notificaciones. Revisa la consola.');
    } finally {
      this.cargando = false;
    }
  }

  async desactivarNotificaciones() {
    this.cargando = true;

    try {
      await this.onesignalService.cerrarSesionAdmin();
      this.estaSuscrito = false;
      alert('✅ Notificaciones desactivadas');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      this.cargando = false;
    }
  }
}
