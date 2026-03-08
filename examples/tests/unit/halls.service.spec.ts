import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { HallsService } from '../../simple-domain/halls.service';
import { HallsRepository } from '../../simple-domain/halls.repository';

describe('HallsService', () => {
  let service: HallsService;
  let repository: jest.Mocked<HallsRepository>;

  const mockHall = {
    id: 1,
    name: 'Main Hall',
    maxCapacity: 500,
    description: 'Large hall',
    tenantId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HallsService,
        { provide: HallsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<HallsService>(HallsService);
    repository = module.get(HallsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a hall successfully', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockHall);

      const result = await service.create(
        { name: 'Main Hall', maxCapacity: 500, description: 'Large hall' },
        1,
      );

      expect(result).toEqual(mockHall);
      expect(repository.findByName).toHaveBeenCalledWith('Main Hall', 1);
    });

    it('should throw ConflictException if name exists', async () => {
      repository.findByName.mockResolvedValue(mockHall);

      await expect(
        service.create({ name: 'Main Hall', maxCapacity: 500 }, 1),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      repository.findAll.mockResolvedValue({ data: [mockHall], total: 1 });

      const result = await service.findAll(1, 1, 20);

      expect(result.data).toEqual([mockHall]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(repository.findAll).toHaveBeenCalledWith(1, 0, 20);
    });
  });

  describe('findOne', () => {
    it('should return a hall', async () => {
      repository.findOne.mockResolvedValue(mockHall);

      const result = await service.findOne(1, 1);

      expect(result).toEqual(mockHall);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a hall', async () => {
      const updated = { ...mockHall, name: 'Updated Hall' };
      repository.findOne.mockResolvedValue(mockHall);
      repository.update.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'Updated Hall' }, 1);

      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should soft delete a hall', async () => {
      repository.findOne.mockResolvedValue(mockHall);
      repository.softDelete.mockResolvedValue({
        ...mockHall,
        deletedAt: new Date(),
      });

      await service.remove(1, 1);

      expect(repository.softDelete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
