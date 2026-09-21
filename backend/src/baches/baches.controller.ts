import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BachesService } from './baches.service';
import { FotosService } from './fotos.service';
import { CreateBacheDto } from './dto/create-bache.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { Bache } from './entities/bache.entity';

const FORMATOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Controller('baches')
export class BachesController {
  constructor(
    private readonly bachesService: BachesService,
    private readonly fotosService: FotosService,
  ) {}

  @Get()
  findAprobados(): Promise<Bache[]> {
    return this.bachesService.findAprobados();
  }

  @Get('pendientes')
  findPendientes(): Promise<Bache[]> {
    return this.bachesService.findPendientes();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('foto', {
      // En memoria (tope de 5 MB): FotosService la procesa y recién ahí la escribe a disco.
      storage: memoryStorage(),
      // Solo formatos que todos los navegadores muestran. HEIC (iPhone) lo convierte
      // el frontend a JPEG antes de subir; si llega acá, se avisa en vez de descartarlo callado.
      fileFilter: (_req, file, callback) => {
        if (FORMATOS_FOTO_PERMITIDOS.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('La foto debe ser JPG, PNG, WebP o GIF.'),
            false,
          );
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() dto: CreateBacheDto,
    @UploadedFile() foto?: Express.Multer.File,
  ): Promise<Bache> {
    const fotoUrl = foto ? await this.fotosService.guardar(foto) : null;
    return this.bachesService.create(dto, fotoUrl);
  }

  @Patch(':id/aprobar')
  aprobar(@Param('id', ParseUUIDPipe) id: string): Promise<Bache> {
    return this.bachesService.aprobar(id);
  }

  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstadoDto,
  ): Promise<Bache> {
    return this.bachesService.updateEstado(id, dto.estado);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.bachesService.remove(id);
  }
}
