import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/modules/common/prisma/prisma.service';
import { EquipmentStatus } from './dto/create-equipment.dto';

interface FindAllFilters {
  pageNumber: number;
  pageSize: number;
  status?: EquipmentStatus;
  hallId?: string;
  search?: string;
}

@Injectable()
export class EquipmentRepository {
  private readonly ALLOWED_SORT_FIELDS = ['name', 'serialNumber', 'created', 'modified'] as const;

  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    serialNumber: string;
    status: EquipmentStatus;
    condition: string;
    hallId: string;
    notes?: string;
    tenantId: string;
  }) {
    try {
      return await this.prisma.equipment.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Equipment with serial number '${data.serialNumber}' already exists`);
      }
      throw error;
    }
  }

  async findAll(tenantId: string, filters: FindAllFilters) {
    const where: any = { tenantId, entityStatus: 'ACTIVE' };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.hallId) {
      where.hallId = filters.hallId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [entities, totalCount] = await Promise.all([
      this.prisma.equipment.findMany({
        where,
        skip: filters.pageNumber * filters.pageSize,
        take: filters.pageSize,
        orderBy: { created: 'desc' },
        include: { hall: true },
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return { entities, totalCount };
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.equipment.findFirst({
      where: { id, tenantId, entityStatus: 'ACTIVE' },
      include: { hall: true },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    return this.prisma.equipment.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, tenantId: string) {
    return this.prisma.equipment.update({
      where: { id },
      data: { entityStatus: 'DELETED' },
    });
  }
}
