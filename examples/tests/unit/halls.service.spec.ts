import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { HallsService } from 'src/modules/simple-domain/halls.service';
import { HallsRepository } from 'src/modules/simple-domain/halls.repository';

describe('HallsService', () => {
  let service: HallsService;
  let repository: jest.Mocked<HallsRepository>;

  const mockHall = {
    id: 'clx1234567890',
    name: 'Main Hall',
    maxCapacity: 500,
    description: 'Large hall',
    tenantId: 'tenant-1',
    entityStatus: 'ACTIVE',
    created: new Date(),
    modified: new Date(),
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
        'tenant-1',
      );

      expect(result).toEqual(mockHall);
      expect(repository.findByName).toHaveBeenCalledWith('Main Hall', 'tenant-1');
    });

    it('should throw ConflictException if name exists', async () => {
      repository.findByName.mockResolvedValue(mockHall);

      await expect(
        service.create({ name: 'Main Hall', maxCapacity: 500 }, 'tenant-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated results in Serwizz format', async () => {
      repository.findAll.mockResolvedValue({ entities: [mockHall], totalCount: 1 });

      const result = await service.findAll('tenant-1', { pageNumber: 0, pageSize: 20 });

      expect(result.entities).toEqual([mockHall]);
      expect(result.totalCount).toBe(1);
      expect(result.pagination).toEqual({ pageNumber: 0, pageSize: 20 });
      expect(repository.findAll).toHaveBeenCalledWith('tenant-1', { pageNumber: 0, pageSize: 20 });
    });
  });

  describe('findOne', () => {
    it('should return a hall', async () => {
      repository.findOne.mockResolvedValue(mockHall);

      const result = await service.findOne('clx1234567890', 'tenant-1');

      expect(result).toEqual(mockHall);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a hall', async () => {
      const updated = { ...mockHall, name: 'Updated Hall' };
      repository.findOne.mockResolvedValue(mockHall);
      repository.update.mockResolvedValue(updated);

      const result = await service.update('clx1234567890', { name: 'Updated Hall' }, 'tenant-1');

      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should soft delete a hall', async () => {
      repository.findOne.mockResolvedValue(mockHall);
      repository.softDelete.mockResolvedValue({
        ...mockHall,
        entityStatus: 'DELETED',
      });

      await service.remove('clx1234567890', 'tenant-1');

      expect(repository.softDelete).toHaveBeenCalledWith('clx1234567890', 'tenant-1');
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });
});
