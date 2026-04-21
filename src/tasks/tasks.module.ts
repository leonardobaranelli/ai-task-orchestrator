import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { TaskRepository, PrismaTaskRepository } from './repositories/task.repository';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [TasksController],
  providers: [TasksService, AiService, { provide: TaskRepository, useClass: PrismaTaskRepository }],
})
export class TasksModule {}
