import { Controller, Post, Body, Get, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Inscription' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Connexion' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil utilisateur connecté' })
  me(@CurrentUser() user: unknown) {
    return user;
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des utilisateurs (pour assignation de tickets : id, email, nom)' })
  findAllUsers() {
    return this.authService.findAllUsers();
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier mon profil (nom) et/ou mon mot de passe (currentPassword + newPassword requis)' })
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(user.id, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer mon compte' })
  removeMe(@CurrentUser() user: { id: string }) {
    return this.authService.removeMe(user.id);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Mot de passe oublié — génère un token (réponse : resetToken pour test ; en prod : envoi par email)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le token reçu après forgot-password' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion — invalide le token immédiatement' })
  async logout(@CurrentUser() user: { id: string }) {
    await this.authService.logout(user.id);
    return { message: 'Déconnecté' };
  }
}
