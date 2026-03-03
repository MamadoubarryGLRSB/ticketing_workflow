import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { CreateTransitionDto } from './dto/create-transition.dto';
import { UpdateTransitionDto } from './dto/update-transition.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un workflow' })
  createWorkflow(@Body() dto: CreateWorkflowDto) {
    return this.workflowsService.createWorkflow(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des workflows' })
  findAllWorkflows() {
    return this.workflowsService.findAllWorkflows();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un workflow (états + transitions)' })
  findOneWorkflow(@Param('id') id: string) {
    return this.workflowsService.findOneWorkflow(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un workflow' })
  updateWorkflow(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowsService.updateWorkflow(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un workflow' })
  removeWorkflow(@Param('id') id: string) {
    return this.workflowsService.removeWorkflow(id);
  }

  @Post(':workflowId/states')
  @ApiOperation({ summary: 'Ajouter un état au workflow' })
  createState(
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateStateDto,
  ) {
    return this.workflowsService.createState(workflowId, dto);
  }

  @Patch(':workflowId/states/:stateId')
  @ApiOperation({ summary: 'Modifier un état' })
  updateState(
    @Param('workflowId') workflowId: string,
    @Param('stateId') stateId: string,
    @Body() dto: UpdateStateDto,
  ) {
    return this.workflowsService.updateState(workflowId, stateId, dto);
  }

  @Delete(':workflowId/states/:stateId')
  @ApiOperation({ summary: 'Supprimer un état' })
  removeState(
    @Param('workflowId') workflowId: string,
    @Param('stateId') stateId: string,
  ) {
    return this.workflowsService.removeState(workflowId, stateId);
  }

  @Post(':workflowId/transitions')
  @ApiOperation({ summary: 'Ajouter une transition (rôles requis optionnels)' })
  createTransition(
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateTransitionDto,
  ) {
    return this.workflowsService.createTransition(workflowId, dto);
  }

  @Patch(':workflowId/transitions/:transitionId')
  @ApiOperation({ summary: 'Modifier une transition (ex. rôles requis)' })
  updateTransition(
    @Param('workflowId') workflowId: string,
    @Param('transitionId') transitionId: string,
    @Body() dto: UpdateTransitionDto,
  ) {
    return this.workflowsService.updateTransition(
      workflowId,
      transitionId,
      dto,
    );
  }

  @Delete(':workflowId/transitions/:transitionId')
  @ApiOperation({ summary: 'Supprimer une transition' })
  removeTransition(
    @Param('workflowId') workflowId: string,
    @Param('transitionId') transitionId: string,
  ) {
    return this.workflowsService.removeTransition(workflowId, transitionId);
  }
}
