// confirmacion.service.ts
//
// Reemplaza a confirm() del navegador: pide confirmación con un modal central propio
// (ui/dialogo-confirmacion, montado una sola vez en app.html) y devuelve si se aceptó.
//
//   if (!(await this.confirmacion.pedir({ titulo: '¿Eliminar este bache?', mensaje: '…' }))) return;
import { Injectable, signal } from '@angular/core';

export interface PedidoConfirmacion {
  titulo: string;
  mensaje: string;
  /** Texto del botón que confirma. Por defecto, "Eliminar". */
  textoConfirmar?: string;
  /** Texto del botón que cancela. Por defecto, "Cancelar". */
  textoCancelar?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  /** El pedido que se está mostrando (null: no hay modal abierto). */
  readonly actual = signal<PedidoConfirmacion | null>(null);
  private resolver: ((aceptado: boolean) => void) | null = null;

  pedir(pedido: PedidoConfirmacion): Promise<boolean> {
    this.responder(false); // si había uno abierto, cuenta como cancelado
    this.actual.set(pedido);
    return new Promise((resolver) => (this.resolver = resolver));
  }

  /** Lo llama el modal al aceptar, cancelar, tocar el fondo o apretar Esc. */
  responder(aceptado: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.actual.set(null);
    resolver?.(aceptado);
  }
}
