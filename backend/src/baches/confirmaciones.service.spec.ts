import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfirmacionesService } from './confirmaciones.service';
import { Bache } from './entities/bache.entity';
import { Confirmacion } from './entities/confirmacion.entity';

// @nestjs/typeorm se publica solo como ESM y jest (CommonJS) no lo puede cargar; acá
// los repositorios se pasan a mano, así que el decorador no hace falta.
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

const BACHE = '144475a4-d809-4932-8491-ac4820aad79b';
const DISPOSITIVO = 'fad605bd-0f43-4950-b9c7-2bf4afa45a85';

describe('ConfirmacionesService', () => {
  let confirmaciones: { upsert: jest.Mock; countBy: jest.Mock; findOneBy: jest.Mock; createQueryBuilder: jest.Mock };
  let baches: { existsBy: jest.Mock };
  let service: ConfirmacionesService;

  beforeEach(() => {
    confirmaciones = {
      upsert: jest.fn().mockResolvedValue(undefined),
      countBy: jest.fn(async ({ tipo }: { tipo: string }) => (tipo === 'sigue' ? 3 : 1)),
      findOneBy: jest.fn().mockResolvedValue({ tipo: 'sigue' }),
      createQueryBuilder: jest.fn(),
    };
    baches = { existsBy: jest.fn().mockResolvedValue(true) };
    service = new ConfirmacionesService(
      confirmaciones as unknown as Repository<Confirmacion>,
      baches as unknown as Repository<Bache>,
    );
  });

  it('guarda una respuesta por dispositivo (upsert) y devuelve los conteos con la respuesta propia', async () => {
    const resumen = await service.confirmar(BACHE, 'sigue', DISPOSITIVO);

    expect(confirmaciones.upsert).toHaveBeenCalledWith(
      { bacheId: BACHE, dispositivo: DISPOSITIVO, tipo: 'sigue' },
      ['bacheId', 'dispositivo'],
    );
    expect(resumen).toEqual({ sigue: 3, arreglado: 1, miRespuesta: 'sigue' });
  });

  it('sin dispositivo no busca la respuesta propia', async () => {
    const resumen = await service.obtener(BACHE);
    expect(confirmaciones.findOneBy).not.toHaveBeenCalled();
    expect(resumen.miRespuesta).toBeNull();
  });

  it('solo acepta baches aprobados', async () => {
    baches.existsBy.mockResolvedValue(false);
    await expect(service.confirmar(BACHE, 'sigue', DISPOSITIVO)).rejects.toThrow(NotFoundException);
    expect(baches.existsBy).toHaveBeenCalledWith({ id: BACHE, revisado: true });
    expect(confirmaciones.upsert).not.toHaveBeenCalled();
  });

  it('el resumen de admin convierte los COUNT de Postgres (string) a número', async () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ bacheId: BACHE, sigue: '2', arreglado: '5' }]),
    };
    confirmaciones.createQueryBuilder.mockReturnValue(qb);

    expect(await service.resumenPorBache()).toEqual({ [BACHE]: { sigue: 2, arreglado: 5 } });
  });
});
