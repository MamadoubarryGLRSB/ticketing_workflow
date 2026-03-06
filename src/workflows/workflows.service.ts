import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { CreateTransitionDto } from './dto/create-transition.dto';
import { UpdateTransitionDto } from './dto/update-transition.dto';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Workflows : CRUD sur les workflows (ex. Support, Bug) ----------
  async createWorkflow(dto: CreateWorkflowDto) {
    // Création du workflow avec nom et description ; states/transitions vides au départ.
    return this.prisma.workflow.create({
      data: { name: dto.name, description: dto.description ?? null },
      include: { states: true, transitions: true },
    });
  }

  async findAllWorkflows() {
    // Liste tous les workflows, états triés par order, transitions avec from/to et rôles requis.
    return this.prisma.workflow.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        states: { orderBy: { order: 'asc' } },
        transitions: { include: { fromState: true, toState: true, requiredRoles: true } },
      },
    });
  }

  async findOneWorkflow(id: string) {
    // Détail d'un workflow avec ses états et transitions (utilisé pour afficher le kanban et les boutons de transition).
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        states: { orderBy: { order: 'asc' } },
        transitions: { include: { fromState: true, toState: true, requiredRoles: true } },
      },
    });
    if (!workflow) throw new NotFoundException('Workflow introuvable');
    return workflow;
  }

  async updateWorkflow(id: string, dto: UpdateWorkflowDto) {
    await this.findOneWorkflow(id);
    // Mise à jour partielle : seuls les champs envoyés (name, description) sont modifiés.
    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { states: true, transitions: true },
    });
  }

  async removeWorkflow(id: string) {
    await this.findOneWorkflow(id);
    // Suppression en cascade : états et transitions du workflow sont aussi supprimés (schéma Prisma).
    await this.prisma.workflow.delete({ where: { id } });
    return { message: 'Workflow supprimé' };
  }

  // ---------- States : états d'un workflow (ex. Ouvert, En cours, Fermé) ----------
  async createState(workflowId: string, dto: CreateStateDto) {
    await this.findOneWorkflow(workflowId);
    // Ajout d'un état au workflow ; order sert à l'affichage (kanban, liste).
    return this.prisma.state.create({
      data: {
        workflowId,
        name: dto.name,
        order: dto.order ?? 0,
      },
    });
  }

  async updateState(workflowId: string, stateId: string, dto: UpdateStateDto) {
    // Vérifier que l'état appartient bien à ce workflow avant de modifier.
    const state = await this.prisma.state.findFirst({
      where: { id: stateId, workflowId },
    });
    if (!state) throw new NotFoundException('État introuvable');
    return this.prisma.state.update({
      where: { id: stateId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async removeState(workflowId: string, stateId: string) {
    const state = await this.prisma.state.findFirst({
      where: { id: stateId, workflowId },
    });
    if (!state) throw new NotFoundException('État introuvable');
    await this.prisma.state.delete({ where: { id: stateId } });
    return { message: 'État supprimé' };
  }

  // ---------- Transitions : lien entre deux états (ex. Ouvert -> En cours), avec rôles requis optionnels ----------
  async createTransition(workflowId: string, dto: CreateTransitionDto) {
    const workflow = await this.findOneWorkflow(workflowId);
    // fromState et toState doivent être des états de ce workflow.
    const fromState = workflow.states.find((s) => s.id === dto.fromStateId);
    const toState = workflow.states.find((s) => s.id === dto.toStateId);
    if (!fromState || !toState) {
      throw new NotFoundException('fromStateId et toStateId doivent appartenir à ce workflow');
    }
    // requiredRoleIds : seuls les utilisateurs avec un de ces rôles pourront appliquer cette transition.
    return this.prisma.transition.create({
      data: {
        workflowId,
        fromStateId: dto.fromStateId,
        toStateId: dto.toStateId,
        requiredRoles: dto.requiredRoleIds?.length
          ? { connect: dto.requiredRoleIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { fromState: true, toState: true, requiredRoles: true },
    });
  }

  async updateTransition(workflowId: string, transitionId: string, dto: UpdateTransitionDto) {
    const transition = await this.prisma.transition.findFirst({
      where: { id: transitionId, workflowId },
    });
    if (!transition) throw new NotFoundException('Transition introuvable');
    const workflow = await this.findOneWorkflow(workflowId);
    // Construction des données à mettre à jour en vérifiant que from/to appartiennent au workflow.
    const data: { fromStateId?: string; toStateId?: string; requiredRoles?: { set: { id: string }[] } } = {};
    if (dto.fromStateId !== undefined) {
      if (!workflow.states.some((s) => s.id === dto.fromStateId))
        throw new NotFoundException('fromStateId doit appartenir à ce workflow');
      data.fromStateId = dto.fromStateId;
    }
    if (dto.toStateId !== undefined) {
      if (!workflow.states.some((s) => s.id === dto.toStateId))
        throw new NotFoundException('toStateId doit appartenir à ce workflow');
      data.toStateId = dto.toStateId;
    }
    if (dto.requiredRoleIds !== undefined) {
      data.requiredRoles = { set: dto.requiredRoleIds.map((id) => ({ id })) };
    }
    return this.prisma.transition.update({
      where: { id: transitionId },
      data,
      include: { fromState: true, toState: true, requiredRoles: true },
    });
  }

  async removeTransition(workflowId: string, transitionId: string) {
    const transition = await this.prisma.transition.findFirst({
      where: { id: transitionId, workflowId },
    });
    if (!transition) throw new NotFoundException('Transition introuvable');
    await this.prisma.transition.delete({ where: { id: transitionId } });
    return { message: 'Transition supprimée' };
  }
}
