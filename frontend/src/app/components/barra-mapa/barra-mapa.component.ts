// barra-mapa.component.ts
//
// Barra flotante de la pantalla del mapa (docs/design/geobaches-diseno/01-mapa-lista):
// buscador de calle o barrio, botón "Acerca de" y botón "Filtros", que abre un dropdown
// con checkboxes de estado y de gravedad. El estado de los filtros vive en MapaComponent;
// acá se edita en vivo y "Aplicar" solo cierra el panel.
import { Component, ElementRef, computed, inject, input, model, output, signal, viewChild } from '@angular/core';
import { ESTADOS_BACHE, EstadoBache, SEVERIDADES_BACHE, SeleccionFiltros, SeveridadBache } from '../../models/bache.model';

@Component({
  selector: 'app-barra-mapa',
  standalone: true,
  templateUrl: './barra-mapa.component.html',
  host: {
    '(document:pointerdown)': 'alTocarDocumento($event)',
    '(document:keydown.escape)': 'cerrar(true)',
  },
})
export class BarraMapaComponent {
  readonly filtros = model.required<SeleccionFiltros>();
  readonly busqueda = model('');
  /** Total de baches sin reparar (sin importar los demás filtros): va al lado de esa opción. */
  readonly conteoSinReparar = input(0);
  readonly acercaDe = output<void>();
  /** "Aplicar": el mapa vuelve a la vista inicial para mostrar el resultado completo. */
  readonly aplicar = output<void>();

  protected readonly abierto = signal(false);
  /** Cantidad de casillas tildadas: el badge del botón. */
  protected readonly activos = computed(() => this.filtros().estados.length + this.filtros().niveles.length);

  protected readonly estados = ESTADOS_BACHE;
  /** Del más grave al más leve, como en el diseño. */
  protected readonly niveles = [...SEVERIDADES_BACHE].reverse();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly boton = viewChild.required<ElementRef<HTMLButtonElement>>('botonFiltros');

  protected alternarPanel(): void {
    this.abierto.update((abierto) => !abierto);
  }

  protected alternarEstado(valor: EstadoBache): void {
    this.filtros.update((f) => ({ ...f, estados: alternar(f.estados, valor) }));
  }

  protected alternarNivel(valor: SeveridadBache): void {
    this.filtros.update((f) => ({ ...f, niveles: alternar(f.niveles, valor) }));
  }

  protected alAplicar(): void {
    this.cerrar(true);
    this.aplicar.emit();
  }

  protected limpiar(): void {
    this.filtros.set({ estados: [], niveles: [] });
  }

  /** Con Escape el foco vuelve al botón, para no perderlo dentro de un panel que se ocultó. */
  protected cerrar(devolverFoco = false): void {
    if (!this.abierto()) return;
    this.abierto.set(false);
    if (devolverFoco) this.boton().nativeElement.focus();
  }

  protected alTocarDocumento(evento: PointerEvent): void {
    if (this.abierto() && !this.host.nativeElement.contains(evento.target as Node)) this.cerrar();
  }
}

function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}
