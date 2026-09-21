import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { Direccion, GeocodingService } from './geocoding.service';

class ReverseQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('reverse')
  reverse(@Query() { lat, lng }: ReverseQueryDto): Promise<Direccion> {
    return this.geocodingService.reverse(lat, lng);
  }
}
