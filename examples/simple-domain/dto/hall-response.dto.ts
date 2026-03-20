import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HallResponseDto {
  @ApiProperty({ example: 'clx1234567890' })
  id: string;

  @ApiProperty({ example: 'Main Hall' })
  name: string;

  @ApiProperty({ example: 500 })
  maxCapacity: number;

  @ApiPropertyOptional({ example: 'Large hall for events' })
  description: string | null;

  @ApiProperty()
  created: Date;

  @ApiProperty()
  modified: Date;
}
