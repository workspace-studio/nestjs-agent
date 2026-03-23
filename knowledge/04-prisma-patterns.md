# Prisma Patterns

## PrismaService

```typescript
// src/common/prisma/prisma.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });
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
// src/modules/work-order/work-order.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, WorkOrder } from '@prisma/client';

import { PrismaService } from 'src/modules/common/prisma/prisma.service';

@Injectable()
export class WorkOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WorkOrderCreateInput): Promise<WorkOrder> {
    return this.prisma.workOrder.create({ data });
  }

  async findById(id: string): Promise<WorkOrder | null> {
    return this.prisma.workOrder.findFirst({
      where: { id, entityStatus: 'ACTIVE' },
    });
  }

  async findByIdWithRelations(id: string): Promise<WorkOrder | null> {
    return this.prisma.workOrder.findFirst({
      where: { id, entityStatus: 'ACTIVE' },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        tasks: true,
        location: true,
      },
    });
  }

  async findAll(params: {
    pageNumber: number;
    pageSize: number;
    status?: string;
    assigneeId?: string;
    search?: string;
  }): Promise<{ entities: WorkOrder[]; totalCount: number }> {
    const { pageNumber, pageSize, status, assigneeId, search } = params;
    const skip = pageNumber * pageSize;

    const where: Prisma.WorkOrderWhereInput = {
      entityStatus: 'ACTIVE',
      ...(status && { status: status as any }),
      ...(assigneeId && { assigneeId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [entities, totalCount] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created: 'desc' },
        include: {
          assignee: { select: { id: true, name: true } },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { entities, totalCount };
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
      data: { entityStatus: 'DELETED' },
    });
  }

  async findByAssignee(assigneeId: string): Promise<WorkOrder[]> {
    return this.prisma.workOrder.findMany({
      where: { assigneeId, entityStatus: 'ACTIVE' },
      orderBy: { created: 'desc' },
    });
  }

  async existsByTitle(title: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.workOrder.count({
      where: {
        title,
        entityStatus: 'ACTIVE',
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }
}
```

## Soft Delete Filter

Always add `entityStatus: 'ACTIVE'` to where clauses:

```typescript
// In repository queries
where: { id, entityStatus: 'ACTIVE' }

// For findMany
where: { entityStatus: 'ACTIVE', ...otherFilters }
```

## Pagination Helper

```typescript
// src/common/utils/pagination.ts
export interface PaginationParams {
  pageNumber: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  entities: T[];
  totalCount: number;
  pagination: {
    pageNumber: number;
    pageSize: number;
  };
}

export function buildPaginatedResult<T>(entities: T[], totalCount: number, params: PaginationParams): PaginatedResult<T> {
  return {
    entities,
    totalCount,
    pagination: {
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
    },
  };
}
```

## findUnique vs findFirst

- **findUnique()** — for lookup by unique field WITHOUT entityStatus filter (e.g., findByEmail, findBySerialNumber)
- **findFirst()** — for lookup by ID or any field that requires entityStatus filter

```typescript
// findUnique: lookup by unique field, no entityStatus filter needed
async findByEmail(email: string) {
  return this.prisma.user.findUnique({ where: { email } });
}

// findFirst: lookup by ID with entityStatus filter
async findById(id: string) {
  return this.prisma.user.findFirst({
    where: { id, entityStatus: 'ACTIVE' },
  });
}
```

## P2002 Error Handling (Unique Constraint Violation)

```typescript
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

async create(data: Prisma.CourtCreateInput) {
  try {
    return await this.prisma.court.create({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(`Court '${data.name}' already exists`);
    }
    throw error;
  }
}
```

## ALLOWED_SORT_FIELDS Pattern

Validate sort fields to prevent arbitrary column access:

```typescript
private readonly ALLOWED_SORT_FIELDS = ['name', 'created', 'modified'] as const;

async findAll(query: PaginationQueryDto) {
  if (!this.ALLOWED_SORT_FIELDS.includes(query.sortBy as any)) {
    throw new BadRequestException(`Invalid sort field: ${query.sortBy}`);
  }

  const [entities, totalCount] = await Promise.all([
    this.prisma.court.findMany({
      where: { entityStatus: 'ACTIVE' },
      skip: query.pageNumber * query.pageSize,
      take: query.pageSize,
      orderBy: { [query.sortBy]: query.sortDirection.toLowerCase() },
    }),
    this.prisma.court.count({ where: { entityStatus: 'ACTIVE' } }),
  ]);

  return { entities, totalCount };
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
