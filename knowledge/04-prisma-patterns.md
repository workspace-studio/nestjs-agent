# Prisma Patterns

## PrismaService

```typescript
// src/common/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## PrismaModule

```typescript
// src/common/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Register in `AppModule` imports. Because it is `@Global()`, all modules can inject `PrismaService` without importing `PrismaModule`.

## Repository Pattern

```typescript
// src/domains/work-order/work-order.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, WorkOrder } from '@prisma/client';

import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class WorkOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WorkOrderCreateInput): Promise<WorkOrder> {
    return this.prisma.workOrder.create({ data });
  }

  async findById(id: string): Promise<WorkOrder | null> {
    return this.prisma.workOrder.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithRelations(id: string): Promise<WorkOrder | null> {
    return this.prisma.workOrder.findUnique({
      where: { id, deletedAt: null },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        tasks: true,
        location: true,
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    status?: string;
    assigneeId?: string;
    search?: string;
  }): Promise<{ data: WorkOrder[]; total: number }> {
    const { page, limit, status, assigneeId, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkOrderWhereInput = {
      deletedAt: null,
      ...(status && { status: status as any }),
      ...(assigneeId && { assigneeId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: { id: true, name: true } },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Prisma.WorkOrderUpdateInput): Promise<WorkOrder> {
    return this.prisma.workOrder.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<WorkOrder> {
    return this.prisma.workOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByAssignee(assigneeId: string): Promise<WorkOrder[]> {
    return this.prisma.workOrder.findMany({
      where: { assigneeId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async existsByTitle(title: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.workOrder.count({
      where: {
        title,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }
}
```

## Soft Delete Filter

Always add `deletedAt: null` to where clauses:

```typescript
// In repository queries
where: { id, deletedAt: null }

// For findMany
where: { deletedAt: null, ...otherFilters }
```

## Pagination Helper

```typescript
// src/common/utils/pagination.ts
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function buildPaginatedResult<T>(data: T[], total: number, params: PaginationParams): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1,
    },
  };
}
```

## Transactions

```typescript
// Simple transaction with array of operations
const [user, workOrder] = await this.prisma.$transaction([
  this.prisma.user.create({ data: userData }),
  this.prisma.workOrder.create({ data: workOrderData }),
]);

// Interactive transaction with business logic
const result = await this.prisma.$transaction(async (tx) => {
  const workOrder = await tx.workOrder.findUnique({ where: { id } });
  if (!workOrder) throw new NotFoundException('Work order not found');

  if (workOrder.status === 'COMPLETED') {
    throw new BadRequestException('Cannot modify completed work order');
  }

  const updated = await tx.workOrder.update({
    where: { id },
    data: { status: 'IN_PROGRESS', assigneeId },
  });

  await tx.activityLog.create({
    data: {
      action: 'ASSIGNED',
      entityType: 'WORK_ORDER',
      entityId: id,
      performedById: currentUserId,
    },
  });

  return updated;
});
```

## Select vs Include

```typescript
// select: pick specific fields (exclusive)
const user = await this.prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
    // password is excluded
  },
});

// include: add relations to full model
const workOrder = await this.prisma.workOrder.findUnique({
  where: { id },
  include: {
    assignee: true,
    tasks: true,
  },
});

// Nested select within include
const workOrder = await this.prisma.workOrder.findUnique({
  where: { id },
  include: {
    assignee: {
      select: { id: true, name: true, email: true },
    },
  },
});
```

## Full-Text Search

```typescript
// Case-insensitive contains (works without preview feature)
where: {
  title: { contains: search, mode: 'insensitive' },
}

// OR across multiple fields
where: {
  OR: [
    { title: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
  ],
}

// Starts with
where: {
  name: { startsWith: prefix, mode: 'insensitive' },
}
```
