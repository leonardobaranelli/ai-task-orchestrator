import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { TasksService } from '../../src/tasks/tasks.service';
import { TaskRepository, TaskWithUser } from '../../src/tasks/repositories/task.repository';
import { RedisService } from '../../src/common/redis/redis.service';
import { AiService } from '../../src/tasks/ai.service';

describe('TasksService', () => {
  let service: TasksService;

  const mockTask: TaskWithUser = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    category: null,
    aiCategory: null,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
  };

  const mockTaskRepository: jest.Mocked<TaskRepository> = {
    create: jest.fn(),
    findAllByUserId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateAiCategory: jest.fn(),
  };

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  const mockAiService: jest.Mocked<Pick<AiService, 'categorizeTask'>> = {
    categorizeTask: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(3600),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TaskRepository, useValue: mockTaskRepository },
        { provide: RedisService, useValue: mockRedisService },
        { provide: AiService, useValue: mockAiService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    jest.clearAllMocks();
    mockRedisService.getClient.mockReturnValue(mockRedisClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a task and apply AI categorization', async () => {
      const createDto = { title: 'New Task', description: 'Implement feature' };
      const rawTask = { ...mockTask, ...createDto };
      const categorized = { ...rawTask, aiCategory: 'Development' };

      mockTaskRepository.create.mockResolvedValue(rawTask);
      mockAiService.categorizeTask.mockResolvedValue('Development');
      mockTaskRepository.updateAiCategory.mockResolvedValue(categorized);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.create('user-1', createDto);

      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Task', userId: 'user-1' }),
      );
      expect(mockAiService.categorizeTask).toHaveBeenCalledWith('Implement feature');
      expect(mockTaskRepository.updateAiCategory).toHaveBeenCalledWith('task-1', 'Development');
      expect(result.aiCategory).toBe('Development');
    });

    it('should return task without AI category when AiService returns null', async () => {
      const createDto = { title: 'Simple Task' };
      const rawTask = { ...mockTask, ...createDto };

      mockTaskRepository.create.mockResolvedValue(rawTask);
      mockAiService.categorizeTask.mockResolvedValue(null);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.create('user-1', createDto);

      expect(mockTaskRepository.updateAiCategory).not.toHaveBeenCalled();
      expect(result).toEqual(rawTask);
    });

    it('should convert dueDate string to Date object', async () => {
      const createDto = { title: 'Task', dueDate: '2026-06-01T00:00:00Z' };

      mockTaskRepository.create.mockResolvedValue(mockTask);
      mockAiService.categorizeTask.mockResolvedValue(null);
      mockRedisClient.del.mockResolvedValue(1);

      await service.create('user-1', createDto);

      const createCall = mockTaskRepository.create.mock.calls[0][0];
      expect(createCall.dueDate).toBeInstanceOf(Date);
    });

    it('should invalidate cache after creating a task', async () => {
      mockTaskRepository.create.mockResolvedValue(mockTask);
      mockAiService.categorizeTask.mockResolvedValue(null);
      mockRedisClient.del.mockResolvedValue(1);

      await service.create('user-1', { title: 'Task' });

      expect(mockRedisClient.del).toHaveBeenCalledWith('tasks:user:user-1:all');
    });
  });

  describe('findAll', () => {
    it('should return parsed tasks from Redis cache when available', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockTask]));

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(1);
      expect(mockTaskRepository.findAllByUserId).not.toHaveBeenCalled();
    });

    it('should query the database and cache the result on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockTaskRepository.findAllByUserId.mockResolvedValue([mockTask]);
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.findAll('user-1');

      expect(mockTaskRepository.findAllByUserId).toHaveBeenCalledWith('user-1');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'tasks:user:user-1:all',
        expect.any(String),
        { EX: 3600 },
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return the task when found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.findOne('task-1', 'user-1');

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith('task-1', 'user-1');
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the task', async () => {
      const updateDto = { title: 'Updated Title' };
      const updatedTask = { ...mockTask, ...updateDto };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.update.mockResolvedValue(updatedTask);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.update('task-1', 'user-1', updateDto);

      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ title: 'Updated Title' }),
      );
      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException if task does not belong to the user', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', 'user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('should invalidate cache after updating', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.update.mockResolvedValue(mockTask);
      mockRedisClient.del.mockResolvedValue(1);

      await service.update('task-1', 'user-1', {});

      expect(mockRedisClient.del).toHaveBeenCalledWith('tasks:user:user-1:all');
    });
  });

  describe('remove', () => {
    it('should delete the task and return a confirmation message', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockResolvedValue(undefined);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.remove('task-1', 'user-1');

      expect(mockTaskRepository.delete).toHaveBeenCalledWith('task-1');
      expect(result.message).toBe('Task deleted successfully');
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should invalidate cache after deleting', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockResolvedValue(undefined);
      mockRedisClient.del.mockResolvedValue(1);

      await service.remove('task-1', 'user-1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('tasks:user:user-1:all');
    });
  });
});
