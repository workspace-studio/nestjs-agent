import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HallsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    maxCapacity: number;
    description?: string;
    tenantId: number;
  }) {
    return this.prisma.hall.create({ data });
  }

  async findAll(tenantId: number, skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.hall.findMany({
        where: { tenantId, deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hall.count({
        where: { tenantId, deletedAt: null },
      }),
    ]);
    return { data, total };
  }

  async findOne(id: number, tenantId: number) {
    return this.prisma.hall.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findByName(name: string, tenantId: number) {
    return this.prisma.hall.findFirst({
      where: { name, tenantId, deletedAt: null },
    });
  }

  async update(id: number, tenantId: number, data: any) {
    return this.prisma.hall.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: number, tenantId: number) {
    return this.prisma.hall.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
