import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Jean Dupont' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Requis si newPassword est fourni', example: 'ancienMotDePasse' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiPropertyOptional({ description: 'Nouveau mot de passe (fournir aussi currentPassword)', example: 'nouveauMotDePasse', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}
