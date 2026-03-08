import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateHallDto {
  @ApiProperty({ description: 'Name of the hall', example: 'Main Hall' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Maximum capacity', example: 500, minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  maxCapacity: number;

  @ApiProperty({ description: 'Description of the hall', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
