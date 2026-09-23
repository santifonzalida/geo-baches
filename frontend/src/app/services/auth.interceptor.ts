import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Agrega el token a los pedidos hacia nuestra API. Si el backend responde 401
 * (token vencido o inválido), limpia la sesión y manda a la pantalla de login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const esNuestraApi = req.url.startsWith(environment.apiUrl);
  const esLogin = req.url === `${environment.apiUrl}/auth/login`;
  const token = auth.token();

  const solicitud = token && esNuestraApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(solicitud).pipe(
    catchError((error: HttpErrorResponse) => {
      // Un 401 en /auth/login es "usuario o clave incorrectos": lo maneja el propio
      // formulario de login, no significa que haya que cerrar una sesión que ni empezó.
      if (error.status === 401 && esNuestraApi && !esLogin) {
        auth.logout();
        router.navigateByUrl('/admin/login');
      }
      return throwError(() => error);
    }),
  );
};
