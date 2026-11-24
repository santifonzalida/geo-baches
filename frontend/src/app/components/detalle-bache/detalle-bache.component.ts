// detalle-bache.component.ts
//
// Detalle de un bache (docs/design/geobaches-diseno/02-detalle), en /bache/:id como
// ruta hija del mapa: el mapa sigue detrás y destaca el punto (ver BacheSeleccionadoService).
// Incluye "¿Pasaste por acá?": cada dispositivo puede decir "Sigue ahí" o "Ya lo
// arreglaron" una vez por bache (responder de nuevo cambia la respuesta).
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import {
  ESTADOS_BACHE,
  formatearDireccion,
  nivelDe,
  ResumenConfirmacionesDispositivo,
  tiempoRelativo,
  TipoConfirmacion,
} from '../../models/bache.model';
import { BacheSeleccionadoService } from '../../services/bache-seleccionado.service';
import { BachesService } from '../../services/baches.service';
import { DispositivoService } from '../../services/dispositivo.service';
import { PanelArrastrable } from '../../ui/panel-arrastrable';

/** Alto del panel abierto en celular: igual que ALTURA_DETALLE en mapa.component.ts. */
const ALTO_ABIERTO = 493;

@Component({
  selector: 'app-detalle-bache',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './detalle-bache.component.html',
})
export class DetalleBacheComponent implements OnDestroy {
  private readonly bachesService = inject(BachesService);
  private readonly seleccionado = inject(BacheSeleccionadoService);
  private readonly dispositivo = inject(DispositivoService);

  private readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id'))), {
    initialValue: null,
  });

  protected readonly bache = computed(() => this.bachesService.baches().find((b) => b.id === this.id()) ?? null);
  /** Ya cargaron los baches y este id no está (no existe o todavía no fue aprobado). */
  protected readonly noEncontrado = computed(() => this.bachesService.cargado() && !this.bache());

  protected readonly nivel = computed(() => {
    const bache = this.bache();
    return bache ? nivelDe(bache.severidad) : null;
  });
  protected readonly etiquetaEstado = computed(
    () => ESTADOS_BACHE.find((e) => e.valor === this.bache()?.estado)?.etiqueta ?? '',
  );
  protected readonly direccion = computed(() => {
    const bache = this.bache();
    return bache ? formatearDireccion(bache) : '';
  });
  protected readonly reportado = computed(() => {
    const bache = this.bache();
    return bache ? `${tiempoRelativo(bache.fecha)} · ${bache.usuario}` : '';
  });
  protected readonly urlFoto = computed(() => this.bachesService.urlFoto(this.bache()?.fotoUrl ?? null));

  /** Celular: tocar o arrastrar el encabezado minimiza / expande el panel. */
  protected readonly panel = new PanelArrastrable(() => ALTO_ABIERTO);

  protected readonly confirmaciones = signal<ResumenConfirmacionesDispositivo | null>(null);
  protected readonly enviando = signal(false);
  protected readonly aviso = signal<string | null>(null);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  protected readonly textoConfirmaciones = computed(() => {
    const n = this.confirmaciones()?.sigue;
    if (n === undefined) return '…';
    if (n === 0) return 'Nadie todavía';
    return n === 1 ? '1 vecino' : `${n} vecinos`;
  });

  constructor() {
    effect(() => this.seleccionado.id.set(this.id()));
    effect(() => {
      const id = this.id();
      this.confirmaciones.set(null);
      this.panel.abrir(); // otro bache: el panel vuelve a abrirse
      if (!id) return;
      this.bachesService.confirmaciones(id, this.dispositivo.id).subscribe({
        next: (resumen) => this.confirmaciones.set(resumen),
        // Si falla, el detalle se sigue viendo; solo queda sin el contador.
        error: () => this.confirmaciones.set({ sigue: 0, arreglado: 0, miRespuesta: null }),
      });
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorAviso);
    this.seleccionado.id.set(null);
  }

  protected responder(tipo: TipoConfirmacion): void {
    const id = this.id();
    if (!id || this.enviando()) return;

    this.enviando.set(true);
    this.bachesService.confirmar(id, tipo, this.dispositivo.id).subscribe({
      next: (resumen) => {
        this.confirmaciones.set(resumen);
        this.enviando.set(false);
        this.mostrarAviso(
          tipo === 'sigue'
            ? '¡Gracias! Sumamos tu confirmación.'
            : '¡Gracias! Le avisamos al equipo para que lo verifique.',
        );
      },
      error: () => {
        this.enviando.set(false);
        this.mostrarAviso('No pudimos guardar tu respuesta. Intentá de nuevo.');
      },
    });
  }

  protected async compartir(): Promise<void> {
    const url = location.href;
    const datos = { title: `Bache en ${this.direccion()}`, text: 'Mirá este bache en GeoBaches', url };
    try {
      if (navigator.share) {
        await navigator.share(datos);
        return;
      }
      await navigator.clipboard.writeText(url);
      this.mostrarAviso('Copiamos el link al portapapeles.');
    } catch (e) {
      // Cancelar el menú de compartir no es un error.
      if ((e as DOMException)?.name !== 'AbortError') this.mostrarAviso('No pudimos compartir el link.');
    }
  }

  private mostrarAviso(texto: string): void {
    this.aviso.set(texto);
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), 4000);
  }
}
