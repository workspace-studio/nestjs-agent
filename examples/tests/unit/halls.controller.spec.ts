import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { HallsController } from '../../simple-domain/halls.controller';
import { HallsService } from '../../simple-domain/halls.service';

describe('HallsController', () => {
  let controller: HallsController;
  let service: jest.Mocked<HallsService>;

  const mockUser = { id: 1, tenantId: 1, role: 'ADMIN' };

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
        1,
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
        data: [mockHall],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(1, 20, mockUser);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findOne', () => {
    it('should return a hall', async () => {
      service.findOne.mockResolvedValue(mockHall);

      const result = await controller.findOne(1, mockUser);

      expect(result).toEqual(mockHall);
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a hall', async () => {
      const updated = { ...mockHall, name: 'Updated' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, { name: 'Updated' }, mockUser);

      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should remove a hall', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(1, mockUser);

      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
