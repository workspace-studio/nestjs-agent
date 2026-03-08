# Service Patterns

## Standard Service

```typescript
// src/domains/work-order/work-order.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';

import { buildPaginatedResult, PaginatedResult } from 'src/common/utils/pagination';

import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { QueryWorkOrderDto } from './dto/query-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrderResponseDto } from './dto/work-order-response.dto';
import { WorkOrderRepository } from './work-order.repository';

@Injectable()
export class WorkOrderService {
  private readonly logger = new Logger(WorkOrderService.name);

  constructor(private readonly workOrderRepository: WorkOrderRepository) {}

  async create(dto: CreateWorkOrderDto, userId: string): Promise<WorkOrderResponseDto> {
    // Business validation: check for duplicates
    const exists = await this.workOrderRepository.existsByTitle(dto.title);
    if (exists) {
      throw new ConflictException(`Work order with title "${dto.title}" already exists`);
    }

    // Business validation: due date must be in the future
    if (dto.dueDate && new Date(dto.dueDate) < new Date()) {
      throw new BadRequestException('Due date must be in the future');
    }

    const workOrder = await this.workOrderRepository.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      assignee: dto.assigneeId ? { connect: { id: dto.assigneeId } } : undefined,
      createdBy: { connect: { id: userId } },
      location: dto.locationId ? { connect: { id: dto.locationId } } : undefined,
    });

    this.logger.log(`Work order created: ${workOrder.id} by user ${userId}`);
    return this.toResponseDto(workOrder);
  }

  async findAll(query: QueryWorkOrderDto): Promise<PaginatedResult<WorkOrderResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.workOrderRepository.findAll({
      page,
      limit,
      status: query.status,
      assigneeId: query.assigneeId,
      search: query.search,
    });

    const items = data.map((wo) => this.toResponseDto(wo));
    return buildPaginatedResult(items, total, { page, limit });
  }

  async findOne(id: string): Promise<WorkOrderResponseDto> {
    const workOrder = await this.workOrderRepository.findByIdWithRelations(id);
    if (!workOrder) {
      throw new NotFoundException(`Work order with ID "${id}" not found`);
    }
    return this.toResponseDto(workOrder);
  }

  async update(id: string, dto: UpdateWorkOrderDto): Promise<WorkOrderResponseDto> {
    // Ensure exists
    const existing = await this.workOrderRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Work order with ID "${id}" not found`);
    }

    // Business rule: cannot update completed/cancelled orders
    if ([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED].includes(existing.status)) {
      throw new BadRequestException(`Cannot update a ${existing.status.toLowerCase()} work order`);
    }

    // Check title uniqueness if changing title
    if (dto.title && dto.title !== existing.title) {
      const titleExists = await this.workOrderRepository.existsByTitle(dto.title, id);
      if (titleExists) {
        throw new ConflictException(`Work order with title "${dto.title}" already exists`);
      }
    }

    const updated = await this.workOrderRepository.update(id, {
      ...(dto.title && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status && { status: dto.status }),
      ...(dto.priority && { priority: dto.priority }),
      ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
      ...(dto.assigneeId && { assignee: { connect: { id: dto.assigneeId } } }),
    });

    this.logger.log(`Work order updated: ${id}`);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.workOrderRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Work order with ID "${id}" not found`);
    }

    await this.workOrderRepository.softDelete(id);
    this.logger.log(`Work order soft-deleted: ${id}`);
  }

  async assign(id: string, assigneeId: string): Promise<WorkOrderResponseDto> {
    const existing = await this.workOrderRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Work order with ID "${id}" not found`);
    }

    if (existing.status === WorkOrderStatus.COMPLETED) {
      throw new BadRequestException('Cannot assign a completed work order');
    }

    const updated = await this.workOrderRepository.update(id, {
      assignee: { connect: { id: assigneeId } },
      status: WorkOrderStatus.IN_PROGRESS,
    });

    return this.toResponseDto(updated);
  }

  private toResponseDto(workOrder: any): WorkOrderResponseDto {
    return {
      id: workOrder.id,
      title: workOrder.title,
      description: workOrder.description,
      status: workOrder.status,
      priority: workOrder.priority,
      dueDate: workOrder.dueDate,
      assignee: workOrder.assignee
        ? { id: workOrder.assignee.id, name: workOrder.assignee.name }
        : null,
      createdBy: workOrder.createdBy
        ? { id: workOrder.createdBy.id, name: workOrder.createdBy.name }
        : undefined,
      createdAt: workOrder.createdAt,
      updatedAt: workOrder.updatedAt,
    };
  }
}
```

## Business Validation Rules

Use the right exception for each case:

```typescript
// Duplicate resource
throw new ConflictException(`User with email "${email}" already exists`);

// Resource not found
throw new NotFoundException(`Work order with ID "${id}" not found`);

// Invalid business state
throw new BadRequestException('Cannot close a work order with incomplete tasks');

// Invalid input
throw new BadRequestException('Due date must be in the future');

// Unauthorized action (use guards instead when possible)
throw new ForbiddenException('You can only update your own work orders');
```

## Pagination Helper Usage

```typescript
import { buildPaginatedResult } from 'src/common/utils/pagination';

// In service:
const { data, total } = await this.repository.findAll({ page, limit, ...filters });
const dtos = data.map((item) => this.toResponseDto(item));
return buildPaginatedResult(dtos, total, { page, limit });
```

## Soft Delete Pattern

Services always call `softDelete` instead of hard delete:

```typescript
async remove(id: string): Promise<void> {
  const existing = await this.repository.findById(id);
  if (!existing) {
    throw new NotFoundException(`Resource with ID "${id}" not found`);
  }
  await this.repository.softDelete(id);
}
```

## When to Split Services

Split into `QueryingService` + `MutationService` when a single service exceeds ~8 public methods:

```typescript
// work-order-querying.service.ts
@Injectable()
export class WorkOrderQueryingService {
  constructor(private readonly workOrderRepository: WorkOrderRepository) {}

  async findAll(query: QueryWorkOrderDto) { ... }
  async findOne(id: string) { ... }
  async findByAssignee(assigneeId: string) { ... }
  async findOverdue() { ... }
  async getStatsByStatus() { ... }
}

// work-order-mutation.service.ts
@Injectable()
export class WorkOrderMutationService {
  constructor(
    private readonly workOrderRepository: WorkOrderRepository,
    private readonly workOrderQueryingService: WorkOrderQueryingService,
  ) {}

  async create(dto: CreateWorkOrderDto, userId: string) { ... }
  async update(id: string, dto: UpdateWorkOrderDto) { ... }
  async remove(id: string) { ... }
  async assign(id: string, assigneeId: string) { ... }
  async changeStatus(id: string, status: WorkOrderStatus) { ... }
}
```

Both services are registered in the same module. The mutation service can inject the querying service for existence checks. Controllers inject whichever service they need.

## Logger

Always add a logger to services:

```typescript
private readonly logger = new Logger(WorkOrderService.name);

// Usage
this.logger.log(`Work order created: ${workOrder.id}`);
this.logger.warn(`Attempt to modify completed work order: ${id}`);
this.logger.error(`Failed to create work order`, error.stack);
```
