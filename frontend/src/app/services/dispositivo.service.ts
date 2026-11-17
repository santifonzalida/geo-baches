import { Injectable } from '@angular/core';

const CLAVE = 'geobaches-dispositivo';

/**
 * Identificador anónimo de este navegador, para que cada vecino tenga una sola
 * respuesta por bache ("Sigue ahí" / "Ya lo arreglaron"). No identifica a la persona.
 * Si el navegador no deja guardar (modo privado, almacenamiento bloqueado), vale
 * para esta visita nada más.
 */
@Injectable({ providedIn: 'root' })
export class DispositivoService {
  readonly id = this.obtenerOCrear();

  private obtenerOCrear(): string {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado) return guardado;
      const nuevo = crypto.randomUUID();
      localStorage.setItem(CLAVE, nuevo);
      return nuevo;
    } catch {
      return crypto.randomUUID();
    }
  }
}
