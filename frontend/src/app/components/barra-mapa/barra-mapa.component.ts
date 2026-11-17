// barra-mapa.component.ts
//
// Barra flotante de la pantalla del mapa (docs/design/geobaches-diseno/01-mapa-lista):
// buscador de calle o barrio, botón "Acerca de" y chips de filtro (un estado a la
// vez + un nivel opcional). El estado de los filtros vive en MapaComponent.
import { Component, input, model, output } from '@angular/core';
import { ESTADOS_BACHE, EstadoBache, SEVERIDADES_BACHE, SeveridadBache } from '../../models/bache.model';

@Component({
  selector: 'app-barra-mapa',
  standalone: true,
  templateUrl: './barra-mapa.component.html',
})
export class BarraMapaComponent {
  readonly estado = model.required<EstadoBache>();
  readonly nivel = model<SeveridadBache | null>(null);
  readonly busqueda = model('');
  /** Cuántos baches cumplen los filtros: se muestra en el chip de estado activo. */
  readonly conteo = input(0);
  readonly acercaDe = output<void>();

  protected readonly estados = ESTADOS_BACHE;
  /** Del más grave al más leve, como en el diseño. */
  protected readonly niveles = [...SEVERIDADES_BACHE].reverse();

  protected alternarNivel(valor: SeveridadBache): void {
    this.nivel.update((actual) => (actual === valor ? null : valor));
  }
}
