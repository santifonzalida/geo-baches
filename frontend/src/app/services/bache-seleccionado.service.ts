import { Injectable, signal } from '@angular/core';

/**
 * Qué bache muestra el detalle (/bache/:id). Lo escribe DetalleBacheComponent y lo
 * lee MapaComponent para destacar el marcador, atenuar el resto y esconder la barra.
 */
@Injectable({ providedIn: 'root' })
export class BacheSeleccionadoService {
  readonly id = signal<string | null>(null);
}
