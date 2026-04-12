import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository, SafeUser } from './repositories/user.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: SafeUser | Omit<SafeUser, 'createdAt'>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, name } = registerDto;

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('The email is already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userRepository.create({ email, password: hashedPassword, name });

    return { user, ...this.generateTokens(user.id) };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const safeUser: Omit<SafeUser, 'createdAt'> = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    return { user: safeUser, ...this.generateTokens(user.id) };
  }

  private generateTokens(userId: string): AuthTokens {
    const payload = { sub: userId };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
