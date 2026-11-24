// panel-arrastrable.ts
//
// Panel inferior (celular) que se minimiza o expande tocando o arrastrando su encabezado.
// Minimizado queda a la vista solo el encabezado; mientras se arrastra, el panel sigue al
// dedo y al soltar se acomoda según hacia dónde fue el gesto. En pantallas anchas no hace
// nada: ahí los paneles son columnas de alto fijo.
//
// Uso en el template (ver detalle-bache y el formulario de reporte en mapa):
//   <section [style.height.px]="panel.alto()" [class]="panel.arrastre() === null ? 'transition-[height] …' : ''">
//     <div #encabezado class="touch-none …"
//          (pointerdown)="panel.empezarArrastre($event, encabezado)" (pointermove)="panel.arrastrar($event)"
//          (pointerup)="panel.soltar($event)" (pointercancel)="panel.soltar($event)"
//          (click)="panel.alTocarEncabezado(encabezado)">
import { Signal, computed, signal } from '@angular/core';

/** Cuánto hay que mover el dedo para que cuente como arrastre y no como toque. */
const UMBRAL_ARRASTRE = 6;
/** Arrastrando más que esto hacia abajo/arriba, al soltar se minimiza/expande. */
const UMBRAL_DECISION = 40;
const ANCHO_ESCRITORIO = 768;

export class PanelArrastrable {
  readonly minimizado = signal(false);
  /** Alto mientras se arrastra (null si no se está arrastrando: ahí conviene animar). */
  readonly arrastre = signal<number | null>(null);
  private readonly altoEncabezado = signal(150);

  /** Alto en reposo: abierto o minimizado. */
  readonly altoReposo: Signal<number>;
  /** Alto a mostrar: el del arrastre en curso, o el de reposo. */
  readonly alto: Signal<number>;

  private inicio: { y: number; alto: number; puntero: number } | null = null;
  /** El gesto actual ya movió el panel: el click que sigue no tiene que alternarlo. */
  private huboArrastre = false;
  private altoFijo = false;
  private readonly tocarEnEscritorio: boolean;

  /**
   * @param altoAbierto alto del panel abierto (puede depender de signals, como el tamaño de la pantalla).
   * @param opciones.altoMinimizado alto fijo minimizado; si no se pasa, se usa el alto del encabezado.
   * @param opciones.tocarEnEscritorio tocar el encabezado también alterna en escritorio (arrastrar, no).
   */
  constructor(
    private readonly altoAbierto: () => number,
    { altoMinimizado, tocarEnEscritorio = false }: { altoMinimizado?: number; tocarEnEscritorio?: boolean } = {},
  ) {
    this.tocarEnEscritorio = tocarEnEscritorio;
    if (altoMinimizado !== undefined) {
      this.altoEncabezado.set(altoMinimizado);
      this.altoFijo = true;
    }
    this.altoReposo = computed(() => (this.minimizado() ? this.altoEncabezado() : altoAbierto()));
    this.alto = computed(() => this.arrastre() ?? this.altoReposo());
  }

  /** Vuelve a abrirse (por ejemplo, al mostrar otro contenido). */
  abrir(): void {
    this.minimizado.set(false);
    this.arrastre.set(null);
    this.inicio = null;
  }

  /** Tocar el encabezado (en escritorio, solo si se pidió `tocarEnEscritorio`). */
  alTocarEncabezado(encabezado: HTMLElement): void {
    if (esEscritorio() && !this.tocarEnEscritorio) return;
    this.medir(encabezado);
    this.alternar();
  }

  /** Para un botón propio (ej. un chevron), que también funciona en escritorio. */
  alternar(): void {
    if (this.huboArrastre) {
      this.huboArrastre = false; // el click que sigue a un arrastre no cuenta
      return;
    }
    this.minimizado.update((minimizado) => !minimizado);
  }

  empezarArrastre(evento: PointerEvent, encabezado: HTMLElement): void {
    if (esEscritorio() || (evento.pointerType === 'mouse' && evento.button !== 0)) return;
    this.medir(encabezado);
    this.inicio = { y: evento.clientY, alto: this.alto(), puntero: evento.pointerId };
    this.huboArrastre = false;
  }

  /** El panel sigue al dedo, entre minimizado y abierto. */
  arrastrar(evento: PointerEvent): void {
    const inicio = this.inicio;
    if (!inicio || evento.pointerId !== inicio.puntero) return;
    const recorrido = evento.clientY - inicio.y;
    if (!this.huboArrastre) {
      if (Math.abs(recorrido) < UMBRAL_ARRASTRE) return;
      this.huboArrastre = true;
      (evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId);
    }
    this.arrastre.set(Math.min(this.altoAbierto(), Math.max(this.altoEncabezado(), inicio.alto - recorrido)));
  }

  /** Al soltar: según hacia dónde fue el gesto; si fue corto, a la posición más cercana. */
  soltar(evento: PointerEvent): void {
    const inicio = this.inicio;
    this.inicio = null;
    if (!inicio || !this.huboArrastre) return; // fue un toque: lo resuelve alTocarEncabezado

    const recorrido = evento.type === 'pointercancel' ? 0 : evento.clientY - inicio.y;
    const alto = this.arrastre() ?? inicio.alto;
    this.arrastre.set(null);
    if (recorrido > UMBRAL_DECISION) this.minimizado.set(true);
    else if (recorrido < -UMBRAL_DECISION) this.minimizado.set(false);
    else this.minimizado.set(alto < (this.altoEncabezado() + this.altoAbierto()) / 2);
  }

  /** Minimizado queda solo el encabezado (su alto depende, por ejemplo, de si la dirección ocupa una o dos líneas). */
  private medir(encabezado: HTMLElement): void {
    if (!this.altoFijo && encabezado.offsetHeight) this.altoEncabezado.set(encabezado.offsetHeight);
  }
}

function esEscritorio(): boolean {
  return window.matchMedia(`(min-width: ${ANCHO_ESCRITORIO}px)`).matches;
}
