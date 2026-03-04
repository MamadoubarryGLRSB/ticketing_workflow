import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ApplyTransitionDto } from './dto/apply-transition.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un ticket' })
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des tickets' })
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un ticket' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assigner ou réassigner le ticket (assigneeId null pour désassigner)' })
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.ticketsService.assign(id, dto.assigneeId ?? null);
  }

  @Post(':id/transition')
  @ApiOperation({
    summary: 'Faire passer le ticket à l’état suivant (ex. Ouvert → En cours). Envoyer l’id de la transition (voir GET /workflows/:id).',
  })
  applyTransition(
    @Param('id') id: string,
    @Body() dto: ApplyTransitionDto,
    @CurrentUser() user: { roles?: string[] },
  ) {
    return this.ticketsService.applyTransition(id, dto.transitionId, user?.roles ?? []);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un ticket' })
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un ticket' })
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}
