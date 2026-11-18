// acerca-de.component.ts
//
// "Acerca de" (/acerca, ruta hija del mapa, como el detalle): qué es GeoBaches, cómo
// funciona, qué significan los colores y estados, aclaración de que no es un canal
// oficial, privacidad y un formulario de contacto que le llega al admin.
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { COLOR_REPARADO, ESTADOS_BACHE, SEVERIDADES_BACHE } from '../../models/bache.model';
import { ContactoService } from '../../services/contacto.service';

/** Misma clave que usa el formulario de reporte para recordar el nombre. */
const CLAVE_USUARIO = 'geobaches-usuario';
export const LARGO_MAX_MENSAJE = 2000;

@Component({
  selector: 'app-acerca-de',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './acerca-de.component.html',
})
export class AcercaDeComponent {
  private readonly contacto = inject(ContactoService);

  // Los niveles van de Cráter a Leve, como en los filtros: lo más grave primero.
  protected readonly niveles = [...SEVERIDADES_BACHE].reverse();
  protected readonly estados = ESTADOS_BACHE;
  protected readonly colorReparado = COLOR_REPARADO;
  protected readonly largoMax = LARGO_MAX_MENSAJE;

  protected nombre = this.leerNombreGuardado();
  protected email = '';
  protected mensaje = '';
  protected sitioWeb = '';

  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly error = signal<string | null>(null);

  protected enviar(): void {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.error.set(null);

    this.contacto
      .enviar({ nombre: this.nombre.trim(), email: this.email.trim(), mensaje: this.mensaje.trim(), sitioWeb: this.sitioWeb })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.enviado.set(true);
          this.mensaje = '';
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          // ValidationPipe de Nest devuelve los errores como lista.
          const mensaje = e.error?.message;
          this.error.set(
            e.status === 400 && mensaje
              ? Array.isArray(mensaje)
                ? mensaje[0]
                : mensaje
              : 'No pudimos enviar el mensaje. Intentá de nuevo en un rato.',
          );
        },
      });
  }

  protected escribirOtro(): void {
    this.enviado.set(false);
  }

  private leerNombreGuardado(): string {
    try {
      return localStorage.getItem(CLAVE_USUARIO) ?? '';
    } catch {
      return '';
    }
  }
}
