import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
};

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
}

/**
 * Abstract class that defines the contract for user data access.
 * Using an abstract class instead of an interface allows NestJS DI
 * to use it as an injection token without extra boilerplate.
 */
export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(data: CreateUserInput): Promise<SafeUser>;
}

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserInput): Promise<SafeUser> {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }
}
