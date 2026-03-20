import { Test, TestingModule } from '@nestjs/testing';
import { HallsRepository } from '../../simple-domain/halls.repository';
import { PrismaService } from '../../../prisma/prisma.service';

describe('HallsRepository', () => {
  let repository: HallsRepository;
  let prisma: any;

  const mockHall = {
    id: 'clx1234567890',
    name: 'Main Hall',
    maxCapacity: 500,
    tenantId: 'tenant-1',
    entityStatus: 'ACTIVE',
    created: new Date(),
    modified: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      hall: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HallsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<HallsRepository>(HallsRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a hall', async () => {
      prisma.hall.create.mockResolvedValue(mockHall);

      const result = await repository.create({
        name: 'Main Hall',
        maxCapacity: 500,
        tenantId: 'tenant-1',
      });

      expect(result).toEqual(mockHall);
      expect(prisma.hall.create).toHaveBeenCalledWith({
        data: { name: 'Main Hall', maxCapacity: 500, tenantId: 'tenant-1' },
      });
    });
  });

  describe('findAll', () => {
    it('should return entities and totalCount', async () => {
      prisma.hall.findMany.mockResolvedValue([mockHall]);
      prisma.hall.count.mockResolvedValue(1);

      const result = await repository.findAll('tenant-1', { pageNumber: 0, pageSize: 20 });

      expect(result).toEqual({ entities: [mockHall], totalCount: 1 });
      expect(prisma.hall.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', entityStatus: 'ACTIVE' },
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should find a hall by id and tenantId', async () => {
      prisma.hall.findFirst.mockResolvedValue(mockHall);

      const result = await repository.findOne('clx1234567890', 'tenant-1');

      expect(result).toEqual(mockHall);
      expect(prisma.hall.findFirst).toHaveBeenCalledWith({
        where: { id: 'clx1234567890', tenantId: 'tenant-1', entityStatus: 'ACTIVE' },
      });
    });
  });

  describe('findByName', () => {
    it('should find a hall by name and tenantId', async () => {
      prisma.hall.findFirst.mockResolvedValue(mockHall);

      const result = await repository.findByName('Main Hall', 'tenant-1');

      expect(result).toEqual(mockHall);
      expect(prisma.hall.findFirst).toHaveBeenCalledWith({
        where: { name: 'Main Hall', tenantId: 'tenant-1', entityStatus: 'ACTIVE' },
      });
    });
  });

  describe('softDelete', () => {
    it('should set entityStatus to DELETED', async () => {
      const deleted = { ...mockHall, entityStatus: 'DELETED' };
      prisma.hall.update.mockResolvedValue(deleted);

      const result = await repository.softDelete('clx1234567890', 'tenant-1');

      expect(result.entityStatus).toBe('DELETED');
      expect(prisma.hall.update).toHaveBeenCalledWith({
        where: { id: 'clx1234567890' },
        data: { entityStatus: 'DELETED' },
      });
    });
  });
});
