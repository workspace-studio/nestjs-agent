# Domain Scaffold — End-to-End Module Creation

This guide walks through creating a complete new domain module. Example: **Equipment** domain.

## Step 1: Prisma Model

Add to `prisma/schema.prisma`:

```prisma
enum EquipmentStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
  RETIRED
}

model Equipment {
  id           String          @id @default(cuid())
  name         String
  serialNumber String          @unique
  description  String?
  status       EquipmentStatus @default(ACTIVE)
  purchaseDate DateTime?
  warrantyEnd  DateTime?

  locationId String?
  location   Location? @relation(fields: [locationId], references: [id])

  workOrders WorkOrder[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([serialNumber])
  @@index([status])
  @@index([locationId])
  @@index([deletedAt])
  @@map("equipment")
}
```

## Step 2: Migration

```bash
npx prisma migrate dev --name add_equipment_table
```

## Step 3: Folder Structure

```
src/domains/equipment/
  dto/
    create-equipment.dto.ts
    update-equipment.dto.ts
    query-equipment.dto.ts
    equipment-response.dto.ts
  enums/
    equipment-status.enum.ts
  equipment.controller.ts
  equipment.service.ts
  equipment.repository.ts
  equipment.module.ts
  __tests__/
    equipment.service.spec.ts
    equipment.controller.spec.ts
    equipment.repository.spec.ts
```

## Step 4: DTOs

### CreateEquipmentDto

```typescript
// src/domains/equipment/dto/create-equipment.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { EquipmentStatus } from '@prisma/client';

export class CreateEquipmentDto {
  @ApiProperty({ description: 'Equipment name', example: 'HVAC Unit A1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Unique serial number', example: 'SN-2024-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serialNumber: string;

  @ApiPropertyOptional({ description: 'Equipment description', example: 'Main building HVAC unit' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: EquipmentStatus, example: EquipmentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @ApiPropertyOptional({ description: 'Purchase date', example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Warranty end date', example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  warrantyEnd?: string;

  @ApiPropertyOptional({ description: 'Location ID' })
  @IsOptional()
  @IsString()
  locationId?: string;
}
```

### UpdateEquipmentDto

```typescript
// src/domains/equipment/dto/update-equipment.dto.ts
import { PartialType } from '@nestjs/swagger';

import { CreateEquipmentDto } from './create-equipment.dto';

export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}
```

### QueryEquipmentDto

```typescript
// src/domains/equipment/dto/query-equipment.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { EquipmentStatus } from '@prisma/client';

export class QueryEquipmentDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EquipmentStatus })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationId?: string;
}
```

### EquipmentResponseDto

```typescript
// src/domains/equipment/dto/equipment-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentStatus } from '@prisma/client';

export class EquipmentResponseDto {
  @ApiProperty({ example: 'clx1234567890' })
  id: string;

  @ApiProperty({ example: 'HVAC Unit A1' })
  name: string;

  @ApiProperty({ example: 'SN-2024-001' })
  serialNumber: string;

  @ApiPropertyOptional({ example: 'Main building HVAC unit' })
  description: string | null;

  @ApiProperty({ enum: EquipmentStatus, example: EquipmentStatus.ACTIVE })
  status: EquipmentStatus;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00.000Z' })
  purchaseDate: Date | null;

  @ApiPropertyOptional({ example: '2026-01-15T00:00:00.000Z' })
  warrantyEnd: Date | null;

  @ApiPropertyOptional()
  location?: { id: string; name: string } | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

## Step 5: Repository

```typescript
// src/domains/equipment/equipment.repository.ts
import { Injectable } from '@nestjs/common';
import { Equipment, Prisma } from '@prisma/client';

import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class EquipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.EquipmentCreateInput): Promise<Equipment> {
    return this.prisma.equipment.create({ data });
  }

  async findById(id: string): Promise<Equipment | null> {
    return this.prisma.equipment.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithRelations(id: string): Promise<Equipment | null> {
    return this.prisma.equipment.findUnique({
      where: { id, deletedAt: null },
      include: {
        location: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    status?: string;
    locationId?: string;
    search?: string;
  }): Promise<{ data: Equipment[]; total: number }> {
    const { page, limit, status, locationId, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.EquipmentWhereInput = {
      deletedAt: null,
      ...(status && { status: status as any }),
      ...(locationId && { locationId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.equipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { location: { select: { id: true, name: true } } },
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Prisma.EquipmentUpdateInput): Promise<Equipment> {
    return this.prisma.equipment.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Equipment> {
    return this.prisma.equipment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async existsBySerialNumber(serialNumber: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.equipment.count({
      where: {
        serialNumber,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }
}
```

## Step 6: Service

```typescript
// src/domains/equipment/equipment.service.ts
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { buildPaginatedResult, PaginatedResult } from 'src/common/utils/pagination';

import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { EquipmentResponseDto } from './dto/equipment-response.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentRepository } from './equipment.repository';

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(private readonly equipmentRepository: EquipmentRepository) {}

  async create(dto: CreateEquipmentDto): Promise<EquipmentResponseDto> {
    const exists = await this.equipmentRepository.existsBySerialNumber(dto.serialNumber);
    if (exists) {
      throw new ConflictException(`Equipment with serial number "${dto.serialNumber}" already exists`);
    }

    const equipment = await this.equipmentRepository.create({
      name: dto.name,
      serialNumber: dto.serialNumber,
      description: dto.description,
      status: dto.status,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      warrantyEnd: dto.warrantyEnd ? new Date(dto.warrantyEnd) : undefined,
      location: dto.locationId ? { connect: { id: dto.locationId } } : undefined,
    });

    this.logger.log(`Equipment created: ${equipment.id}`);
    return this.toResponseDto(equipment);
  }

  async findAll(query: QueryEquipmentDto): Promise<PaginatedResult<EquipmentResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.equipmentRepository.findAll({
      page,
      limit,
      status: query.status,
      locationId: query.locationId,
      search: query.search,
    });

    return buildPaginatedResult(data.map((e) => this.toResponseDto(e)), total, { page, limit });
  }

  async findOne(id: string): Promise<EquipmentResponseDto> {
    const equipment = await this.equipmentRepository.findByIdWithRelations(id);
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID "${id}" not found`);
    }
    return this.toResponseDto(equipment);
  }

  async update(id: string, dto: UpdateEquipmentDto): Promise<EquipmentResponseDto> {
    const existing = await this.equipmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Equipment with ID "${id}" not found`);
    }

    if (dto.serialNumber && dto.serialNumber !== existing.serialNumber) {
      const snExists = await this.equipmentRepository.existsBySerialNumber(dto.serialNumber, id);
      if (snExists) {
        throw new ConflictException(`Equipment with serial number "${dto.serialNumber}" already exists`);
      }
    }

    const updated = await this.equipmentRepository.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.serialNumber && { serialNumber: dto.serialNumber }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status && { status: dto.status }),
      ...(dto.purchaseDate && { purchaseDate: new Date(dto.purchaseDate) }),
      ...(dto.warrantyEnd && { warrantyEnd: new Date(dto.warrantyEnd) }),
      ...(dto.locationId && { location: { connect: { id: dto.locationId } } }),
    });

    this.logger.log(`Equipment updated: ${id}`);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.equipmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Equipment with ID "${id}" not found`);
    }
    await this.equipmentRepository.softDelete(id);
    this.logger.log(`Equipment soft-deleted: ${id}`);
  }

  private toResponseDto(equipment: any): EquipmentResponseDto {
    return {
      id: equipment.id,
      name: equipment.name,
      serialNumber: equipment.serialNumber,
      description: equipment.description,
      status: equipment.status,
      purchaseDate: equipment.purchaseDate,
      warrantyEnd: equipment.warrantyEnd,
      location: equipment.location ?? null,
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
    };
  }
}
```

## Step 7: Controller

```typescript
// src/domains/equipment/equipment.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { EquipmentResponseDto } from './dto/equipment-response.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentService } from './equipment.service';

@ApiTags('Equipment')
@ApiBearerAuth('access-token')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create equipment' })
  @ApiCreatedResponse({ type: EquipmentResponseDto })
  @ApiConflictResponse({ description: 'Serial number already exists' })
  async create(@Body() dto: CreateEquipmentDto): Promise<EquipmentResponseDto> {
    return this.equipmentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List equipment' })
  @ApiOkResponse({ type: [EquipmentResponseDto] })
  async findAll(@Query() query: QueryEquipmentDto) {
    return this.equipmentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: EquipmentResponseDto })
  @ApiNotFoundResponse({ description: 'Not found' })
  async findOne(@Param('id') id: string): Promise<EquipmentResponseDto> {
    return this.equipmentService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update equipment' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: EquipmentResponseDto })
  @ApiNotFoundResponse({ description: 'Not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto): Promise<EquipmentResponseDto> {
    return this.equipmentService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete equipment' })
  @ApiParam({ name: 'id' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.equipmentService.remove(id);
  }
}
```

## Step 8: Module

```typescript
// src/domains/equipment/equipment.module.ts
import { Module } from '@nestjs/common';

import { EquipmentController } from './equipment.controller';
import { EquipmentRepository } from './equipment.repository';
import { EquipmentService } from './equipment.service';

@Module({
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentRepository],
  exports: [EquipmentService],
})
export class EquipmentModule {}
```

## Step 9: Register in AppModule

```typescript
// src/app.module.ts — add to imports array
import { EquipmentModule } from './domains/equipment/equipment.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UserModule,
    WorkOrderModule,
    EquipmentModule,  // <-- add here
  ],
})
export class AppModule {}
```

## Step 10: Unit Tests

See `18-testing-patterns.md` for full test examples. At minimum, create:

- `equipment.service.spec.ts` — test create (success + conflict), findOne (success + not found), update, remove
- `equipment.controller.spec.ts` — test delegation to service
- `equipment.repository.spec.ts` — test Prisma calls

## Step 11: E2E Tests

Create `test/equipment.e2e-spec.ts` — see `18-testing-patterns.md` for full e2e test template.

## Step 12: Validation Gates

Before committing, run:

```bash
npm run build          # Compiles without errors
npm run lint           # No lint warnings
npm run test           # Unit tests pass
npm run test:e2e       # E2E tests pass
```

## Step 13: Update CLAUDE.md

Add the new domain to the domain list in `CLAUDE.md` if the project has one.

## Step 14: Create PR

```bash
git checkout -b feature/add-equipment-domain
git add src/ prisma/ test/ CLAUDE.md
git commit -m "$(cat <<'EOF'
feat: add equipment domain with CRUD operations

Co-Authored-By: NestJS Agent <noreply@anthropic.com>
EOF
)"
gh pr create --reviewer <username> --title "Resolves #<task_number>: <task_title>" --body "$(cat <<'EOF'
## Summary
- Add Equipment Prisma model with migration
- Add full CRUD (controller, service, repository)
- Add DTOs with validation and Swagger docs
- Add unit and e2e tests

## Test plan
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Swagger docs render correctly
- [ ] CRUD operations work via API

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
