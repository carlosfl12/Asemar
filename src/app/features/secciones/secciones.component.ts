import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

type ClientSummary = {
  id: string | number;
  nombre: string;
  pendientes: number;
}

@Component({
  selector: 'asm-secciones',
  imports: [CommonModule],
  templateUrl: './secciones.component.html',
  styleUrl: './secciones.component.scss'
})
export class SeccionesComponent implements OnInit{
  router = inject(Router);
  clientes = signal<ClientSummary[]>([]);
  error = signal<string | null>(null);
  hasClientes = computed(() => this.clientes().length > 0);

  ngOnInit(): void {
    this.error.set(null);
    try {
      const data: ClientSummary[] = [
        {id: 101, nombre: "El pepe", pendientes: 3},
        {id: 1, nombre: "esphera", pendientes: 1},
        {id: 2, nombre: "asemar", pendientes: 2},
        {id: 3, nombre: "test sin pendientes", pendientes: 0}
      ]
      this.clientes.set(data ?? []);
    } catch (e: any) {
      console.error(e);
      this.error.set('No se pudieron cargar los clientes.');
    }
  } 
  openClient(c: ClientSummary) {
    // opción 1: array de segmentos (absoluto)
    this.router.navigate(['/', c.id, 'facturas']);
  }
}
