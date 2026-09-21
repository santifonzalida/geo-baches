import { Injectable, Logger } from '@nestjs/common';

export interface Direccion {
  calle: string | null;
  altura: string | null;
  barrio: string | null;
}

interface NominatimResponse {
  address?: Record<string, string>;
}

const DIRECCION_VACIA: Direccion = { calle: null, altura: null, barrio: null };

/**
 * Geocodificación inversa con Nominatim (OSM). Su política de uso exige
 * identificar la app con User-Agent y no pasar de ~1 request/segundo: por eso
 * la consulta sale del servidor y se cachea por coordenada redondeada.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<string, Direccion>();

  async reverse(lat: number, lng: number): Promise<Direccion> {
    const clave = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cacheada = this.cache.get(clave);
    if (cacheada) return cacheada;

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18` +
      `&accept-language=es&lat=${lat}&lon=${lng}`;

    try {
      const respuesta = await fetch(url, {
        headers: { 'User-Agent': 'geo-baches-app/1.0 (reporte vecinal de baches)' },
        signal: AbortSignal.timeout(5000),
      });
      if (!respuesta.ok) throw new Error(`Nominatim respondió ${respuesta.status}`);

      const { address } = (await respuesta.json()) as NominatimResponse;
      const direccion: Direccion = {
        calle: address?.road ?? address?.pedestrian ?? address?.footway ?? null,
        altura: address?.house_number ?? null,
        barrio:
          address?.neighbourhood ?? address?.suburb ?? address?.quarter ?? address?.city_district ?? null,
      };
      this.cache.set(clave, direccion);
      return direccion;
    } catch (error) {
      // Autocompletar es una ayuda: si falla, el formulario se carga a mano.
      this.logger.warn(`No se pudo geocodificar ${clave}: ${(error as Error).message}`);
      return DIRECCION_VACIA;
    }
  }
}
