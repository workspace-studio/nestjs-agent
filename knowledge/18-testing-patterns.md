# Testing Patterns

## Philosophy

**Red-Green-Fix**: Write a failing test first, make it pass, then refactor. Every service method, guard, and interceptor must have tests. Target 80% code coverage minimum.

## Jest Configuration

### package.json

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s",
      "!**/*.module.ts",
      "!**/main.ts",
      "!**/*.dto.ts",
      "!**/*.interface.ts",
      "!**/*.enum.ts"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^src/(.*)$": "<rootDir>/$1"
    }
  }
}
```

### test/jest-e2e.json

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  }
}
```

---

## A) Service Unit Test

```typescript
// src/domains/equipment/equipment.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EquipmentStatus } from '@prisma/client';

import { EquipmentService } from './equipment.service';
import { EquipmentRepository } from './equipment.repository';
import { CreateEquipmentDto } from './dto/create-equipment.dto';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let repository: jest.Mocked<EquipmentRepository>;

  const mockEquipment = {
    id: 'equip-1',
    name: 'HVAC Unit A1',
    serialNumber: 'SN-001',
    description: 'Main HVAC unit',
    status: EquipmentStatus.ACTIVE,
    purchaseDate: new Date('2024-01-01'),
    warrantyEnd: new Date('2026-01-01'),
    locationId: null,
    location: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdWithRelations: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      existsBySerialNumber: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: EquipmentRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
    repository = module.get(EquipmentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateEquipmentDto = {
      name: 'HVAC Unit A1',
      serialNumber: 'SN-001',
      description: 'Main HVAC unit',
    };

    it('should create equipment successfully', async () => {
      repository.existsBySerialNumber.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockEquipment);

      const result = await service.create(createDto);

      expect(result.id).toBe('equip-1');
      expect(result.name).toBe('HVAC Unit A1');
      expect(repository.existsBySerialNumber).toHaveBeenCalledWith('SN-001');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'HVAC Unit A1', serialNumber: 'SN-001' }),
      );
    });

    it('should throw ConflictException when serial number exists', async () => {
      repository.existsBySerialNumber.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return equipment when found', async () => {
      repository.findByIdWithRelations.mockResolvedValue(mockEquipment);

      const result = await service.findOne('equip-1');

      expect(result.id).toBe('equip-1');
      expect(repository.findByIdWithRelations).toHaveBeenCalledWith('equip-1');
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete equipment', async () => {
      repository.findById.mockResolvedValue(mockEquipment);
      repository.softDelete.mockResolvedValue({ ...mockEquipment, deletedAt: new Date() });

      await service.remove('equip-1');

      expect(repository.softDelete).toHaveBeenCalledWith('equip-1');
    });

    it('should throw NotFoundException when equipment does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update equipment successfully', async () => {
      repository.findById.mockResolvedValue(mockEquipment);
      repository.existsBySerialNumber.mockResolvedValue(false);
      repository.update.mockResolvedValue({ ...mockEquipment, name: 'Updated HVAC' });

      const result = await service.update('equip-1', { name: 'Updated HVAC', serialNumber: 'SN-002' });

      expect(result.name).toBe('Updated HVAC');
      expect(repository.existsBySerialNumber).toHaveBeenCalledWith('SN-002', 'equip-1');
    });

    it('should throw NotFoundException for missing equipment', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'test' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate serial number', async () => {
      repository.findById.mockResolvedValue(mockEquipment);
      repository.existsBySerialNumber.mockResolvedValue(true);

      await expect(
        service.update('equip-1', { serialNumber: 'SN-DUPLICATE' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
```

---

## B) Controller Unit Test

```typescript
// src/domains/equipment/equipment.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';

describe('EquipmentController', () => {
  let controller: EquipmentController;
  let service: jest.Mocked<EquipmentService>;

  const mockResponse = {
    id: 'equip-1',
    name: 'HVAC Unit',
    serialNumber: 'SN-001',
    description: null,
    status: 'ACTIVE',
    purchaseDate: null,
    warrantyEnd: null,
    location: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquipmentController],
      providers: [{ provide: EquipmentService, useValue: mockService }],
    }).compile();

    controller = module.get<EquipmentController>(EquipmentController);
    service = module.get(EquipmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should delegate to service and return result', async () => {
      service.create.mockResolvedValue(mockResponse as any);

      const result = await controller.create({ name: 'HVAC Unit', serialNumber: 'SN-001' });

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith({ name: 'HVAC Unit', serialNumber: 'SN-001' });
    });
  });

  describe('findOne', () => {
    it('should return equipment by id', async () => {
      service.findOne.mockResolvedValue(mockResponse as any);

      const result = await controller.findOne('equip-1');

      expect(result).toEqual(mockResponse);
    });

    it('should propagate NotFoundException from service', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const paginated = { data: [mockResponse], meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
      service.findAll.mockResolvedValue(paginated as any);

      const result = await controller.findAll({ page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('should delegate to service', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('equip-1');

      expect(service.remove).toHaveBeenCalledWith('equip-1');
    });
  });
});
```

---

## C) Repository Unit Test

```typescript
// src/domains/equipment/equipment.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/common/prisma/prisma.service';

import { EquipmentRepository } from './equipment.repository';

describe('EquipmentRepository', () => {
  let repository: EquipmentRepository;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      equipment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<EquipmentRepository>(EquipmentRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call prisma.equipment.create with correct data', async () => {
      const data = { name: 'HVAC', serialNumber: 'SN-001' };
      const expected = { id: '1', ...data, createdAt: new Date(), updatedAt: new Date() };
      prisma.equipment.create.mockResolvedValue(expected);

      const result = await repository.create(data as any);

      expect(prisma.equipment.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(expected);
    });
  });

  describe('findById', () => {
    it('should query with id and deletedAt: null', async () => {
      const expected = { id: '1', name: 'HVAC', deletedAt: null };
      prisma.equipment.findUnique.mockResolvedValue(expected);

      const result = await repository.findById('1');

      expect(prisma.equipment.findUnique).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
      });
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      prisma.equipment.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should use $transaction for data and count', async () => {
      const mockData = [{ id: '1', name: 'HVAC' }];
      prisma.$transaction.mockResolvedValue([mockData, 1]);

      const result = await repository.findAll({ page: 1, limit: 20 });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ data: mockData, total: 1 });
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt to current date', async () => {
      const expected = { id: '1', deletedAt: new Date() };
      prisma.equipment.update.mockResolvedValue(expected);

      await repository.softDelete('1');

      expect(prisma.equipment.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('existsBySerialNumber', () => {
    it('should return true when count > 0', async () => {
      prisma.equipment.count.mockResolvedValue(1);

      const result = await repository.existsBySerialNumber('SN-001');

      expect(result).toBe(true);
    });

    it('should exclude given id from check', async () => {
      prisma.equipment.count.mockResolvedValue(0);

      const result = await repository.existsBySerialNumber('SN-001', 'equip-1');

      expect(prisma.equipment.count).toHaveBeenCalledWith({
        where: {
          serialNumber: 'SN-001',
          deletedAt: null,
          id: { not: 'equip-1' },
        },
      });
      expect(result).toBe(false);
    });
  });
});
```

---

## D) Guard Unit Test (RolesGuard)

```typescript
// src/auth/guards/roles.guard.spec.ts
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';
import { Role } from '../enums/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (userRole: Role) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: { sub: 'user-1', email: 'test@test.com', role: userRole },
      }),
    }),
  });

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext(Role.EMPLOYEE);

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.MANAGER]);
    const context = createMockContext(Role.ADMIN);

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.EMPLOYEE);

    expect(guard.canActivate(context as any)).toBe(false);
  });

  it('should allow when roles array is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockContext(Role.EMPLOYEE);

    expect(guard.canActivate(context as any)).toBe(true);
  });
});
```

---

## E) Interceptor Unit Test (ResponseInterceptor)

```typescript
// src/common/interceptors/response.interceptor.spec.ts
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockExecutionContext = {} as ExecutionContext;

  it('should wrap response in { success, data }', (done) => {
    const mockData = { id: '1', name: 'Test' };
    const callHandler: CallHandler = { handle: () => of(mockData) };

    interceptor.intercept(mockExecutionContext, callHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: { id: '1', name: 'Test' },
      });
      done();
    });
  });

  it('should extract meta from paginated responses', (done) => {
    const paginatedData = {
      data: [{ id: '1' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    };
    const callHandler: CallHandler = { handle: () => of(paginatedData) };

    interceptor.intercept(mockExecutionContext, callHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: [{ id: '1' }],
        meta: expect.objectContaining({ total: 1, page: 1 }),
      });
      done();
    });
  });

  it('should handle null data', (done) => {
    const callHandler: CallHandler = { handle: () => of(null) };

    interceptor.intercept(mockExecutionContext, callHandler).subscribe((result) => {
      expect(result).toEqual({ success: true, data: null });
      done();
    });
  });
});
```

---

## F) Transaction Mock Test

```typescript
// Example: testing a service method that uses $transaction
describe('WorkOrderService - assignWithLog', () => {
  let service: WorkOrderService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      $transaction: jest.fn(),
      workOrder: { findUnique: jest.fn(), update: jest.fn() },
      activityLog: { create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        WorkOrderService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(WorkOrderService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should assign work order and create activity log in transaction', async () => {
    const mockWorkOrder = { id: 'wo-1', status: 'OPEN', assigneeId: null };
    const mockUpdated = { ...mockWorkOrder, assigneeId: 'user-1', status: 'IN_PROGRESS' };

    // Mock $transaction to execute the callback with a mock tx
    prisma.$transaction.mockImplementation(async (callback: Function) => {
      const tx = {
        workOrder: {
          findUnique: jest.fn().mockResolvedValue(mockWorkOrder),
          update: jest.fn().mockResolvedValue(mockUpdated),
        },
        activityLog: {
          create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        },
      };
      return callback(tx);
    });

    const result = await service.assignWithTransaction('wo-1', 'user-1', 'admin-1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.assigneeId).toBe('user-1');
  });

  it('should throw NotFoundException inside transaction when work order missing', async () => {
    prisma.$transaction.mockImplementation(async (callback: Function) => {
      const tx = {
        workOrder: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        activityLog: { create: jest.fn() },
      };
      return callback(tx);
    });

    await expect(
      service.assignWithTransaction('nonexistent', 'user-1', 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
```

---

## G) Pipe Unit Test

```typescript
// src/common/pipes/file-validation.pipe.spec.ts
import { BadRequestException } from '@nestjs/common';

import { FileValidationPipe } from './file-validation.pipe';

describe('FileValidationPipe', () => {
  let pipe: FileValidationPipe;

  beforeEach(() => {
    pipe = new FileValidationPipe(
      ['image/jpeg', 'image/png', 'application/pdf'],
      5 * 1024 * 1024, // 5MB
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should pass valid file through', () => {
    const file = {
      mimetype: 'image/jpeg',
      size: 1024,
      originalname: 'photo.jpg',
    } as Express.Multer.File;

    expect(pipe.transform(file)).toBe(file);
  });

  it('should throw BadRequestException for missing file', () => {
    expect(() => pipe.transform(null as any)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException for invalid mime type', () => {
    const file = {
      mimetype: 'application/zip',
      size: 1024,
      originalname: 'archive.zip',
    } as Express.Multer.File;

    expect(() => pipe.transform(file)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException for file exceeding max size', () => {
    const file = {
      mimetype: 'image/png',
      size: 10 * 1024 * 1024, // 10MB
      originalname: 'large.png',
    } as Express.Multer.File;

    expect(() => pipe.transform(file)).toThrow(BadRequestException);
  });
});
```

---

## H) E2E Test

```typescript
// test/equipment.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Role } from 'src/auth/enums/role.enum';

describe('Equipment (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Generate test tokens
    adminToken = jwtService.sign({ sub: 'admin-1', email: 'admin@test.com', role: Role.ADMIN });
    employeeToken = jwtService.sign({ sub: 'emp-1', email: 'emp@test.com', role: Role.EMPLOYEE });
  });

  afterAll(async () => {
    await prisma.equipment.deleteMany();
    await app.close();
  });

  let createdId: string;

  describe('POST /api/equipment', () => {
    it('should create equipment (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test HVAC',
          serialNumber: 'SN-E2E-001',
          description: 'E2E test equipment',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('Test HVAC');
      expect(response.body.serialNumber).toBe('SN-E2E-001');
      createdId = response.body.id;
    });

    it('should reject invalid input (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' }) // missing required serialNumber, empty name
        .expect(400);
    });

    it('should reject unauthenticated requests (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/equipment')
        .send({ name: 'Test', serialNumber: 'SN-002' })
        .expect(401);
    });

    it('should reject unauthorized role (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Test', serialNumber: 'SN-003' })
        .expect(403);
    });

    it('should reject duplicate serial number (409)', async () => {
      await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Another HVAC', serialNumber: 'SN-E2E-001' })
        .expect(409);
    });
  });

  describe('GET /api/equipment', () => {
    it('should return paginated list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter by search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/equipment?search=HVAC')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/equipment/:id', () => {
    it('should return equipment by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/equipment/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdId);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .get('/api/equipment/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/equipment/:id', () => {
    it('should update equipment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/equipment/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated HVAC' })
        .expect(200);

      expect(response.body.name).toBe('Updated HVAC');
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .patch('/api/equipment/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/equipment/:id', () => {
    it('should soft delete equipment (204)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/equipment/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should return 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/equipment/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .delete('/api/equipment/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
```

---

## I) Test Utilities

```typescript
// test/utils/test-helpers.ts
import { Role } from 'src/auth/enums/role.enum';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

/**
 * Create a mock user payload for testing
 */
export function mockUserFactory(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: 'test-user-id',
    email: 'test@example.com',
    role: Role.ADMIN,
    ...overrides,
  };
}

/**
 * Create a mock ExecutionContext for guard/interceptor testing
 */
export function createMockExecutionContext(user?: JwtPayload) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: user || mockUserFactory(),
        url: '/api/test',
        method: 'GET',
      }),
      getResponse: jest.fn().mockReturnValue({
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }),
    }),
    getType: jest.fn().mockReturnValue('http'),
  };
}

/**
 * Create a mock PrismaService with all common model methods
 */
export function mockPrismaService() {
  const mockModel = () => ({
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  });

  return {
    user: mockModel(),
    workOrder: mockModel(),
    equipment: mockModel(),
    location: mockModel(),
    task: mockModel(),
    media: mockModel(),
    activityLog: mockModel(),
    $transaction: jest.fn((args) => {
      if (Array.isArray(args)) return Promise.all(args);
      return args({} as any);
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
  };
}

/**
 * Clean database tables in correct order (respecting foreign keys)
 */
export async function cleanDatabase(prisma: any): Promise<void> {
  await prisma.activityLog?.deleteMany();
  await prisma.task?.deleteMany();
  await prisma.media?.deleteMany();
  await prisma.workOrder?.deleteMany();
  await prisma.equipment?.deleteMany();
  await prisma.location?.deleteMany();
  await prisma.user?.deleteMany();
}

/**
 * Create a mock CallHandler for interceptor testing
 */
export function createMockCallHandler(returnValue: any) {
  const { of } = require('rxjs');
  return {
    handle: () => of(returnValue),
  };
}
```

---

## Test Rules

1. **Always `afterEach(() => jest.clearAllMocks())`** — prevents state leakage between tests.
2. **Never skip tests** — no `xit`, `xdescribe`, or `.skip`. Fix or delete them.
3. **80% coverage target** — run `npm run test:cov` to verify.
4. **Test file placement**:
   - Unit tests: `src/domains/<name>/__tests__/<name>.service.spec.ts` or colocated as `<name>.service.spec.ts`
   - E2E tests: `test/<name>.e2e-spec.ts`
5. **Mock at boundaries** — mock repositories in service tests, mock services in controller tests. Never mock the class under test.
6. **Test both success and failure paths** — every service method should have at least one success test and one failure test.
7. **Use descriptive test names** — `it('should throw NotFoundException when equipment does not exist')` not `it('error case')`.
8. **No real database in unit tests** — only e2e tests connect to a real database.
9. **Isolate tests** — each test must work independently, regardless of execution order.
10. **Use factories** — use `mockUserFactory()` and similar helpers instead of duplicating mock data.
