import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Bache, BacheDto, Direccion, EstadoBache, NuevoBache } from '../models/bache.model';

@Injectable({ providedIn: 'root' })
export class BachesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/baches`;

  private readonly _baches = signal<Bache[]>([]);
  readonly baches = this._baches.asReadonly();

  private aBache(dto: BacheDto): Bache {
    return { ...dto, fecha: new Date(dto.fecha) };
  }

  /** Baches ya aprobados: los que se muestran en el mapa público. */
  cargar(): Observable<Bache[]> {
    return this.http.get<BacheDto[]>(this.baseUrl).pipe(
      map((dtos) => dtos.map((dto) => this.aBache(dto))),
      tap((baches) => this._baches.set(baches)),
    );
  }

  /** Baches recién reportados, a la espera de revisión (no aparecen en el mapa público todavía). */
  cargarPendientes(): Observable<Bache[]> {
    return this.http
      .get<BacheDto[]>(`${this.baseUrl}/pendientes`)
      .pipe(map((dtos) => dtos.map((dto) => this.aBache(dto))));
  }

  /**
   * Crea un reporte nuevo. Arranca sin revisar: no se agrega al signal de
   * baches del mapa público hasta que alguien lo apruebe desde el panel.
   */
  agregar(nuevo: NuevoBache): Observable<Bache> {
    const formData = new FormData();
    formData.append('lat', String(nuevo.lat));
    formData.append('lng', String(nuevo.lng));
    formData.append('estado', nuevo.estado);
    formData.append('severidad', nuevo.severidad);
    formData.append('usuario', nuevo.usuario);
    if (nuevo.calle) formData.append('calle', nuevo.calle);
    if (nuevo.altura) formData.append('altura', nuevo.altura);
    if (nuevo.barrio) formData.append('barrio', nuevo.barrio);
    if (nuevo.foto) {
      formData.append('foto', nuevo.foto);
    }

    return this.http.post<BacheDto>(this.baseUrl, formData).pipe(map((dto) => this.aBache(dto)));
  }

  /** Sugiere calle/altura/barrio para unas coordenadas (el backend consulta Nominatim). */
  geocodificar(lat: number, lng: number): Observable<Direccion> {
    return this.http.get<Direccion>(`${environment.apiUrl}/geocoding/reverse`, { params: { lat, lng } });
  }

  aprobar(id: string): Observable<Bache> {
    return this.http
      .patch<BacheDto>(`${this.baseUrl}/${id}/aprobar`, {})
      .pipe(map((dto) => this.aBache(dto)));
  }

  actualizarEstado(id: string, estado: EstadoBache): Observable<Bache> {
    return this.http.patch<BacheDto>(`${this.baseUrl}/${id}/estado`, { estado }).pipe(
      map((dto) => this.aBache(dto)),
      tap((actualizado) =>
        this._baches.update((baches) =>
          baches.map((bache) => (bache.id === actualizado.id ? actualizado : bache)),
        ),
      ),
    );
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this._baches.update((baches) => baches.filter((bache) => bache.id !== id))),
    );
  }

  urlFoto(fotoUrl: string | null): string | null {
    return fotoUrl ? `${environment.apiUrl}${fotoUrl}` : null;
  }
}
