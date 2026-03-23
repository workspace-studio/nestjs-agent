import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EquipmentRepository } from './equipment.repository';
import { CreateEquipmentDto, EquipmentStatus } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { HallsRepository } from 'src/modules/simple-domain/halls.repository';

interface FindAllOptions {
  pageNumber: number;
  pageSize: number;
  status?: EquipmentStatus;
  hallId?: string;
  search?: string;
}

@Injectable()
export class EquipmentService {
  constructor(
    private readonly equipmentRepository: EquipmentRepository,
    private readonly hallsRepository: HallsRepository,
  ) {}

  async create(createEquipmentDto: CreateEquipmentDto, tenantId: string) {
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

  async findAll(tenantId: string, options: FindAllOptions) {
    const { entities, totalCount } = await this.equipmentRepository.findAll(
      tenantId,
      options,
    );

    return {
      entities,
      totalCount,
      pagination: {
        pageNumber: options.pageNumber,
        pageSize: options.pageSize,
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const equipment = await this.equipmentRepository.findOne(id, tenantId);
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }
    return equipment;
  }

  async update(
    id: string,
    updateEquipmentDto: UpdateEquipmentDto,
    tenantId: string,
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

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.equipmentRepository.softDelete(id, tenantId);
  }
}
