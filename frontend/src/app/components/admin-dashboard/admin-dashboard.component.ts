// admin-dashboard.component.ts
//
// Pantalla de entrada del administrador: contadores (pendientes, aprobados,
// total cargado y aprobados por estado) y la lista completa de puntos
// (aprobados + pendientes) con filtro, búsqueda y opción de eliminar. Abajo,
// los mensajes que llegan desde el formulario de "Acerca de".
//
// Detrás de authGuard en app.routes.ts: sin sesión válida, redirige a /admin/login.
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BachesService } from '../../services/baches.service';
import { ContactoService, MensajeContacto } from '../../services/contacto.service';
import {
  Bache,
  COLOR_REPARADO,
  ESTADOS_BACHE,
  EstadoBache,
  formatearDireccion,
  ResumenConfirmaciones,
  SEVERIDADES_BACHE,
} from '../../models/bache.model';

type FiltroRevision = 'todos' | 'pendientes' | 'aprobados';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly bachesService = inject(BachesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly contacto = inject(ContactoService);

  protected readonly estados = ESTADOS_BACHE;
  protected readonly filtros: { valor: FiltroRevision; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'pendientes', etiqueta: 'Pendientes' },
    { valor: 'aprobados', etiqueta: 'Aprobados' },
  ];

  protected readonly baches = signal<Bache[]>([]);
  /** Respuestas de vecinos en el detalle ("Sigue ahí" / "Ya lo arreglaron"), por id de bache. */
  protected readonly confirmaciones = signal<Record<string, ResumenConfirmaciones>>({});
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly enProceso = signal<Set<string>>(new Set());
  protected readonly filtro = signal<FiltroRevision>('todos');
  protected readonly busqueda = signal('');

  protected readonly mensajes = signal<MensajeContacto[]>([]);
  protected readonly cargandoMensajes = signal(true);
  protected readonly errorMensajes = signal<string | null>(null);

  protected readonly pendientes = computed(() => this.baches().filter((b) => !b.revisado).length);
  protected readonly aprobados = computed(() => this.baches().filter((b) => b.revisado).length);
  protected readonly porEstado = computed(() => {
    const conteo: Record<EstadoBache, number> = { reportado: 0, 'en-reparacion': 0, reparado: 0 };
    this.baches()
      .filter((b) => b.revisado)
      .forEach((b) => conteo[b.estado]++);
    return conteo;
  });

  protected readonly visibles = computed(() => {
    const filtro = this.filtro();
    const texto = this.busqueda().trim().toLowerCase();
    return this.baches().filter((b) => {
      if (filtro === 'pendientes' && b.revisado) return false;
      if (filtro === 'aprobados' && !b.revisado) return false;
      if (!texto) return true;
      return [formatearDireccion(b), b.barrio, b.usuario].some((campo) => campo?.toLowerCase().includes(texto));
    });
  });

  ngOnInit(): void {
    this.cargar();
    this.cargarMensajes();
  }

  /** Aparte de los baches: si falla, el resto del panel sigue funcionando. */
  protected cargarMensajes(): void {
    this.cargandoMensajes.set(true);
    this.errorMensajes.set(null);
    this.contacto.listar().subscribe({
      next: (mensajes) => {
        this.mensajes.set(mensajes);
        this.cargandoMensajes.set(false);
      },
      error: () => {
        this.errorMensajes.set('No se pudieron cargar los mensajes.');
        this.cargandoMensajes.set(false);
      },
    });
  }

  protected eliminarMensaje(mensaje: MensajeContacto): void {
    if (!confirm(`¿Eliminar el mensaje de ${mensaje.nombre}? No se puede deshacer.`)) return;

    this.marcarEnProceso(mensaje.id, true);
    this.contacto.eliminar(mensaje.id).subscribe({
      next: () => {
        this.mensajes.update((lista) => lista.filter((m) => m.id !== mensaje.id));
        this.marcarEnProceso(mensaje.id, false);
      },
      error: () => {
        this.marcarEnProceso(mensaje.id, false);
        this.errorMensajes.set('No se pudo eliminar el mensaje. Intentá de nuevo.');
      },
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    forkJoin([
      this.bachesService.cargar(),
      this.bachesService.cargarPendientes(),
      this.bachesService.resumenConfirmaciones(),
    ]).subscribe({
      next: ([aprobados, pendientes, confirmaciones]) => {
        // Pendientes primero: son los que piden acción.
        this.baches.set([...pendientes, ...aprobados]);
        this.confirmaciones.set(confirmaciones);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los baches. ¿Está corriendo el backend?');
        this.cargando.set(false);
      },
    });
  }

  protected cerrarSesion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }

  protected eliminar(bache: Bache): void {
    if (!confirm(`¿Eliminar el bache de ${this.direccion(bache)}? No se puede deshacer.`)) return;

    this.marcarEnProceso(bache.id, true);
    this.bachesService.eliminar(bache.id).subscribe({
      next: () => {
        this.baches.update((lista) => lista.filter((b) => b.id !== bache.id));
        this.marcarEnProceso(bache.id, false);
      },
      error: () => {
        this.marcarEnProceso(bache.id, false);
        this.error.set('No se pudo eliminar el bache. Intentá de nuevo.');
      },
    });
  }

  /** Vecinos que avisaron que ya está arreglado (solo cuenta si todavía no figura como arreglado). */
  protected avisosArreglado(bache: Bache): number {
    return bache.estado === 'reparado' ? 0 : (this.confirmaciones()[bache.id]?.arreglado ?? 0);
  }

  protected direccion(bache: Bache): string {
    return formatearDireccion(bache);
  }

  protected etiquetaEstado(bache: Bache): string {
    return this.estados.find((e) => e.valor === bache.estado)?.etiqueta ?? bache.estado;
  }

  protected colorEstado(bache: Bache): string {
    return bache.estado === 'reparado' ? COLOR_REPARADO : 'var(--ink)';
  }

  protected etiquetaSeveridad(bache: Bache): string {
    return SEVERIDADES_BACHE.find((s) => s.valor === bache.severidad)?.etiqueta ?? bache.severidad;
  }

  protected colorSeveridad(bache: Bache): string {
    return SEVERIDADES_BACHE.find((s) => s.valor === bache.severidad)?.color ?? '#c2683f';
  }

  private marcarEnProceso(id: string, activo: boolean): void {
    this.enProceso.update((actual) => {
      const nuevo = new Set(actual);
      if (activo) nuevo.add(id);
      else nuevo.delete(id);
      return nuevo;
    });
  }
}
