import { Injectable } from '@angular/core';

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class OnesignalService {
  private readonly APP_ID = '41a4d282-847d-4a34-a61b-3e82a732204d';
  private isInitialized = false;

  constructor() {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
  }

  /**
   * Inicializa OneSignal (llamar una sola vez al cargar la app)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('OneSignal ya está inicializado');
      return;
    }

    return new Promise((resolve, reject) => {
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: this.APP_ID,
            allowLocalhostAsSecureOrigin: true,
          });

          this.isInitialized = true;
          console.log('✅ OneSignal inicializado');
          resolve();
        } catch (error) {
          console.error('❌ Error al inicializar OneSignal:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Suscribe al usuario como admin y solicita permisos
   */
  async suscribirComoAdmin(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          console.log('🔵 Iniciando suscripción como admin...');

          // 1️⃣ Verificar permiso actual
          const permisoActual = await OneSignal.Notifications.permission;
          console.log('Permiso actual:', permisoActual);

          // 2️⃣ Solicitar permisos si no están concedidos
          if (permisoActual !== 'granted') {
            console.log('🔵 Solicitando permisos...');
            const permisoOtorgado =
              await OneSignal.Notifications.requestPermission();

            if (!permisoOtorgado) {
              console.error('❌ Usuario rechazó los permisos');
              alert('Debes permitir las notificaciones para continuar');
              resolve(false);
              return;
            }

            console.log('✅ Permisos concedidos');
          }

          // 3️⃣ Esperar a que se complete la suscripción
          console.log('🔵 Esperando suscripción...');
          await this.esperarSuscripcion(OneSignal);

          // 4️⃣ Verificar que la suscripción esté activa
          const suscripcionId = OneSignal.User.PushSubscription.id;
          const pushHabilitado = OneSignal.User.PushSubscription.optedIn;

          console.log('Estado de suscripción:');
          console.log('  - ID:', suscripcionId);
          console.log('  - Habilitado:', pushHabilitado);

          if (!suscripcionId || !pushHabilitado) {
            console.error('❌ La suscripción no se completó correctamente');
            resolve(false);
            return;
          }

          console.log('✅ Suscripción completada');

          // 5️⃣ Hacer login como admin
          console.log('🔵 Haciendo login como "admin"...');
          await OneSignal.login('admin');

          // Esperar a que se procese
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 6️⃣ Verificar el login
          const externalId = OneSignal.User.externalId;
          console.log('✅ External ID:', externalId);

          if (externalId !== 'admin') {
            console.warn('⚠️ El External ID no coincide:', externalId);
          }

          // 7️⃣ Guardar en sessionStorage
          sessionStorage.setItem('isAdmin', '1');

          // 8️⃣ Info final
          console.log('📊 Información del usuario:');
          console.log('  - OneSignal ID:', OneSignal.User.onesignalId);
          console.log('  - External ID:', OneSignal.User.externalId);
          console.log(
            '  - Subscription ID:',
            OneSignal.User.PushSubscription.id
          );
          console.log('  - Token:', OneSignal.User.PushSubscription.token);

          console.log('🎉 ¡Suscripción como admin completada!');
          resolve(true);
        } catch (error) {
          console.error('❌ Error durante la suscripción:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Espera hasta que la suscripción esté activa (máximo 10 segundos)
   */
  private async esperarSuscripcion(OneSignal: any): Promise<void> {
    const maxIntentos = 20;
    let intentos = 0;

    while (intentos < maxIntentos) {
      const suscripcionId = OneSignal.User.PushSubscription.id;
      const pushHabilitado = OneSignal.User.PushSubscription.optedIn;

      if (suscripcionId && pushHabilitado) {
        console.log('✅ Suscripción detectada');
        return;
      }

      console.log(
        `⏳ Esperando suscripción... (intento ${intentos + 1}/${maxIntentos})`
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      intentos++;
    }

    throw new Error('Timeout esperando la suscripción');
  }

  /**
   * Verifica si el usuario ya está suscrito como admin
   */
  async estaSuscritoComoAdmin(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    return new Promise((resolve) => {
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          const externalId = OneSignal.User.externalId;
          const pushHabilitado = OneSignal.User.PushSubscription.optedIn;
          const esAdmin = sessionStorage.getItem('isAdmin') === '1';

          resolve(externalId === 'admin' && pushHabilitado && esAdmin);
        } catch {
          resolve(false);
        }
      });
    });
  }

  /**
   * Cierra sesión del admin
   */
  async cerrarSesionAdmin(): Promise<void> {
    return new Promise((resolve) => {
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.logout();
          sessionStorage.removeItem('isAdmin');
          console.log('✅ Sesión de admin cerrada');
          resolve();
        } catch (error) {
          console.error('❌ Error al cerrar sesión:', error);
          resolve();
        }
      });
    });
  }
}
