import { ApiProperty } from '@nestjs/swagger';
import { HallResponseDto } from './hall-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 0 })
  pageNumber: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class HallListResponseDto {
  @ApiProperty({ type: [HallResponseDto] })
  entities: HallResponseDto[];

  @ApiProperty({ example: 42 })
  totalCount: number;

  @ApiProperty({ type: PaginationMetaDto })
  pagination: PaginationMetaDto;
}
