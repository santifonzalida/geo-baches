// mapa.component.ts
import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild,
  signal,
  computed,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import * as L from 'leaflet';
import { BachesService } from '../../services/baches.service';
import {
  Bache,
  COLOR_REPARADO,
  formatearDireccion,
  EstadoBache,
  ESTADOS_BACHE,
  SeveridadBache,
  SEVERIDADES_BACHE,
} from '../../models/bache.model';

interface MarcadorRegistrado {
  marker: L.Marker;
  bache: Bache;
}

/** Debe coincidir con el límite del backend (baches.controller.ts). */
const TAMANO_MAX_FOTO = 5 * 1024 * 1024;
/** El servidor vuelve a procesarla (fotos.service.ts); acá se achica para no subir 12 MP por datos móviles. */
const LADO_MAX_FOTO = 1280;

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './mapa.component.html',
})
export class MapaComponent implements AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private readonly bachesService = inject(BachesService);
  private map!: L.Map;
  private readonly marcadores = new Map<string, MarcadorRegistrado>();

  protected readonly estados = ESTADOS_BACHE;
  protected readonly severidades = SEVERIDADES_BACHE;
  protected readonly baches = this.bachesService.baches;

  protected readonly conteoPorEstado = computed(() => {
    const conteo: Record<EstadoBache, number> = { reportado: 0, 'en-reparacion': 0, reparado: 0 };
    this.baches().forEach((bache) => conteo[bache.estado]++);
    return conteo;
  });

  /** Últimos reportes, más nuevo primero — para la lista "Reportes de tu zona". */
  protected readonly ultimosReportes = computed(() =>
    [...this.baches()].sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 4),
  );

  protected readonly barraVisible = signal(true);
  protected readonly listaReportesVisible = signal(true);

  protected readonly filtroEstado = signal<Record<EstadoBache, boolean>>({
    reportado: true,
    'en-reparacion': true,
    reparado: true,
  });
  protected readonly soloAlta = signal(false);

  protected readonly clickLatLng = signal<L.LatLng | null>(null);
  protected readonly formVisible = signal(false);
  protected readonly fotoPreview = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);
  private temporizadorExito: ReturnType<typeof setTimeout> | undefined;

  protected readonly buscandoDireccion = signal(false);
  protected readonly procesandoFoto = signal(false);

  protected usuario = '';
  protected calle = '';
  protected altura = '';
  protected barrio = '';
  protected severidad: SeveridadBache = 'media';
  private fotoSeleccionada: File | undefined;

  ngAfterViewInit(): void {
    this.initMap();
    this.cargarBachesExistentes();
  }

  private initMap(): void {
    // Centrado en Córdoba como ejemplo, ajustá a tu zona
    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: false }).setView(
      [-31.4201, -64.1888],
      13,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => this.onMapClick(e.latlng));
  }

  private cargarBachesExistentes(): void {
    this.bachesService.cargar().subscribe({
      next: (baches) => baches.forEach((bache) => this.agregarMarcador(bache)),
      error: () => this.error.set('No se pudieron cargar los baches. ¿Está corriendo el backend?'),
    });
  }

  protected zoomIn(): void {
    this.map.zoomIn();
  }

  protected zoomOut(): void {
    this.map.zoomOut();
  }

  protected irAMiUbicacion(): void {
    if (!navigator.geolocation) {
      this.avisarError('Tu navegador no permite obtener la ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => this.map.flyTo([coords.latitude, coords.longitude], 16, { duration: 0.6 }),
      (fallo) =>
        this.avisarError(
          fallo.code === fallo.PERMISSION_DENIED
            ? 'Para usar tu ubicación, permití el acceso desde el navegador.'
            : 'No pudimos obtener tu ubicación. Intentá de nuevo.',
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  private avisarError(texto: string): void {
    this.error.set(texto);
    setTimeout(() => this.error() === texto && this.error.set(null), 5000);
  }

  protected toggleListaReportes(): void {
    this.listaReportesVisible.update((valor) => !valor);
  }

  protected toggleBarra(): void {
    this.barraVisible.update((valor) => !valor);
  }

  protected toggleFiltroEstado(valor: EstadoBache): void {
    this.filtroEstado.update((actual) => ({ ...actual, [valor]: !actual[valor] }));
    this.aplicarFiltros();
  }

  protected toggleSoloAlta(): void {
    this.soloAlta.update((valor) => !valor);
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    const filtros = this.filtroEstado();
    const alta = this.soloAlta();

    this.marcadores.forEach(({ marker, bache }) => {
      const visible = filtros[bache.estado] && (!alta || bache.severidad === 'alta');
      const yaEstaEnMapa = this.map.hasLayer(marker);
      if (visible && !yaEstaEnMapa) marker.addTo(this.map);
      if (!visible && yaEstaEnMapa) this.map.removeLayer(marker);
    });
  }

  /** Centra el mapa en un bache de la lista "Reportes de tu zona" y abre su popup. */
  protected irAlReporte(bache: Bache): void {
    this.listaReportesVisible.set(false); // despeja el mapa para ver el punto y su popup
    this.map.flyTo([bache.lat, bache.lng], Math.max(this.map.getZoom(), 16), { duration: 0.6 });
    this.marcadores.get(bache.id)?.marker.openPopup();
  }

  private onMapClick(latlng: L.LatLng): void {
    this.clickLatLng.set(latlng);
    this.usuario = '';
    this.calle = '';
    this.altura = '';
    this.barrio = '';
    this.severidad = 'media';
    this.fotoSeleccionada = undefined;
    this.fotoPreview.set(null);
    this.error.set(null);
    this.formVisible.set(true);
    this.autocompletarDireccion(latlng);
  }

  /** Sugiere calle/altura/barrio; si la persona ya escribió algo en un campo, no se lo pisa. */
  private autocompletarDireccion(latlng: L.LatLng): void {
    this.buscandoDireccion.set(true);
    this.bachesService.geocodificar(latlng.lat, latlng.lng).subscribe({
      next: (direccion) => {
        if (this.clickLatLng() !== latlng) return; // el formulario ya apunta a otro punto
        this.calle ||= direccion.calle ?? '';
        this.altura ||= direccion.altura ?? '';
        this.barrio ||= direccion.barrio ?? '';
        this.buscandoDireccion.set(false);
      },
      error: () => this.buscandoDireccion.set(false),
    });
  }

  protected async onFotoSeleccionada(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    this.error.set(null);
    try {
      const foto = await this.prepararFoto(archivo);
      if (foto.size > TAMANO_MAX_FOTO) {
        this.error.set('La foto pesa más de 5 MB. Probá con una más liviana.');
        return;
      }
      const anterior = this.fotoPreview();
      if (anterior) URL.revokeObjectURL(anterior);
      this.fotoSeleccionada = foto;
      this.fotoPreview.set(URL.createObjectURL(foto));
    } catch {
      this.error.set('No pudimos procesar esa foto. Probá con otra o enviá el reporte sin foto.');
    } finally {
      this.procesandoFoto.set(false);
    }
  }

  /**
   * Los iPhone sacan fotos en HEIC, que Chrome/Firefox/Edge no pueden mostrar:
   * se convierte a JPEG acá, antes de subir. La librería pesa varios MB, así que
   * se carga recién cuando aparece un HEIC.
   */
  private async prepararFoto(archivo: File): Promise<File> {
    const esHeic = /\.(heic|heif)$/i.test(archivo.name) || /^image\/hei[cf]/i.test(archivo.type);
    if (!esHeic) return this.reducirFoto(archivo);

    this.procesandoFoto.set(true);
    const { heicTo } = await import('heic-to');
    const jpeg = await heicTo({ blob: archivo, type: 'image/jpeg', quality: 0.85 });
    const convertida = new File([jpeg], archivo.name.replace(/\.(heic|heif)$/i, '') + '.jpg', {
      type: 'image/jpeg',
    });
    return this.reducirFoto(convertida);
  }

  /** La foto solo se ve en ventanas chicas: se achica a LADO_MAX_FOTO px antes de subirla. */
  private async reducirFoto(archivo: File): Promise<File> {
    if (archivo.type === 'image/gif') return archivo; // un canvas perdería la animación

    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAX_FOTO / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && archivo.size <= TAMANO_MAX_FOTO) {
      bitmap.close();
      return archivo;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; // PNG/WebP con transparencia: sin esto el fondo sale negro en JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.8));
    if (!blob) throw new Error('No se pudo reducir la foto');
    return new File([blob], archivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }

  protected guardarBache(): void {
    const latlng = this.clickLatLng();
    if (!latlng || !this.usuario.trim()) return;

    this.guardando.set(true);
    this.error.set(null);

    this.bachesService
      .agregar({
        lat: latlng.lat,
        lng: latlng.lng,
        // Un reporte vecinal siempre arranca "sin reparar"; el avance de obra lo mueve otro flujo (inspector).
        estado: 'reportado',
        severidad: this.severidad,
        usuario: this.usuario.trim(),
        calle: this.calle.trim(),
        altura: this.altura.trim(),
        barrio: this.barrio.trim(),
        foto: this.fotoSeleccionada,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.cancelarReporte();
          this.mostrarMensajeExito('¡Gracias! Tu reporte se envió y se va a mostrar en el mapa cuando sea revisado.');
        },
        error: (e: HttpErrorResponse) => {
          this.guardando.set(false);
          const mensaje = typeof e.error?.message === 'string' ? e.error.message : null;
          this.error.set(
            e.status === 413
              ? 'La foto pesa más de 5 MB. Probá con una más liviana.'
              : e.status === 400 && mensaje
                ? mensaje
                : 'No se pudo guardar el bache. Intentá de nuevo.',
          );
        },
      });
  }

  private mostrarMensajeExito(texto: string): void {
    this.mensajeExito.set(texto);
    clearTimeout(this.temporizadorExito);
    this.temporizadorExito = setTimeout(() => this.mensajeExito.set(null), 5000);
  }

  protected cancelarReporte(): void {
    const preview = this.fotoPreview();
    if (preview) URL.revokeObjectURL(preview);

    this.formVisible.set(false);
    this.clickLatLng.set(null);
    this.fotoPreview.set(null);
    this.buscandoDireccion.set(false);
  }

  private agregarMarcador(bache: Bache): void {
    const marker = L.marker([bache.lat, bache.lng], { icon: this.crearIcono(bache) });
    // El autopan de Leaflet solo mueve lo justo para que entre el popup: se reemplaza por centrar el punto.
    marker.bindPopup(this.popupHtml(bache), { autoPan: false });
    marker.on('click', () => this.map.panTo(marker.getLatLng(), { animate: true, duration: 0.5 }));
    this.marcadores.set(bache.id, { marker, bache });

    const filtros = this.filtroEstado();
    const visible = filtros[bache.estado] && (!this.soloAlta() || bache.severidad === 'alta');
    if (visible) marker.addTo(this.map);
  }

  protected colorDeBache(bache: Pick<Bache, 'estado' | 'severidad'>): string {
    if (bache.estado === 'reparado') return COLOR_REPARADO;
    return this.severidades.find((s) => s.valor === bache.severidad)?.color ?? '#c2683f';
  }

  protected direccion(bache: Bache): string {
    return formatearDireccion(bache);
  }

  protected etiquetaSeveridad(severidad: SeveridadBache): string {
    return this.severidades.find((s) => s.valor === severidad)?.etiqueta ?? severidad;
  }

  protected iconoDeSeveridad(severidad: SeveridadBache): string {
    return this.severidades.find((s) => s.valor === severidad)?.icono ?? this.severidades[1].icono;
  }

  /**
   * El ícono lo define la severidad (leve / moderado / crítico). El estado se lee en
   * una insignia: "en obra" lleva una llave inglesa; "listo" se apaga y suma un tilde verde.
   */
  private crearIcono(bache: Bache): L.DivIcon {
    const tamano = 40;
    const resuelto = bache.estado === 'reparado';
    const sombra = 'drop-shadow(0 2px 3px rgba(51,48,43,.4))';
    const imagen = `<img src="${this.iconoDeSeveridad(bache.severidad)}" alt="" width="${tamano}" height="${tamano}" draggable="false" style="display:block;${resuelto ? `opacity:.6;filter:grayscale(.85) ${sombra}` : `filter:${sombra}`}" />`;

    const insignia = (fondo: string, trazo: string) =>
      `<span style="position:absolute;right:-3px;bottom:0;width:17px;height:17px;border-radius:50%;background:${fondo};border:2px solid #fffdf9;display:grid;place-items:center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fffdf9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="9" height="9">${trazo}</svg></span>`;
    const llave = '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';
    const tilde = '<path d="M20 6 9 17l-5-5"/>';
    const marca =
      bache.estado === 'en-reparacion'
        ? insignia('#33302b', llave)
        : resuelto
          ? insignia(COLOR_REPARADO, tilde)
          : '';

    return L.divIcon({
      className: '',
      html: `<span style="position:relative;display:block;width:${tamano}px;height:${tamano}px">${imagen}${marca}</span>`,
      iconSize: [tamano, tamano],
      iconAnchor: [tamano / 2, tamano / 2],
      popupAnchor: [0, -tamano / 2], // el popup apunta al borde superior del ícono, no a su centro
    });
  }

  protected tiempoRelativo(fecha: Date): string {
    const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
    if (minutos < 1) return 'recién';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'ayer';
    return `hace ${dias} días`;
  }

  private popupHtml(bache: Bache): string {
    const estadoInfo = this.estados.find((e) => e.valor === bache.estado);
    const severidadInfo = this.severidades.find((s) => s.valor === bache.severidad);
    const colorEstado = this.colorDeBache(bache);
    const urlFoto = this.bachesService.urlFoto(bache.fotoUrl);
    const foto = urlFoto
      ? `<div style="position:relative;height:96px;border-radius:14px;overflow:hidden;margin-bottom:10px"><img src="${urlFoto}" alt="Foto del bache" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" /></div>`
      : '';

    return `
      <div style="font-family:var(--font-body);min-width:190px">
        ${foto}
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
          <div>
            <div class="disp" style="font-size:15px">${this.escapeHtml(formatearDireccion(bache))}</div>
            ${bache.barrio ? `<div style="font-size:12px;color:rgba(51,48,43,.55)">${this.escapeHtml(bache.barrio)}</div>` : ''}
          </div>
          <span style="font-size:11px;font-weight:700;color:${colorEstado}">${estadoInfo?.etiqueta ?? bache.estado}</span>
        </div>
        <div style="font-size:12.5px;color:rgba(51,48,43,.6);display:flex;flex-direction:column;gap:4px">
          <div><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${severidadInfo?.color ?? '#c2683f'};margin-right:6px;vertical-align:middle"></span>${severidadInfo?.etiqueta ?? bache.severidad}</div>
          <div>Reportado por ${this.escapeHtml(bache.usuario)}</div>
          <div>${bache.fecha.toLocaleString()}</div>
        </div>
      </div>
    `;
  }

  private escapeHtml(valor: string): string {
    const div = document.createElement('div');
    div.textContent = valor;
    return div.innerHTML;
  }
}
