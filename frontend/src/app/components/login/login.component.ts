// login.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected usuario = '';
  protected password = '';
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected ingresar(): void {
    if (!this.usuario.trim() || !this.password) return;

    this.enviando.set(true);
    this.error.set(null);

    this.auth.login(this.usuario.trim(), this.password).subscribe({
      next: () => this.router.navigateByUrl('/admin/pendientes'),
      error: () => {
        this.enviando.set(false);
        this.error.set('Usuario o contraseña incorrectos.');
      },
    });
  }
}
