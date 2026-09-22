export type EstadoBache = 'reportado' | 'en-reparacion' | 'reparado';
export type SeveridadBache = 'baja' | 'media' | 'alta';

export interface Bache {
  id: string;
  lat: number;
  lng: number;
  estado: EstadoBache;
  severidad: SeveridadBache;
  usuario: string;
  fecha: Date;
  fotoUrl: string | null;
  revisado: boolean;
  calle: string | null;
  altura: string | null;
  barrio: string | null;
}

/** Forma cruda que devuelve la API (fecha como string ISO). */
export interface BacheDto {
  id: string;
  lat: number;
  lng: number;
  estado: EstadoBache;
  severidad: SeveridadBache;
  usuario: string;
  fecha: string;
  fotoUrl: string | null;
  revisado: boolean;
  calle: string | null;
  altura: string | null;
  barrio: string | null;
}

export interface NuevoBache {
  lat: number;
  lng: number;
  estado: EstadoBache;
  severidad: SeveridadBache;
  usuario: string;
  calle?: string;
  altura?: string;
  barrio?: string;
  foto?: File;
}

export interface Direccion {
  calle: string | null;
  altura: string | null;
  barrio: string | null;
}

/** "Calle 1234" (o solo la calle); si no hay dirección cargada, las coordenadas. */
export function formatearDireccion(b: Pick<Bache, 'calle' | 'altura' | 'barrio' | 'lat' | 'lng'>): string {
  const via = [b.calle, b.altura].filter(Boolean).join(' ');
  return via || `${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}`;
}

/** Voz "barrio": cuando el estado es reparado, el verde gana por sobre el color de severidad. */
export const COLOR_REPARADO = '#4f8a5b';

export const ESTADOS_BACHE: { valor: EstadoBache; etiqueta: string }[] = [
  { valor: 'reportado', etiqueta: 'Sin reparar' },
  { valor: 'en-reparacion', etiqueta: 'En obra' },
  { valor: 'reparado', etiqueta: 'Listo' },
];

/** `icono`: triángulo de advertencia (public/assets/icons) que marca el punto en el mapa según la criticidad. */
export const SEVERIDADES_BACHE: { valor: SeveridadBache; etiqueta: string; color: string; icono: string }[] = [
  { valor: 'baja', etiqueta: 'Molesta', color: '#dda13c', icono: 'assets/icons/leve.svg' },
  { valor: 'media', etiqueta: 'Rompe autos', color: '#c2683f', icono: 'assets/icons/moderado.svg' },
  { valor: 'alta', etiqueta: 'Peligrosa', color: '#a6402a', icono: 'assets/icons/critico.svg' },
];
