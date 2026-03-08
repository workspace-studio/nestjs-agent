import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsEnum,
  IsOptional,
} from 'class-validator';

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

export enum EquipmentCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

export class CreateEquipmentDto {
  @ApiProperty({ description: 'Name of the equipment', example: 'Projector A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Serial number', example: 'SN-2024-001' })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiProperty({
    description: 'Equipment status',
    enum: EquipmentStatus,
    example: EquipmentStatus.AVAILABLE,
  })
  @IsEnum(EquipmentStatus)
  status: EquipmentStatus;

  @ApiProperty({
    description: 'Equipment condition',
    enum: EquipmentCondition,
    example: EquipmentCondition.NEW,
  })
  @IsEnum(EquipmentCondition)
  condition: EquipmentCondition;

  @ApiProperty({ description: 'ID of the hall this equipment belongs to', example: 1 })
  @IsInt()
  hallId: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
