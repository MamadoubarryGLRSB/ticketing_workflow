import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ApplyTransitionDto {
  @ApiProperty({
    description: 'ID de la transition à appliquer (ex. Ouvert → En cours). Voir GET /workflows/:id pour lister les transitions.',
  })
  @IsString()
  @Matches(UUID_REGEX, { message: 'transitionId doit être un UUID valide' })
  transitionId: string;
}
