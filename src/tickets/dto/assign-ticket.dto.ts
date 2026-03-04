import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AssignTicketDto {
  @ApiPropertyOptional({
    description: 'ID de l’utilisateur à assigner. Omettre ou null pour désassigner.',
  })
  @IsOptional()
  @ValidateIf((o) => o.assigneeId != null && o.assigneeId !== '')
  @IsString()
  @Matches(UUID_REGEX, { message: 'assigneeId doit être un UUID valide' })
  assigneeId?: string | null;
}
