import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentStatus } from './dto/create-equipment.dto';

interface FindAllFilters {
  status?: EquipmentStatus;
  hallId?: number;
  search?: string;
}

@Injectable()
export class EquipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    serialNumber: string;
    status: EquipmentStatus;
    condition: string;
    hallId: number;
    notes?: string;
    tenantId: number;
  }) {
    return this.prisma.equipment.create({ data });
  }

  async findAll(
    tenantId: number,
    skip: number,
    take: number,
    filters: FindAllFilters,
  ) {
    const where: any = { tenantId, deletedAt: null };

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

    const [data, total] = await Promise.all([
      this.prisma.equipment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { hall: true },
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: number, tenantId: number) {
    return this.prisma.equipment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { hall: true },
    });
  }

  async update(id: number, tenantId: number, data: any) {
    return this.prisma.equipment.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: number, tenantId: number) {
    return this.prisma.equipment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
