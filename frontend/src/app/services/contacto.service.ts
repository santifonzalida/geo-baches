import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NuevoMensajeContacto {
  nombre: string;
  email: string;
  mensaje: string;
  /** Campo trampa para bots: siempre vacío desde el formulario. */
  sitioWeb?: string;
}

export interface MensajeContacto {
  id: string;
  nombre: string;
  email: string;
  mensaje: string;
  fecha: Date;
}

@Injectable({ providedIn: 'root' })
export class ContactoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/contacto`;

  enviar(mensaje: NuevoMensajeContacto): Observable<void> {
    return this.http.post<void>(this.baseUrl, mensaje);
  }

  /** Admin. */
  listar(): Observable<MensajeContacto[]> {
    return this.http
      .get<(Omit<MensajeContacto, 'fecha'> & { fecha: string })[]>(this.baseUrl)
      .pipe(map((lista) => lista.map((m) => ({ ...m, fecha: new Date(m.fecha) }))));
  }

  /** Admin. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
