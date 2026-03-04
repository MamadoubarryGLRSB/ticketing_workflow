import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Token reçu après appel à POST /auth/forgot-password (en prod : envoyé par email)' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'nouveauMotDePasse', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
