import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { HallsRepository } from './halls.repository';
import { CreateHallDto } from './dto/create-hall.dto';
import { UpdateHallDto } from './dto/update-hall.dto';

@Injectable()
export class HallsService {
  constructor(private readonly hallsRepository: HallsRepository) {}

  async create(createHallDto: CreateHallDto, tenantId: number) {
    const existing = await this.hallsRepository.findByName(
      createHallDto.name,
      tenantId,
    );
    if (existing) {
      throw new ConflictException('Hall with this name already exists');
    }
    return this.hallsRepository.create({ ...createHallDto, tenantId });
  }

  async findAll(tenantId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.hallsRepository.findAll(
      tenantId,
      skip,
      limit,
    );
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, tenantId: number) {
    const hall = await this.hallsRepository.findOne(id, tenantId);
    if (!hall) {
      throw new NotFoundException(`Hall with ID ${id} not found`);
    }
    return hall;
  }

  async update(id: number, updateHallDto: UpdateHallDto, tenantId: number) {
    await this.findOne(id, tenantId);
    return this.hallsRepository.update(id, tenantId, updateHallDto);
  }

  async remove(id: number, tenantId: number) {
    await this.findOne(id, tenantId);
    return this.hallsRepository.softDelete(id, tenantId);
  }
}
