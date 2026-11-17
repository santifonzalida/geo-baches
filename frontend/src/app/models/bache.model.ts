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

/** Respuesta de un vecino en el detalle: "Sigue ahí" / "Ya lo arreglaron". */
export type TipoConfirmacion = 'sigue' | 'arreglado';

export interface ResumenConfirmaciones {
  sigue: number;
  arreglado: number;
}

export interface ResumenConfirmacionesDispositivo extends ResumenConfirmaciones {
  miRespuesta: TipoConfirmacion | null;
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

/** Cuando el estado es reparado, el verde gana por sobre el color del nivel. */
export const COLOR_REPARADO = '#3F6E4A';

/** `filtro`: como se lee en los chips del mapa ("Arreglados", en plural). */
export const ESTADOS_BACHE: { valor: EstadoBache; etiqueta: string; filtro: string }[] = [
  { valor: 'reportado', etiqueta: 'Sin reparar', filtro: 'Sin reparar' },
  { valor: 'en-reparacion', etiqueta: 'En obra', filtro: 'En obra' },
  { valor: 'reparado', etiqueta: 'Arreglado', filtro: 'Arreglados' },
];

export interface NivelBache {
  /** Lo que guarda el backend; el nivel 1/2/3 es solo de presentación. */
  valor: SeveridadBache;
  nivel: 1 | 2 | 3;
  etiqueta: string;
  descripcion: string;
  /** Relleno del marcador y del círculo numerado. */
  color: string;
  /** Texto sobre `color`. */
  tinta: string;
  /** Fondo suave (filas de la lista, nivel elegido). */
  fondo: string;
  /** Texto sobre `fondo`. */
  texto: string;
  /** Triángulo de advertencia (public/assets/icons) que usa el panel de revisión. */
  icono: string;
}

export const SEVERIDADES_BACHE: NivelBache[] = [
  {
    valor: 'baja',
    nivel: 1,
    etiqueta: 'Leve',
    descripcion: 'Se ve de lejos y se puede esquivar sin frenar.',
    color: '#F2B53A',
    tinta: '#3D2A00',
    fondo: '#FDF1D6',
    texto: '#6E4A00',
    icono: 'assets/icons/leve.svg',
  },
  {
    valor: 'media',
    nivel: 2,
    etiqueta: 'Rompe autos',
    descripcion: 'Golpe fuerte: riesgo para cubiertas, llantas y tren delantero.',
    color: '#C2531A',
    tinta: '#FFFFFF',
    fondo: '#FBE4D6',
    texto: '#9A3D0B',
    icono: 'assets/icons/moderado.svg',
  },
  {
    valor: 'alta',
    nivel: 3,
    etiqueta: 'Cráter',
    descripcion: 'Profundo o difícil de ver. Peligro real para motos y bicis.',
    color: '#9E1C1C',
    tinta: '#FFFFFF',
    fondo: '#F8DADA',
    texto: '#8E1A1A',
    icono: 'assets/icons/critico.svg',
  },
];

/** "hace 5 min", "hace 3 h", "ayer", "hace 12 días". */
export function tiempoRelativo(fecha: Date, ahora = Date.now()): string {
  const minutos = Math.floor((ahora - fecha.getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

export function nivelDe(severidad: SeveridadBache): NivelBache {
  return SEVERIDADES_BACHE.find((s) => s.valor === severidad) ?? SEVERIDADES_BACHE[1];
}

export interface FiltrosMapa {
  estado: EstadoBache;
  /** null: todos los niveles. */
  nivel: SeveridadBache | null;
  busqueda: string;
}

/** Minúsculas y sin tildes, para que "jardin" encuentre "Jardín". */
function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Si un bache se muestra (en el mapa y en la lista) con los filtros de la pantalla del mapa. */
export function cumpleFiltros(bache: Bache, filtros: FiltrosMapa): boolean {
  if (bache.estado !== filtros.estado) return false;
  if (filtros.nivel && bache.severidad !== filtros.nivel) return false;

  const texto = normalizarTexto(filtros.busqueda);
  if (!texto) return true;
  const via = [bache.calle, bache.altura].filter(Boolean).join(' ');
  return [via, bache.barrio].some((campo) => campo && normalizarTexto(campo).includes(texto));
}
