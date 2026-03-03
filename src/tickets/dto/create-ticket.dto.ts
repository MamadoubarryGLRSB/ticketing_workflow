import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, MinLength, Matches } from 'class-validator';
import { Priority } from '@prisma/client';

// Format UUID (8-4-4-4-12 hex), toute version acceptée (dont seed 00000000-...)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateTicketDto {
  @ApiProperty({ example: 'Bug login' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 'Le bouton login ne répond pas' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ example: ['bug', 'front'], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'ID du workflow (UUID)', example: '00000000-0000-0000-0000-000000000001' })
  @IsString()
  @Matches(UUID_REGEX, { message: 'workflowId doit être un UUID valide' })
  workflowId: string;
}
