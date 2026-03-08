import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EquipmentRepository } from './equipment.repository';
import { CreateEquipmentDto, EquipmentStatus } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { HallsRepository } from '../simple-domain/halls.repository';

interface FindAllOptions {
  page: number;
  limit: number;
  status?: EquipmentStatus;
  hallId?: number;
  search?: string;
}

@Injectable()
export class EquipmentService {
  constructor(
    private readonly equipmentRepository: EquipmentRepository,
    private readonly hallsRepository: HallsRepository,
  ) {}

  async create(createEquipmentDto: CreateEquipmentDto, tenantId: number) {
    const hall = await this.hallsRepository.findOne(
      createEquipmentDto.hallId,
      tenantId,
    );
    if (!hall) {
      throw new BadRequestException(
        `Hall with ID ${createEquipmentDto.hallId} not found`,
      );
    }

    return this.equipmentRepository.create({ ...createEquipmentDto, tenantId });
  }

  async findAll(tenantId: number, options: FindAllOptions) {
    const { page, limit, status, hallId, search } = options;
    const skip = (page - 1) * limit;

    const { data, total } = await this.equipmentRepository.findAll(
      tenantId,
      skip,
      limit,
      { status, hallId, search },
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
    const equipment = await this.equipmentRepository.findOne(id, tenantId);
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }
    return equipment;
  }

  async update(
    id: number,
    updateEquipmentDto: UpdateEquipmentDto,
    tenantId: number,
  ) {
    await this.findOne(id, tenantId);

    if (updateEquipmentDto.hallId) {
      const hall = await this.hallsRepository.findOne(
        updateEquipmentDto.hallId,
        tenantId,
      );
      if (!hall) {
        throw new BadRequestException(
          `Hall with ID ${updateEquipmentDto.hallId} not found`,
        );
      }
    }

    return this.equipmentRepository.update(id, tenantId, updateEquipmentDto);
  }

  async remove(id: number, tenantId: number) {
    await this.findOne(id, tenantId);
    return this.equipmentRepository.softDelete(id, tenantId);
  }
}
