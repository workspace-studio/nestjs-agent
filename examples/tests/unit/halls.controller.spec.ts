import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { HallsController } from 'src/modules/simple-domain/halls.controller';
import { HallsService } from 'src/modules/simple-domain/halls.service';

describe('HallsController', () => {
  let controller: HallsController;
  let service: jest.Mocked<HallsService>;

  const mockUser = { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' };

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
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HallsController],
      providers: [{ provide: HallsService, useValue: mockService }],
    }).compile();

    controller = module.get<HallsController>(HallsController);
    service = module.get(HallsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a hall', async () => {
      service.create.mockResolvedValue(mockHall);

      const result = await controller.create(
        { name: 'Main Hall', maxCapacity: 500 },
        mockUser,
      );

      expect(result).toEqual(mockHall);
      expect(service.create).toHaveBeenCalledWith(
        { name: 'Main Hall', maxCapacity: 500 },
        'tenant-1',
      );
    });

    it('should propagate ConflictException', async () => {
      service.create.mockRejectedValue(new ConflictException());

      await expect(
        controller.create({ name: 'Main Hall', maxCapacity: 500 }, mockUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated halls', async () => {
      const paginatedResult = {
        entities: [mockHall],
        totalCount: 1,
        pagination: { pageNumber: 0, pageSize: 20 },
      };
      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(
        { pageNumber: 0, pageSize: 20 } as any,
        mockUser,
      );

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith('tenant-1', { pageNumber: 0, pageSize: 20 });
    });
  });

  describe('findOne', () => {
    it('should return a hall', async () => {
      service.findOne.mockResolvedValue(mockHall);

      const result = await controller.findOne('clx1234567890', mockUser);

      expect(result).toEqual(mockHall);
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a hall', async () => {
      const updated = { ...mockHall, name: 'Updated' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update('clx1234567890', { name: 'Updated' }, mockUser);

      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should remove a hall', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('clx1234567890', mockUser);

      expect(service.remove).toHaveBeenCalledWith('clx1234567890', 'tenant-1');
    });
  });
});
