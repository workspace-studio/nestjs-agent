import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/modules/common/prisma/prisma.service';

@Injectable()
export class HallsRepository {
  private readonly ALLOWED_SORT_FIELDS = ['name', 'created', 'modified'] as const;

  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    maxCapacity: number;
    description?: string;
    tenantId: string;
  }) {
    try {
      return await this.prisma.hall.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Hall '${data.name}' already exists`);
      }
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    query: { pageNumber: number; pageSize: number; sortBy?: string; sortDirection?: string; search?: string },
  ) {
    const sortBy = query.sortBy || 'created';
    if (!this.ALLOWED_SORT_FIELDS.includes(sortBy as any)) {
      throw new BadRequestException(`Invalid sort field: ${sortBy}`);
    }

    const where: any = { tenantId, entityStatus: 'ACTIVE' };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [entities, totalCount] = await Promise.all([
      this.prisma.hall.findMany({
        where,
        skip: query.pageNumber * query.pageSize,
        take: query.pageSize,
        orderBy: { [sortBy]: (query.sortDirection || 'DESC').toLowerCase() },
      }),
      this.prisma.hall.count({ where }),
    ]);
    return { entities, totalCount };
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.hall.findFirst({
      where: { id, tenantId, entityStatus: 'ACTIVE' },
    });
  }

  async findByName(name: string, tenantId: string) {
    return this.prisma.hall.findFirst({
      where: { name, tenantId, entityStatus: 'ACTIVE' },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    return this.prisma.hall.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, tenantId: string) {
    return this.prisma.hall.update({
      where: { id },
      data: { entityStatus: 'DELETED' },
    });
  }
}
