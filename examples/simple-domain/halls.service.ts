import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { HallsRepository } from './halls.repository';
import { CreateHallDto } from './dto/create-hall.dto';
import { UpdateHallDto } from './dto/update-hall.dto';

interface PaginationQuery {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  search?: string;
}

@Injectable()
export class HallsService {
  constructor(private readonly hallsRepository: HallsRepository) {}

  async create(createHallDto: CreateHallDto, tenantId: string) {
    const existing = await this.hallsRepository.findByName(
      createHallDto.name,
      tenantId,
    );
    if (existing) {
      throw new ConflictException('Hall with this name already exists');
    }
    return this.hallsRepository.create({ ...createHallDto, tenantId });
  }

  async findAll(tenantId: string, query: PaginationQuery) {
    const { entities, totalCount } = await this.hallsRepository.findAll(
      tenantId,
      query,
    );
    return {
      entities,
      totalCount,
      pagination: {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const hall = await this.hallsRepository.findOne(id, tenantId);
    if (!hall) {
      throw new NotFoundException(`Hall with ID ${id} not found`);
    }
    return hall;
  }

  async update(id: string, updateHallDto: UpdateHallDto, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.hallsRepository.update(id, tenantId, updateHallDto);
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.hallsRepository.softDelete(id, tenantId);
  }
}
