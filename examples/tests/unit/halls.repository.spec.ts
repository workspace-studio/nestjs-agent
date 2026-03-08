import { Test, TestingModule } from '@nestjs/testing';
import { HallsRepository } from '../../simple-domain/halls.repository';
import { PrismaService } from '../../../prisma/prisma.service';

describe('HallsRepository', () => {
  let repository: HallsRepository;
  let prisma: any;

  const mockHall = {
    id: 1,
    name: 'Main Hall',
    maxCapacity: 500,
    tenantId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
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
        tenantId: 1,
      });

      expect(result).toEqual(mockHall);
      expect(prisma.hall.create).toHaveBeenCalledWith({
        data: { name: 'Main Hall', maxCapacity: 500, tenantId: 1 },
      });
    });
  });

  describe('findAll', () => {
    it('should return data and total count', async () => {
      prisma.hall.findMany.mockResolvedValue([mockHall]);
      prisma.hall.count.mockResolvedValue(1);

      const result = await repository.findAll(1, 0, 20);

      expect(result).toEqual({ data: [mockHall], total: 1 });
      expect(prisma.hall.findMany).toHaveBeenCalledWith({
        where: { tenantId: 1, deletedAt: null },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.hall.count).toHaveBeenCalledWith({
        where: { tenantId: 1, deletedAt: null },
      });
    });
  });

  describe('findOne', () => {
    it('should find a hall by id and tenantId', async () => {
      prisma.hall.findFirst.mockResolvedValue(mockHall);

      const result = await repository.findOne(1, 1);

      expect(result).toEqual(mockHall);
      expect(prisma.hall.findFirst).toHaveBeenCalledWith({
        where: { id: 1, tenantId: 1, deletedAt: null },
      });
    });
  });

  describe('findByName', () => {
    it('should find a hall by name and tenantId', async () => {
      prisma.hall.findFirst.mockResolvedValue(mockHall);

      const result = await repository.findByName('Main Hall', 1);

      expect(result).toEqual(mockHall);
      expect(prisma.hall.findFirst).toHaveBeenCalledWith({
        where: { name: 'Main Hall', tenantId: 1, deletedAt: null },
      });
    });
  });

  describe('update', () => {
    it('should update a hall', async () => {
      const updated = { ...mockHall, name: 'Updated' };
      prisma.hall.update.mockResolvedValue(updated);

      const result = await repository.update(1, 1, { name: 'Updated' });

      expect(result).toEqual(updated);
      expect(prisma.hall.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete a hall', async () => {
      const deleted = { ...mockHall, deletedAt: new Date() };
      prisma.hall.update.mockResolvedValue(deleted);

      const result = await repository.softDelete(1, 1);

      expect(result.deletedAt).toBeDefined();
      expect(prisma.hall.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
