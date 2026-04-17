import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis/redis.service';
import { AiService } from './ai.service';
import { TaskRepository, TaskWithUser } from './repositories/task.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  private readonly cacheTtl: number;

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly redis: RedisService,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {
    this.cacheTtl = this.configService.get<number>('REDIS_TTL', 3600);
  }

  async create(userId: string, createTaskDto: CreateTaskDto): Promise<TaskWithUser> {
    const task = await this.taskRepository.create({
      ...createTaskDto,
      dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
      userId,
    });

    const aiCategory = await this.aiService.categorizeTask(task.description ?? task.title);
    if (aiCategory) {
      const updated = await this.taskRepository.updateAiCategory(task.id, aiCategory);
      await this.clearUserCache(userId);
      return updated;
    }

    await this.clearUserCache(userId);
    return task;
  }

  async findAll(userId: string): Promise<TaskWithUser[]> {
    const cacheKey = `tasks:user:${userId}:all`;

    const cached = await this.redis.getClient().get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as TaskWithUser[];
    }

    const tasks = await this.taskRepository.findAllByUserId(userId);
    await this.redis.getClient().set(cacheKey, JSON.stringify(tasks), { EX: this.cacheTtl });

    return tasks;
  }

  async findOne(id: string, userId: string): Promise<TaskWithUser> {
    const task = await this.taskRepository.findOne(id, userId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async update(id: string, userId: string, updateTaskDto: UpdateTaskDto): Promise<TaskWithUser> {
    await this.findOne(id, userId);

    const task = await this.taskRepository.update(id, {
      ...updateTaskDto,
      dueDate: updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : undefined,
    });

    await this.clearUserCache(userId);
    return task;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOne(id, userId);
    await this.taskRepository.delete(id);
    await this.clearUserCache(userId);
    return { message: 'Task deleted successfully' };
  }

  private async clearUserCache(userId: string): Promise<void> {
    const cacheKey = `tasks:user:${userId}:all`;
    await this.redis.getClient().del(cacheKey);
  }
}
