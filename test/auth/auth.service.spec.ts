import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/auth/auth.service';
import { UserRepository } from '../../src/auth/repositories/user.repository';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository: jest.Mocked<Pick<UserRepository, 'findByEmail' | 'findById' | 'create'>> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService: jest.Mocked<Pick<JwtService, 'sign'>> = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('mock-token');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-1',
        email: registerDto.email,
        name: registerDto.name,
        createdAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: registerDto.email, name: registerDto.name }),
      );
      expect(result.user.email).toBe(registerDto.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.register({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should store a hashed password, not plain text', async () => {
      const registerDto = { email: 'new@example.com', password: 'plain123' };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-1',
        email: registerDto.email,
        name: null,
        createdAt: new Date(),
      });

      await service.register(registerDto);

      const createCall = mockUserRepository.create.mock.calls[0][0];
      expect(createCall.password).not.toBe('plain123');
      expect(await bcrypt.compare('plain123', createCall.password)).toBe(true);
    });
  });

  describe('login', () => {
    it('should return user and tokens with valid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        name: 'Test User',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with an incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: null,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
