// mapa.component.ts
//
// Pantalla principal (docs/design/geobaches-diseno/01-mapa-lista): mapa Leaflet con
// los baches aprobados, barra de búsqueda/filtros, panel "Reportes recientes" y el
// botón "Reportar bache". Se traen todos los aprobados y se filtran en pantalla.
//
// Reportar (docs/design/geobaches-diseno/03-reportar): solo desde el botón. Un pin fijo
// queda en el centro de lo que el formulario no tapa y la persona mueve el mapa hasta el
// bache; tocar el mapa lleva ese punto bajo el pin. La dirección se sugiere al soltar.
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import * as L from 'leaflet';
import { BacheSeleccionadoService } from '../../services/bache-seleccionado.service';
import { BachesService } from '../../services/baches.service';
import {
  Bache,
  COLOR_REPARADO,
  cumpleFiltros,
  ESTADOS_BACHE,
  FILTROS_POR_DEFECTO,
  formatearDireccion,
  nivelDe,
  SeveridadBache,
  SEVERIDADES_BACHE,
} from '../../models/bache.model';
import { BarraMapaComponent } from '../barra-mapa/barra-mapa.component';
import { HojaReportesComponent } from '../hoja-reportes/hoja-reportes.component';
import { PanelArrastrable } from '../../ui/panel-arrastrable';
import { environment } from '../../../environments/environment';

/** Debe coincidir con el límite del backend (baches.controller.ts). */
const TAMANO_MAX_FOTO = 5 * 1024 * 1024;
/** El servidor vuelve a procesarla (fotos.service.ts); acá se achica para no subir 12 MP por datos móviles. */
const LADO_MAX_FOTO = 1280;

/** Alturas del panel "Reportes recientes" (abierto / plegado), como en el diseño. */
const ALTURA_HOJA_ABIERTA = 290;
const ALTURA_HOJA_CERRADA = 88;
/** Alto del panel de detalle en celular y ancho de las columnas en pantallas anchas (ver los templates). */
const ALTURA_DETALLE = 493;
const ANCHO_COLUMNA = 400 + 12;
/** Desde este ancho (md de Tailwind) los paneles van en una columna a la izquierda. */
const ANCHO_ESCRITORIO = 768;
/** Alto del formulario de reporte en celular (sin dejar menos de MAPA_MINIMO_CON_FORM de mapa). */
const ALTURA_FORM = 460;
const MAPA_MINIMO_CON_FORM = 180;
/** La punta del pin está 46 px por debajo de su borde superior (ver template). */
const ALTO_PIN = 46;
/** Se espera a que el mapa quede quieto antes de pedir la dirección (Nominatim pide ≤ 1 req/s). */
const ESPERA_GEOCODIFICAR = 700;
/** Con menos zoom que esto el punto es demasiado impreciso: se pide acercar. */
const ZOOM_PRECISO = 15;
/** Al cerrar un detalle se aleja al menos hasta acá, para volver a ver los puntos de alrededor. */
const ZOOM_VISTA_GENERAL = 14;
/** Último zoom que sirve cada mapa base: CARTO responde 403 desde el 19 y OpenStreetMap llega a 19. */
const ZOOM_MAXIMO_CARTO = 18;
const ZOOM_MAXIMO_OSM = 19;
const CLAVE_USUARIO = 'geobaches-usuario';
/**
 * Pantalla de carga de los baches: aparece solo si la respuesta tarda más que RETRASO
 * (así no parpadea cuando el backend contesta rápido), una vez visible queda al menos
 * MINIMO (para que no sea un destello) y al irse se desvanece en SALIDA.
 */
const CARGA_RETRASO = 300;
const CARGA_MINIMO = 500;
const CARGA_SALIDA = 250;

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterOutlet, BarraMapaComponent, HojaReportesComponent],
  templateUrl: './mapa.component.html',
  host: { '(window:resize)': 'medir()' },
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private readonly bachesService = inject(BachesService);
  private readonly router = inject(Router);
  private readonly seleccionado = inject(BacheSeleccionadoService);
  private map!: L.Map;
  private readonly marcadores = new Map<string, L.Marker>();
  private marcadorUbicacion: L.Marker | undefined;
  /** Id del marcador que hoy tiene el ícono destacado. */
  private destacadoId: string | null = null;
  /** Zoom que tenía el mapa antes de abrir el detalle (null si se entró directo por link). */
  private zoomAntesDelDetalle: number | null = null;
  /** Vista del mapa antes de empezar un reporte: al cerrarlo se vuelve ahí. */
  private vistaAntesDelReporte: { centro: L.LatLng; zoom: number } | null = null;
  /** Dónde estaba el pin la última vez: si se mueve (se pliega el formulario), el mapa lo acompaña. */
  private pinAnterior: L.Point | null = null;
  private temporizadorGeocodificar: ReturnType<typeof setTimeout> | undefined;

  /** Tamaño del contenedor del mapa (la pantalla). */
  private readonly tamano = signal({ ancho: window.innerWidth, alto: window.innerHeight });
  private readonly esEscritorio = computed(() => this.tamano().ancho >= ANCHO_ESCRITORIO);
  protected readonly zoom = signal(13);
  /** El mapa se está moviendo: el pin se levanta un poco. */
  protected readonly moviendo = signal(false);

  protected readonly severidades = SEVERIDADES_BACHE;
  protected readonly baches = this.bachesService.baches;

  // Filtros de la barra
  /** Lo tildado en el dropdown "Filtros" (estados y niveles por separado). */
  protected readonly filtros = signal(FILTROS_POR_DEFECTO);
  protected readonly busqueda = signal('');
  /** Total de baches sin reparar, sin importar los otros filtros: el conteo del dropdown. */
  protected readonly cantidadSinReparar = computed(
    () => this.baches().filter((bache) => bache.estado === 'reportado').length,
  );

  /** "Reportes recientes": se pliega o abre tocando el encabezado (y arrastrándolo, en celular). */
  protected readonly panelHoja = new PanelArrastrable(() => ALTURA_HOJA_ABIERTA, {
    altoMinimizado: ALTURA_HOJA_CERRADA,
    tocarEnEscritorio: true,
  });
  /** Ruta actual: las rutas hijas (/bache/:id, /acerca) abren un panel encima del mapa. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  /** Hay un panel abierto (detalle o "Acerca de"): se esconden la barra, la lista y los botones flotantes. */
  protected readonly panelAbierto = computed(
    () => this.seleccionado.id() !== null || this.url().startsWith('/acerca'),
  );
  /** Lo que se ve del mapa; null hasta que el mapa existe. */
  private readonly limites = signal<L.LatLngBounds | null>(null);

  protected readonly visibles = computed(() => {
    const filtros = { ...this.filtros(), busqueda: this.busqueda() };
    return this.baches().filter((bache) => cumpleFiltros(bache, filtros));
  });

  /** Los visibles dentro de la zona del mapa, más nuevo primero: la lista del panel. */
  protected readonly enZona = computed(() => {
    const limites = this.limites();
    return this.visibles()
      .filter((bache) => !limites || limites.contains([bache.lat, bache.lng]))
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  });

  protected readonly subtituloHoja = computed(() => {
    const cantidad = this.enZona().length;
    // Con un solo estado tildado se nombra ("N sin reparar"); si no, "N reportes".
    const { estados } = this.filtros();
    const estado = estados.length === 1 ? ESTADOS_BACHE.find((e) => e.valor === estados[0]) : undefined;
    if (estado) return `${cantidad} ${(cantidad === 1 ? estado.etiqueta : estado.filtro).toLowerCase()} en esta zona`;
    return `${cantidad} ${cantidad === 1 ? 'reporte' : 'reportes'} en esta zona`;
  });

  // Reporte
  protected readonly reportando = signal(false);
  protected readonly nivelReporte = signal<SeveridadBache>('media');
  /** El punto bajo el pin: el que se va a reportar. */
  protected readonly punto = signal<L.LatLng | null>(null);
  protected readonly editandoDireccion = signal(false);
  protected readonly fotoPreview = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly buscandoDireccion = signal(false);
  protected readonly procesandoFoto = signal(false);

  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  /** Pantalla de carga de los baches: oculta, visible, desvaneciéndose o con error (y "Reintentar"). */
  protected readonly carga = signal<'oculta' | 'visible' | 'saliendo' | 'error'>('oculta');
  private cargaVisibleDesde = 0;
  private temporizadorCarga: ReturnType<typeof setTimeout> | undefined;

  /** Alto que ocupa el panel inferior: los botones flotantes se acomodan arriba de él. */
  protected readonly alturaHoja = computed(() =>
    this.reportando() ? 0 : this.panelHoja.alto(),
  );

  protected readonly alturaFormulario = computed(() =>
    Math.min(ALTURA_FORM, this.tamano().alto - MAPA_MINIMO_CON_FORM),
  );
  /** Celular: tocar o arrastrar el encabezado del formulario lo minimiza (deja más mapa para ubicar el punto) o lo expande. */
  protected readonly panelReporte = new PanelArrastrable(() => this.alturaFormulario());

  /** Punta del pin, en px del mapa: centrada en lo que el formulario no tapa (corrida para que el pin entero quede al medio). */
  protected readonly posicionPin = computed(() => {
    const { ancho, alto } = this.tamano();
    return this.esEscritorio()
      ? L.point(ANCHO_COLUMNA + (ancho - ANCHO_COLUMNA) / 2, alto / 2 + ALTO_PIN / 2)
      : L.point(ancho / 2, (alto - this.panelReporte.altoReposo()) / 2 + ALTO_PIN / 2);
  });

  /** El cartel va arriba del pin, sin pegarse al borde. */
  protected readonly topAyuda = computed(() => Math.max(14, this.posicionPin().y - ALTO_PIN - 54));
  protected readonly textoAyuda = computed(() =>
    this.zoom() < ZOOM_PRECISO ? 'Acercá el mapa hasta el bache' : 'Mové el mapa hasta el bache',
  );

  protected usuario = '';
  protected calle = '';
  protected altura = '';
  protected barrio = '';
  private fotoSeleccionada: File | undefined;

  constructor() {
    // Los marcadores siguen a los filtros: se agregan o quitan del mapa, no se recrean.
    effect(() => this.sincronizarMarcadores(this.visibles()));
    // Al abrir/cerrar un detalle: destacar ese punto, atenuar el resto y centrarlo.
    effect(() => {
      const id = this.seleccionado.id();
      const bache = this.baches().find((b) => b.id === id) ?? null;
      untracked(() => this.destacar(bache));
    });
    // Si el pin cambia de lugar (se pliega el formulario, gira la pantalla), el mapa se corre igual: el punto no cambia.
    effect(() => {
      const pin = this.posicionPin();
      untracked(() => this.acompanarPin(pin));
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.cargarBachesExistentes();

    this.medir();
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorAviso);
    clearTimeout(this.temporizadorGeocodificar);
    clearTimeout(this.temporizadorCarga);
    this.map?.remove();
  }

  /** El mapa ocupa toda la pantalla: alcanza con volver a medir cuando cambia la ventana. */
  protected medir(): void {
    const contenedor: HTMLElement = this.mapContainer.nativeElement;
    if (contenedor.clientWidth && contenedor.clientHeight) {
      this.tamano.set({ ancho: contenedor.clientWidth, alto: contenedor.clientHeight });
    }
  }

  private initMap(): void {
    // Centrado en Córdoba como ejemplo, ajustá a tu zona
    const capa = this.capaBase();
    // El zoom del mapa no pasa del último que el mapa base puede servir (más allá, mosaicos con error).
    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: false, maxZoom: capa.options.maxZoom }).setView(
      [-31.4201, -64.1888],
      12,
    );

    capa.addTo(this.map);

    this.limites.set(this.map.getBounds());
    this.zoom.set(this.map.getZoom());
    this.map.on('movestart', () => this.moviendo.set(true));
    this.map.on('moveend', () => {
      this.moviendo.set(false);
      this.limites.set(this.map.getBounds());
      this.zoom.set(this.map.getZoom());
      if (this.reportando()) this.actualizarPunto();
    });
    // Reportando, tocar el mapa lleva ese lugar bajo el pin (y acerca, si está muy lejos para marcar el punto).
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.reportando()) {
        this.centrarEn(e.latlng, Math.max(this.map.getZoom(), ZOOM_PRECISO + 2), this.posicionPin());
      }
    });
  }

  /**
   * Mapa base CARTO Positron: claro y apagado, para que resalten los marcadores de colores.
   * CARTO pide una clave en cada mosaico (sin ella los sirve con una marca de agua), así que
   * sin clave configurada se usa el mapa estándar de OpenStreetMap.
   */
  private capaBase(): L.TileLayer {
    const osm = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const clave = environment.cartoApiKey;
    if (!clave) {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: ZOOM_MAXIMO_OSM, attribution: osm });
    }
    // {r} pide mosaicos @2x en pantallas de alta densidad.
    return L.tileLayer(
      `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(clave)}`,
      { maxZoom: ZOOM_MAXIMO_CARTO, attribution: `${osm} &copy; <a href="https://carto.com/attributions">CARTO</a>` },
    );
  }

  /** @param inmediato mostrar la pantalla de carga ya (al reintentar: la persona tocó el botón). */
  private cargarBachesExistentes(inmediato = false): void {
    clearTimeout(this.temporizadorCarga);
    let termino = false;
    if (inmediato) this.mostrarCarga();
    else {
      this.carga.set('oculta');
      this.temporizadorCarga = setTimeout(() => !termino && this.mostrarCarga(), CARGA_RETRASO);
    }

    this.bachesService.cargar().subscribe({
      next: (baches) => {
        termino = true;
        baches.forEach((bache) => this.registrarMarcador(bache));
        this.sincronizarMarcadores(this.visibles());
        this.ocultarCarga();
      },
      error: () => {
        termino = true;
        clearTimeout(this.temporizadorCarga);
        this.carga.set('error');
      },
    });
  }

  protected reintentarCarga(): void {
    this.cargarBachesExistentes(true);
  }

  /** Cerrar el aviso de error y usar el mapa igual (sin baches). */
  protected descartarErrorCarga(): void {
    this.carga.set('oculta');
  }

  private mostrarCarga(): void {
    this.carga.set('visible');
    this.cargaVisibleDesde = Date.now();
  }

  /** Respeta el tiempo mínimo en pantalla y después la desvanece. */
  private ocultarCarga(): void {
    clearTimeout(this.temporizadorCarga);
    if (this.carga() !== 'visible') {
      this.carga.set('oculta'); // nunca llegó a mostrarse
      return;
    }
    const falta = Math.max(0, CARGA_MINIMO - (Date.now() - this.cargaVisibleDesde));
    this.temporizadorCarga = setTimeout(() => {
      this.carga.set('saliendo');
      this.temporizadorCarga = setTimeout(() => this.carga.set('oculta'), CARGA_SALIDA);
    }, falta);
  }

  private sincronizarMarcadores(visibles: Bache[]): void {
    if (!this.map) return;
    const ids = new Set(visibles.map((bache) => bache.id));
    // El bache del detalle se ve aunque los filtros lo escondan (ej. un link compartido a uno arreglado).
    const seleccionado = this.seleccionado.id();
    if (seleccionado) ids.add(seleccionado);
    this.marcadores.forEach((marker, id) => {
      const enMapa = this.map.hasLayer(marker);
      if (ids.has(id) && !enMapa) marker.addTo(this.map);
      if (!ids.has(id) && enMapa) this.map.removeLayer(marker);
    });
  }

  protected irAMiUbicacion(): void {
    if (!navigator.geolocation) {
      this.avisarError('Tu navegador no permite obtener la ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const punto = L.latLng(coords.latitude, coords.longitude);
        this.marcadorUbicacion?.remove();
        this.marcadorUbicacion = L.marker(punto, { icon: this.iconoUbicacion(), interactive: false }).addTo(this.map);
        if (this.reportando()) this.centrarEn(punto, 17, this.posicionPin());
        else this.map.flyTo(punto, 16, { duration: 0.6 });
      },
      (fallo) =>
        this.avisarError(
          fallo.code === fallo.PERMISSION_DENIED
            ? 'Para usar tu ubicación, permití el acceso desde el navegador.'
            : 'No pudimos obtener tu ubicación. Intentá de nuevo.',
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  protected mostrarAcercaDe(): void {
    this.router.navigate(['/acerca']);
  }

  private avisarError(texto: string): void {
    this.error.set(texto);
    setTimeout(() => this.error() === texto && this.error.set(null), 5000);
  }

  protected irAlReporte(bache: Bache): void {
    this.router.navigate(['/bache', bache.id]);
  }

  /** Destaca el bache del detalle (o deja todo normal con null) y lo centra en la parte visible del mapa. */
  private destacar(bache: Bache | null): void {
    if (!this.map) return;

    const anterior = this.destacadoId ? this.baches().find((b) => b.id === this.destacadoId) : undefined;
    if (anterior && anterior.id !== bache?.id) {
      this.marcadores.get(anterior.id)?.setIcon(this.crearIcono(anterior)).setZIndexOffset(0);
    }
    // Se abre un detalle desde el mapa: recordar el zoom para el regreso.
    if (bache && !this.destacadoId) this.zoomAntesDelDetalle = this.map.getZoom();
    this.destacadoId = bache?.id ?? null;

    this.marcadores.forEach((marker, id) => marker.setOpacity(!bache || id === bache.id ? 1 : 0.45));
    this.sincronizarMarcadores(this.visibles());
    if (!bache) {
      if (anterior) this.alejarAlCerrar(anterior);
      return;
    }

    this.marcadores.get(bache.id)?.setIcon(this.crearIcono(bache, true)).setZIndexOffset(1000);
    // En el centro de lo que el panel de detalle no tapa.
    const { ancho, alto } = this.tamano();
    const destino = this.esEscritorio()
      ? L.point(ANCHO_COLUMNA + (ancho - ANCHO_COLUMNA) / 2, alto / 2)
      : L.point(ancho / 2, (alto - ALTURA_DETALLE) / 2);
    this.centrarEn(L.latLng(bache.lat, bache.lng), Math.max(this.map.getZoom(), 16), destino);
  }

  /**
   * Al volver al mapa: alejar para ver los puntos de alrededor (a la vista general, o más
   * lejos si así estaba antes de abrir el detalle), con el bache recién visto en el centro
   * de lo que el panel "Reportes recientes" no tapa.
   */
  private alejarAlCerrar(bache: Bache): void {
    const zoom = Math.min(this.zoomAntesDelDetalle ?? ZOOM_VISTA_GENERAL, ZOOM_VISTA_GENERAL);
    this.zoomAntesDelDetalle = null;
    const { ancho, alto } = this.tamano();
    const destino = this.esEscritorio()
      ? L.point(ancho / 2, alto / 2)
      : L.point(ancho / 2, (alto - this.alturaHoja()) / 2);
    this.centrarEn(L.latLng(bache.lat, bache.lng), zoom, destino);
  }

  /** flyTo, pero dejando `punto` en el lugar `destino` (px del contenedor) en vez de en el centro. */
  private centrarEn(punto: L.LatLng, zoom: number, destino: L.Point): void {
    const desplazamiento = this.map.getSize().divideBy(2).subtract(destino);
    const centro = this.map.unproject(this.map.project(punto, zoom).add(desplazamiento), zoom);
    this.map.flyTo(centro, zoom, { duration: 0.6 });
  }

  // --- Reporte -------------------------------------------------------------

  protected abrirReporte(): void {
    this.vistaAntesDelReporte = { centro: this.map.getCenter(), zoom: this.map.getZoom() };
    this.usuario = this.leerUsuarioGuardado();
    this.calle = '';
    this.altura = '';
    this.barrio = '';
    this.nivelReporte.set('media');
    this.fotoSeleccionada = undefined;
    this.fotoPreview.set(null);
    this.punto.set(null);
    this.error.set(null);
    this.editandoDireccion.set(false);
    this.panelReporte.abrir();
    this.reportando.set(true);
    // El pin aparece donde corresponde a este estado del formulario: no hay que correr el mapa por eso.
    this.pinAnterior = this.posicionPin();

    // Si ya sabemos dónde está la persona, arrancamos ahí; si no, en lo que hoy esté bajo el pin.
    const ubicacion = this.marcadorUbicacion?.getLatLng();
    if (ubicacion) this.centrarEn(ubicacion, Math.max(this.map.getZoom(), 17), this.pinAnterior);
    else this.actualizarPunto();
  }

  /** Mueve el mapa lo mismo que se movió el pin, para que siga apuntando al mismo lugar. */
  private acompanarPin(pin: L.Point): void {
    const anterior = this.pinAnterior;
    this.pinAnterior = pin;
    if (!this.map || !this.reportando() || !anterior) return;
    const delta = anterior.subtract(pin);
    if (delta.x || delta.y) this.map.panBy(delta, { duration: 0.25 });
  }

  /** Toma el lugar bajo el pin como punto del reporte y, cuando el mapa queda quieto, sugiere la dirección. */
  private actualizarPunto(): void {
    const latlng = this.map.containerPointToLatLng(this.posicionPin());
    const anterior = this.punto();
    if (anterior && anterior.distanceTo(latlng) < 2) return; // solo se reacomodó el pin

    this.punto.set(latlng);
    this.calle = '';
    this.altura = '';
    this.barrio = '';
    this.buscandoDireccion.set(true);
    clearTimeout(this.temporizadorGeocodificar);
    this.temporizadorGeocodificar = setTimeout(() => this.autocompletarDireccion(latlng), ESPERA_GEOCODIFICAR);
  }

  /** Sugiere calle/altura/barrio; si la persona ya escribió algo en un campo, no se lo pisa. */
  private autocompletarDireccion(latlng: L.LatLng): void {
    this.bachesService.geocodificar(latlng.lat, latlng.lng).subscribe({
      next: (direccion) => {
        if (this.punto() !== latlng) return; // el pin ya apunta a otro lugar
        this.calle ||= direccion.calle ?? '';
        this.altura ||= direccion.altura ?? '';
        this.barrio ||= direccion.barrio ?? '';
        this.buscandoDireccion.set(false);
      },
      error: () => {
        if (this.punto() === latlng) this.buscandoDireccion.set(false);
      },
    });
  }

  /** El nombre se recuerda en este navegador para no tener que escribirlo en cada reporte. */
  private leerUsuarioGuardado(): string {
    try {
      return localStorage.getItem(CLAVE_USUARIO) ?? '';
    } catch {
      return '';
    }
  }

  private guardarUsuario(usuario: string): void {
    try {
      localStorage.setItem(CLAVE_USUARIO, usuario);
    } catch {
      // sin almacenamiento (modo privado): se vuelve a pedir la próxima vez
    }
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
    const latlng = this.punto();
    if (!latlng || !this.usuario.trim()) return;

    this.guardando.set(true);
    this.error.set(null);

    this.bachesService
      .agregar({
        lat: latlng.lat,
        lng: latlng.lng,
        // Un reporte vecinal siempre arranca "sin reparar"; el avance de obra lo mueve otro flujo (inspector).
        estado: 'reportado',
        severidad: this.nivelReporte(),
        usuario: this.usuario.trim(),
        calle: this.calle.trim(),
        altura: this.altura.trim(),
        barrio: this.barrio.trim(),
        foto: this.fotoSeleccionada,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.guardarUsuario(this.usuario.trim());
          this.cancelarReporte();
          this.mostrarAviso('¡Gracias! Tu reporte se envió y se va a mostrar en el mapa cuando sea revisado.');
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

  private mostrarAviso(texto: string): void {
    this.aviso.set(texto);
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), 5000);
  }

  protected cancelarReporte(): void {
    const preview = this.fotoPreview();
    if (preview) URL.revokeObjectURL(preview);

    clearTimeout(this.temporizadorGeocodificar);
    this.reportando.set(false);
    this.punto.set(null);
    this.fotoPreview.set(null);
    this.buscandoDireccion.set(false);

    // Volver a donde estaba el mapa antes de reportar (para ubicar el punto se suele acercar mucho).
    const vista = this.vistaAntesDelReporte;
    this.vistaAntesDelReporte = null;
    if (vista) this.map.flyTo(vista.centro, vista.zoom, { duration: 0.6 });
  }

  // --- Marcadores ----------------------------------------------------------

  /** Crea el marcador (tocarlo abre el detalle); lo agrega al mapa sincronizarMarcadores según los filtros. */
  private registrarMarcador(bache: Bache): void {
    const marker = L.marker([bache.lat, bache.lng], {
      icon: this.crearIcono(bache),
      title: `${nivelDe(bache.severidad).etiqueta} en ${formatearDireccion(bache)}`,
    });
    marker.on('click', () => {
      if (!this.reportando()) this.irAlReporte(bache);
    });
    this.marcadores.set(bache.id, marker);
  }

  /**
   * Círculo con el número de nivel (1/2/3) y el color del diseño; "arreglado" pasa a
   * verde con un tilde en lugar del número.
   * Destacado (el del detalle abierto): más grande y con un anillo pulsante del mismo color.
   */
  private crearIcono(bache: Bache, destacado = false): L.DivIcon {
    const tamano = destacado ? 40 : 32;
    const nivel = nivelDe(bache.severidad);
    const arreglado = bache.estado === 'reparado';
    const fondo = arreglado ? COLOR_REPARADO : nivel.color;
    const tinta = arreglado ? '#FFFFFF' : nivel.tinta;
    const contenido = arreglado
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>'
      : String(nivel.nivel);

    const circulo = `<span style="position:relative;width:${tamano}px;height:${tamano}px;border-radius:50%;background:${fondo};border:3px solid #FFFFFF;box-shadow:0 ${destacado ? '3px 10px rgba(0,0,0,.35)' : '2px 6px rgba(0,0,0,.3)'};box-sizing:border-box;color:${tinta};font:700 ${destacado ? 16 : 13}px 'DM Sans',system-ui,sans-serif;display:flex;align-items:center;justify-content:center">${contenido}</span>`;
    // Destacado: un anillo pulsante del color del círculo (.marcador-pulso-fuerte, barrio.css),
    // sin halo fijo de fondo. El contenedor de 58 px es la base de la que crece el anillo.
    const base = 58;
    const html = destacado
      ? `<span style="position:relative;width:${base}px;height:${base}px;border-radius:50%;display:flex;align-items:center;justify-content:center;--color-marcador:${fondo}"><span class="marcador-pulso-fuerte"></span>${circulo}</span>`
      : circulo;
    const lado = destacado ? base : tamano;

    return L.divIcon({ className: '', html, iconSize: [lado, lado], iconAnchor: [lado / 2, lado / 2] });
  }

  /** Punto azul con halo, como en el diseño. */
  private iconoUbicacion(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: '<span style="width:28px;height:28px;border-radius:50%;background:rgba(43,108,214,.18);display:flex;align-items:center;justify-content:center"><span style="width:14px;height:14px;border-radius:50%;background:#2B6CD6;border:3px solid #FFFFFF;box-sizing:border-box"></span></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }
}
