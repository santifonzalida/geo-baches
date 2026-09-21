// admin-pendientes.component.ts
//
// Panel de revisión: lista los baches recién reportados (revisado=false) para
// aprobarlos o rechazarlos antes de que aparezcan en el mapa público. Incluye
// un mapa que centra el punto seleccionado, con los baches ya aprobados como
// referencia de fondo (para detectar duplicados/contexto geográfico).
//
// Sin login por ahora. Cuando se agregue autenticación, este es el componente
// a poner detrás de un canActivate en app.routes.ts (ver comentario ahí).
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { BachesService } from '../../services/baches.service';
import { Bache, formatearDireccion, SEVERIDADES_BACHE } from '../../models/bache.model';

@Component({
  selector: 'app-admin-pendientes',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-pendientes.component.html',
})
export class AdminPendientesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private readonly bachesService = inject(BachesService);
  private map!: L.Map;
  private marcadorSeleccionado: L.Marker | undefined;

  protected readonly severidades = SEVERIDADES_BACHE;
  protected readonly pendientes = signal<Bache[]>([]);
  protected readonly seleccionado = signal<Bache | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly enProceso = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: false }).setView(
      [-31.4201, -64.1888],
      13,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Baches ya aprobados, tenues, solo como referencia geográfica.
    this.bachesService.cargar().subscribe((aprobados) => {
      aprobados.forEach((bache) => {
        L.marker([bache.lat, bache.lng], { icon: this.iconoContexto(), interactive: false }).addTo(this.map);
      });
    });

    if (this.seleccionado()) {
      this.mostrarSeleccionado(this.seleccionado()!);
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.bachesService.cargarPendientes().subscribe({
      next: (pendientes) => {
        this.pendientes.set(pendientes);
        this.cargando.set(false);
        if (pendientes.length) this.seleccionar(pendientes[0]);
      },
      error: () => {
        this.error.set('No se pudieron cargar los reportes pendientes. ¿Está corriendo el backend?');
        this.cargando.set(false);
      },
    });
  }

  protected seleccionar(bache: Bache): void {
    this.seleccionado.set(bache);
    if (this.map) this.mostrarSeleccionado(bache);
  }

  private mostrarSeleccionado(bache: Bache): void {
    if (this.marcadorSeleccionado) {
      this.map.removeLayer(this.marcadorSeleccionado);
    }
    this.marcadorSeleccionado = L.marker([bache.lat, bache.lng], {
      icon: this.iconoDestacado(bache),
    }).addTo(this.map);
    this.map.flyTo([bache.lat, bache.lng], Math.max(this.map.getZoom(), 15), { duration: 0.6 });
  }

  private iconoContexto(): L.DivIcon {
    const html = `<span style="display:block;width:10px;height:10px;border-radius:50%;background:rgba(51,48,43,.28);border:1.5px solid #fffdf9"></span>`;
    return L.divIcon({ className: '', html, iconSize: [10, 10], iconAnchor: [5, 5] });
  }

  /** Marcador grande con anillo pulsante — para que salte a la vista cuál es el punto en revisión. */
  private iconoDestacado(bache: Bache): L.DivIcon {
    const color = this.colorSeveridad(bache);
    const html = `
      <span class="marcador-pulso" style="--color-marcador:${color}">
        <span class="marcador-pulso-anillo"></span>
        <span class="marcador-pulso-punto"></span>
      </span>
    `;
    return L.divIcon({ className: '', html, iconSize: [34, 34], iconAnchor: [17, 17] });
  }

  protected direccion(bache: Bache): string {
    return formatearDireccion(bache);
  }

  protected urlFoto(bache: Bache): string | null {
    return this.bachesService.urlFoto(bache.fotoUrl);
  }

  protected etiquetaSeveridad(bache: Bache): string {
    return this.severidades.find((s) => s.valor === bache.severidad)?.etiqueta ?? bache.severidad;
  }

  protected colorSeveridad(bache: Bache): string {
    return this.severidades.find((s) => s.valor === bache.severidad)?.color ?? '#c2683f';
  }

  protected aprobar(bache: Bache): void {
    this.marcarEnProceso(bache.id, true);
    this.bachesService.aprobar(bache.id).subscribe({
      next: () => this.quitarDeLaLista(bache.id),
      error: () => {
        this.marcarEnProceso(bache.id, false);
        this.error.set('No se pudo aprobar el reporte. Intentá de nuevo.');
      },
    });
  }

  protected rechazar(bache: Bache): void {
    if (!confirm('¿Rechazar y eliminar este reporte? No se puede deshacer.')) return;

    this.marcarEnProceso(bache.id, true);
    this.bachesService.eliminar(bache.id).subscribe({
      next: () => this.quitarDeLaLista(bache.id),
      error: () => {
        this.marcarEnProceso(bache.id, false);
        this.error.set('No se pudo rechazar el reporte. Intentá de nuevo.');
      },
    });
  }

  private quitarDeLaLista(id: string): void {
    const eraElSeleccionado = this.seleccionado()?.id === id;
    this.pendientes.update((lista) => lista.filter((bache) => bache.id !== id));
    this.marcarEnProceso(id, false);

    if (!eraElSeleccionado) return;

    const siguiente = this.pendientes()[0] ?? null;
    this.seleccionado.set(siguiente);
    if (siguiente) {
      this.mostrarSeleccionado(siguiente);
    } else if (this.marcadorSeleccionado) {
      this.map.removeLayer(this.marcadorSeleccionado);
      this.marcadorSeleccionado = undefined;
    }
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
