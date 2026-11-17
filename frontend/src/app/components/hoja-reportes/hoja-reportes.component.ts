// hoja-reportes.component.ts
//
// Panel inferior de la pantalla del mapa (docs/design/geobaches-diseno/01-mapa-lista):
// "Reportes recientes" de la zona visible, plegable. La altura la decide MapaComponent
// (los botones flotantes se mueven con ella); acá solo se pinta el contenido.
import { Component, input, model, output } from '@angular/core';
import { Bache, formatearDireccion, nivelDe, NivelBache, tiempoRelativo } from '../../models/bache.model';

@Component({
  selector: 'app-hoja-reportes',
  standalone: true,
  templateUrl: './hoja-reportes.component.html',
})
export class HojaReportesComponent {
  readonly reportes = input.required<Bache[]>();
  readonly subtitulo = input('');
  readonly abierta = model(true);
  readonly seleccionar = output<Bache>();

  protected direccion(bache: Bache): string {
    return formatearDireccion(bache);
  }

  protected nivel(bache: Bache): NivelBache {
    return nivelDe(bache.severidad);
  }

  protected hace(bache: Bache): string {
    return tiempoRelativo(bache.fecha);
  }
}
