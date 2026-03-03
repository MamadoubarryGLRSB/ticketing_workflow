import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateTransitionDto {
  @ApiProperty({ description: 'ID de l\'état source (UUID)', example: '10e016cf-e515-4140-9c5b-0878728ec87a' })
  @IsString()
  @Matches(UUID_REGEX, { message: 'fromStateId doit être un UUID valide' })
  fromStateId: string;

  @ApiProperty({ description: 'ID de l\'état cible (UUID)', example: 'a0173d55-fc83-4f1b-8a11-d2c290a95a47' })
  @IsString()
  @Matches(UUID_REGEX, { message: 'toStateId doit être un UUID valide' })
  toStateId: string;

  @ApiPropertyOptional({ description: 'IDs des rôles autorisés à exécuter cette transition', example: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredRoleIds?: string[];
}
