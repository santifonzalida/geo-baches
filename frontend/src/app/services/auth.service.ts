import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const CLAVE_STORAGE = 'geobaches_token';

/**
 * Login del panel de revisión: un solo admin fijo en el backend, sin tabla de
 * usuarios. El token se guarda en localStorage (simple, pero legible por
 * cualquier script si la app tuviera un XSS — ver conversación de diseño).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly _token = signal<string | null>(this.leerTokenValido());
  readonly autenticado = computed(() => this._token() !== null);

  login(usuario: string, password: string): Observable<void> {
    return this.http.post<{ accessToken: string }>(`${this.baseUrl}/login`, { usuario, password }).pipe(
      tap(({ accessToken }) => {
        try {
          localStorage.setItem(CLAVE_STORAGE, accessToken);
        } catch {
          // Safari privado, storage lleno, etc.: seguimos igual, solo que no persiste entre pestañas.
        }
        this._token.set(accessToken);
      }),
      map(() => undefined),
    );
  }

  logout(): void {
    try {
      localStorage.removeItem(CLAVE_STORAGE);
    } catch {
      // ver comentario en login()
    }
    this._token.set(null);
  }

  token(): string | null {
    return this._token();
  }

  private leerTokenValido(): string | null {
    let token: string | null = null;
    try {
      token = localStorage.getItem(CLAVE_STORAGE);
    } catch {
      return null;
    }
    if (!token || this.expirado(token)) {
      // Ojo: acá todavía no existe this._token (se está calculando su valor inicial),
      // así que se limpia el storage a mano en vez de llamar a logout().
      try {
        localStorage.removeItem(CLAVE_STORAGE);
      } catch {
        // ver comentario en login()
      }
      return null;
    }
    return token;
  }

  private expirado(token: string): boolean {
    const payload = this.decodificarPayload(token);
    return !payload || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  }

  private decodificarPayload(token: string): { exp?: number } | null {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }
}
