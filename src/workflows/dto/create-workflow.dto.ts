import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Support' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Workflow pour les tickets support' })
  @IsOptional()
  @IsString()
  description?: string;
}
