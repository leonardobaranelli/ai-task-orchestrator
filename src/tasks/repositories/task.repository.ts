import { Injectable } from '@nestjs/common';
import { Task, TaskStatus, TaskPriority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type TaskOwner = {
  id: string;
  email: string;
  name: string | null;
};

export type TaskWithUser = Task & { user: TaskOwner };

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  category?: string;
  userId: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  category?: string;
}

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
} as const;

/**
 * Abstract class that defines the contract for task data access.
 * Decouples the service layer from any specific ORM or database implementation.
 */
export abstract class TaskRepository {
  abstract create(data: CreateTaskInput): Promise<TaskWithUser>;
  abstract findAllByUserId(userId: string): Promise<TaskWithUser[]>;
  abstract findOne(id: string, userId: string): Promise<TaskWithUser | null>;
  abstract update(id: string, data: UpdateTaskInput): Promise<TaskWithUser>;
  abstract delete(id: string): Promise<void>;
  abstract updateAiCategory(id: string, aiCategory: string): Promise<TaskWithUser>;
}

@Injectable()
export class PrismaTaskRepository extends TaskRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  create(data: CreateTaskInput): Promise<TaskWithUser> {
    return this.prisma.task.create({
      data,
      include: { user: { select: USER_SELECT } },
    });
  }

  findAllByUserId(userId: string): Promise<TaskWithUser[]> {
    return this.prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: USER_SELECT } },
    });
  }

  findOne(id: string, userId: string): Promise<TaskWithUser | null> {
    return this.prisma.task.findFirst({
      where: { id, userId },
      include: { user: { select: USER_SELECT } },
    });
  }

  update(id: string, data: UpdateTaskInput): Promise<TaskWithUser> {
    return this.prisma.task.update({
      where: { id },
      data,
      include: { user: { select: USER_SELECT } },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }

  updateAiCategory(id: string, aiCategory: string): Promise<TaskWithUser> {
    return this.prisma.task.update({
      where: { id },
      data: { aiCategory },
      include: { user: { select: USER_SELECT } },
    });
  }
}
