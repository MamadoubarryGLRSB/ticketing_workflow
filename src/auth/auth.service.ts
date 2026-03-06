import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
    // Mot de passe hashé avant stockage (jamais en clair en base).
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        name: dto.name,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    // Attribution du rôle USER par défaut à chaque nouvel inscrit.
    const roleUser = await this.prisma.role.findUnique({ where: { name: 'USER' } });
    if (roleUser) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: roleUser.id },
      });
    }
    // Token JWT : le front l'envoie dans le header Authorization pour les routes protégées.
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
    // Réinitialiser logoutAt pour que les anciens tokens redeviennent valides (nouvelle session).
    await this.prisma.user.update({
      where: { id: user.id },
      data: { logoutAt: null },
    });
    // On met les rôles dans le token pour que le RolesGuard puisse vérifier sans refaire un find user.
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
    });
    const { password: _, ...result } = user;
    return { user: result, access_token: token };
  }

  async logout(userId: string) {
    // Invalider tous les tokens émis avant maintenant : le JWT strategy vérifie iat < logoutAt.
    await this.prisma.user.update({
      where: { id: userId },
      data: { logoutAt: new Date() },
    });
  }

  /** Liste des utilisateurs (id, email, name) pour le sélecteur d'assignation sur les tickets. */
  async findAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, email: true, name: true },
    });
  }

  /** Supprimer le compte de l'utilisateur connecté. */
  async removeMe(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Compte supprimé' };
  }

  /** Modifier le profil (nom) et/ou le mot de passe. Si newPassword est fourni, currentPassword est requis. */
  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (dto.newPassword != null && dto.newPassword !== '') {
      if (!dto.currentPassword) {
        throw new BadRequestException('Indiquez le mot de passe actuel pour en définir un nouveau.');
      }
      if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
        throw new UnauthorizedException('Mot de passe actuel incorrect.');
      }
      // Nouveau hash + logoutAt pour invalider les tokens en cours (reconnexion obligatoire).
      const hash = await bcrypt.hash(dto.newPassword, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hash,
          logoutAt: new Date(),
          ...(dto.name !== undefined && { name: dto.name }),
        },
      });
    } else if (dto.name !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: dto.name },
      });
    }
    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return {
      user: updated,
      message: dto.newPassword ? 'Mot de passe modifié. Reconnectez-vous.' : 'Profil mis à jour.',
    };
  }

  /** Mot de passe oublié : génère un token de réinitialisation (en prod : à envoyer par email). */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.' };
    }
    // Token aléatoire + expiration 1 h ; en prod on enverrait le token par email au lieu de le renvoyer dans la réponse.
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 h
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpiresAt: expiresAt },
    });
    return {
      message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.',
      resetToken: token,
    };
  }

  /** Réinitialiser le mot de passe avec le token reçu (après mot de passe oublié). */
  async resetPassword(dto: ResetPasswordDto) {
    // Utilisateur trouvé seulement si email + token correspondent et que le token n'est pas expiré.
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        resetPasswordToken: dto.token,
        resetPasswordExpiresAt: { gt: new Date() },
      },
    });
    if (!user) {
      throw new BadRequestException('Lien invalide ou expiré. Redemandez une réinitialisation.');
    }
    const hash = await bcrypt.hash(dto.newPassword, 10);
    // Nouveau mot de passe + suppression du token + invalidation des sessions (logoutAt).
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hash, resetPasswordToken: null, resetPasswordExpiresAt: null, logoutAt: new Date() },
    });
    return { message: 'Mot de passe réinitialisé. Connectez-vous avec le nouveau mot de passe.' };
  }

  // Appelé par la JWT strategy à chaque requête sur une route protégée : vérifie que l'user existe et que le token n'a pas été révoqué (logout).
  async validateUser(payload: { sub: string; email?: string; iat?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) return null;
    // Si logoutAt > date d'émission du token (iat), le token est considéré comme révoqué.
    if (user.logoutAt && payload.iat && payload.iat < Math.floor(user.logoutAt.getTime() / 1000)) {
      return null;
    }
    const { password: _, ...result } = user;
    return { ...result, roles: result.userRoles.map((ur) => ur.role.name) };
  }
}
