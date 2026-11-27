import { Bache, cumpleFiltros, FiltrosMapa, nivelDe, tiempoRelativo } from './bache.model';

function bache(datos: Partial<Bache> = {}): Bache {
  return {
    id: '1',
    lat: -31.42,
    lng: -64.19,
    estado: 'reportado',
    severidad: 'media',
    usuario: 'vecino',
    fecha: new Date('2026-11-01T10:00:00Z'),
    fotoUrl: null,
    revisado: true,
    calle: 'Emilio Lamarca',
    altura: '3845',
    barrio: 'Ampliación Urca',
    ...datos,
  };
}

const SIN_FILTROS: FiltrosMapa = { estados: ['reportado'], niveles: [], busqueda: '' };

describe('nivelDe', () => {
  it('traduce la severidad del backend al nivel 1/2/3 del diseño', () => {
    expect(nivelDe('baja')).toMatchObject({ nivel: 1, etiqueta: 'Leve', color: '#F2B53A' });
    expect(nivelDe('media')).toMatchObject({ nivel: 2, etiqueta: 'Rompe autos', color: '#C2531A' });
    expect(nivelDe('alta')).toMatchObject({ nivel: 3, etiqueta: 'Cráter', color: '#9E1C1C' });
  });
});

describe('cumpleFiltros', () => {
  it('muestra solo los estados tildados', () => {
    expect(cumpleFiltros(bache(), SIN_FILTROS)).toBe(true);
    expect(cumpleFiltros(bache({ estado: 'reparado' }), SIN_FILTROS)).toBe(false);
  });

  it('dentro de un grupo combina con OR', () => {
    const ambos: FiltrosMapa = { ...SIN_FILTROS, estados: ['reportado', 'reparado'], niveles: ['alta', 'baja'] };
    expect(cumpleFiltros(bache({ estado: 'reportado', severidad: 'alta' }), ambos)).toBe(true);
    expect(cumpleFiltros(bache({ estado: 'reparado', severidad: 'baja' }), ambos)).toBe(true);
    expect(cumpleFiltros(bache({ severidad: 'media' }), ambos)).toBe(false);
  });

  it('entre grupos combina con AND', () => {
    const sinRepararCrater: FiltrosMapa = { ...SIN_FILTROS, niveles: ['alta'] };
    expect(cumpleFiltros(bache({ severidad: 'alta' }), sinRepararCrater)).toBe(true);
    expect(cumpleFiltros(bache({ severidad: 'media' }), sinRepararCrater)).toBe(false);
    expect(cumpleFiltros(bache({ estado: 'reparado', severidad: 'alta' }), sinRepararCrater)).toBe(false);
  });

  it('un grupo sin nada tildado no filtra por ese criterio', () => {
    const nada: FiltrosMapa = { estados: [], niveles: [], busqueda: '' };
    expect(cumpleFiltros(bache({ estado: 'reparado', severidad: 'baja' }), nada)).toBe(true);
    expect(cumpleFiltros(bache({ estado: 'reportado', severidad: 'alta' }), nada)).toBe(true);
  });

  it('busca por calle, calle + altura o barrio, sin importar mayúsculas ni tildes', () => {
    expect(cumpleFiltros(bache(), { ...SIN_FILTROS, busqueda: 'lamarca' })).toBe(true);
    expect(cumpleFiltros(bache(), { ...SIN_FILTROS, busqueda: 'Lamarca 3845' })).toBe(true);
    expect(cumpleFiltros(bache(), { ...SIN_FILTROS, busqueda: 'ampliacion' })).toBe(true);
    expect(cumpleFiltros(bache(), { ...SIN_FILTROS, busqueda: 'santa ana' })).toBe(false);
  });

  it('un bache sin dirección no coincide con ninguna búsqueda', () => {
    const sinDireccion = bache({ calle: null, altura: null, barrio: null });
    expect(cumpleFiltros(sinDireccion, { ...SIN_FILTROS, busqueda: 'a' })).toBe(false);
    expect(cumpleFiltros(sinDireccion, SIN_FILTROS)).toBe(true);
  });
});

describe('tiempoRelativo', () => {
  const ahora = new Date('2026-11-17T12:00:00Z').getTime();
  const hace = (ms: number) => new Date(ahora - ms);

  it('usa minutos, horas y días', () => {
    expect(tiempoRelativo(hace(20_000), ahora)).toBe('recién');
    expect(tiempoRelativo(hace(59 * 60_000), ahora)).toBe('hace 59 min');
    expect(tiempoRelativo(hace(3 * 3_600_000), ahora)).toBe('hace 3 h');
    expect(tiempoRelativo(hace(30 * 3_600_000), ahora)).toBe('ayer');
    expect(tiempoRelativo(hace(56 * 86_400_000), ahora)).toBe('hace 56 días');
  });
});
