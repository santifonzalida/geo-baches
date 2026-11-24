// hoja-reportes.component.ts
//
// Panel inferior de la pantalla del mapa (docs/design/geobaches-diseno/01-mapa-lista):
// "Reportes recientes" de la zona visible, plegable tocando el encabezado (y, en celular,
// arrastrándolo). El estado y la altura viven en MapaComponent (`panel`), porque
// los botones flotantes se mueven con ella; acá se pinta el contenido y se escuchan los gestos.
import { Component, input, output } from '@angular/core';
import { PanelArrastrable } from '../../ui/panel-arrastrable';
import { Bache, formatearDireccion, nivelDe, NivelBache, tiempoRelativo } from '../../models/bache.model';

@Component({
  selector: 'app-hoja-reportes',
  standalone: true,
  templateUrl: './hoja-reportes.component.html',
})
export class HojaReportesComponent {
  readonly reportes = input.required<Bache[]>();
  readonly subtitulo = input('');
  readonly panel = input.required<PanelArrastrable>();
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
