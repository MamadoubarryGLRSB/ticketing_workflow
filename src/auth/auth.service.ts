import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un utilisateur existe déjà avec cet email');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        name: dto.name,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { user, access_token: token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { logoutAt: null },
    });
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
    });
    const { password: _, ...result } = user;
    return { user: result, access_token: token };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { logoutAt: new Date() },
    });
  }

  async validateUser(payload: { sub: string; email?: string; iat?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) return null;
    if (user.logoutAt && payload.iat && payload.iat < Math.floor(user.logoutAt.getTime() / 1000)) {
      return null;
    }
    const { password: _, ...result } = user;
    return { ...result, roles: result.userRoles.map((ur) => ur.role.name) };
  }
}
