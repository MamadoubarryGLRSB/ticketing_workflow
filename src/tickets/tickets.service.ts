import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Prisma, Priority } from '@prisma/client';

/** Retire les champs *Id redondants (déjà dans workflow.id, currentState.id, assignee.id). */
function withoutRedundantIds<
  T extends { workflowId?: string | null; currentStateId?: string | null; assigneeId?: string | null },
>(ticket: T): Omit<T, 'workflowId' | 'currentStateId' | 'assigneeId'> {
  const { workflowId, currentStateId, assigneeId, ...rest } = ticket;
  return rest as Omit<T, 'workflowId' | 'currentStateId' | 'assigneeId'>;
}

/** Types d’événements pour l’event sourcing (store séparé de la projection Ticket). */
const EVENT_TYPES = {
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_UPDATED: 'TICKET_UPDATED',
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  TRANSITION_APPLIED: 'TRANSITION_APPLIED',
} as const;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto, userId?: string | null) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId },
      include: { states: { orderBy: { order: 'asc' }, take: 1 } },
    });
    if (!workflow) {
      throw new NotFoundException('Workflow introuvable');
    }
    const firstState = workflow.states[0] ?? null;

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          title: dto.title,
          description: dto.description,
          priority: dto.priority ?? Priority.MEDIUM,
          tags: dto.tags ?? [],
          workflowId: dto.workflowId,
          currentStateId: firstState?.id ?? null,
        },
        include: {
          workflow: true,
          currentState: true,
          assignee: { select: { id: true, email: true, name: true } },
        },
      });
      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          type: EVENT_TYPES.TICKET_CREATED,
          payload: {
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            tags: ticket.tags,
            workflowId: ticket.workflowId,
            currentStateId: ticket.currentStateId,
          },
          userId: userId ?? null,
        },
      });
      return withoutRedundantIds(ticket);
    });
  }

  async findAll() {
    const tickets = await this.prisma.ticket.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        workflow: true,
        currentState: true,
        assignee: { select: { id: true, email: true, name: true } },
      },
    });
    return tickets.map(withoutRedundantIds);
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        workflow: true,
        currentState: true,
        assignee: { select: { id: true, email: true, name: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    return withoutRedundantIds(ticket);
  }

  /** Historique immuable des événements du ticket (event sourcing). */
  async getEvents(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    return this.prisma.ticketEvent.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, type: true, payload: true, userId: true, createdAt: true },
    });
  }

  async update(id: string, dto: UpdateTicketDto, userId?: string | null) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.priority !== undefined && { priority: dto.priority }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
          ...(dto.workflowId !== undefined && { workflowId: dto.workflowId, currentStateId: null }),
        },
        include: {
          workflow: true,
          currentState: true,
          assignee: { select: { id: true, email: true, name: true } },
        },
      });
      await tx.ticketEvent.create({
        data: {
          ticketId: id,
          type: EVENT_TYPES.TICKET_UPDATED,
          payload: { changes: dto } as unknown as Prisma.InputJsonValue,
          userId: userId ?? null,
        },
      });
      return withoutRedundantIds(ticket);
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.ticket.delete({ where: { id } });
    return { message: 'Ticket supprimé' };
  }

  async assign(ticketId: string, assigneeId: string | null, userId?: string | null) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    if (assigneeId !== null && assigneeId !== undefined) {
      const user = await this.prisma.user.findUnique({ where: { id: assigneeId } });
      if (!user) throw new NotFoundException('Utilisateur introuvable');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { assigneeId: assigneeId ?? null },
        include: {
          workflow: true,
          currentState: true,
          assignee: { select: { id: true, email: true, name: true } },
        },
      });
      await tx.ticketEvent.create({
        data: {
          ticketId,
          type: EVENT_TYPES.TICKET_ASSIGNED,
          payload: { assigneeId: assigneeId ?? null },
          userId: userId ?? null,
        },
      });
      return withoutRedundantIds(updated);
    });
  }

  /**
   * Applique une transition (ex. Ouvert → En cours). Vérifie que le ticket est bien dans l'état "from"
   * et que l'utilisateur a un des rôles requis.
   */
  async applyTransition(
    ticketId: string,
    transitionId: string,
    userRoles: string[] = [],
    userId?: string | null,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { workflow: true, currentState: true },
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable');

    const transition = await this.prisma.transition.findFirst({
      where: { id: transitionId, workflowId: ticket.workflowId },
      include: { fromState: true, toState: true, requiredRoles: true },
    });
    if (!transition) throw new NotFoundException('Transition introuvable ou ne concerne pas ce workflow');

    if (ticket.currentStateId !== transition.fromStateId) {
      throw new BadRequestException(
        `Le ticket doit être dans l'état "${transition.fromState.name}" pour cette transition. État actuel : ${ticket.currentState?.name ?? 'aucun'}.`,
      );
    }

    const requiredRoleNames = transition.requiredRoles.map((r) => r.name);
    if (requiredRoleNames.length > 0) {
      const hasRole = userRoles.some((r) => requiredRoleNames.includes(r));
      if (!hasRole) {
        throw new ForbiddenException(
          `Rôle requis pour cette transition : ${requiredRoleNames.join(' ou ')}.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { currentStateId: transition.toStateId },
        include: {
          workflow: true,
          currentState: true,
          assignee: { select: { id: true, email: true, name: true } },
        },
      });
      await tx.ticketEvent.create({
        data: {
          ticketId,
          type: EVENT_TYPES.TRANSITION_APPLIED,
          payload: {
            fromStateId: transition.fromStateId,
            toStateId: transition.toStateId,
            transitionId,
          },
          userId: userId ?? null,
        },
      });
      return withoutRedundantIds(updated);
    });
  }

  /**
   * Reconstruit l’état courant d’un ticket en rejouant ses événements (event sourcing).
   * La table Ticket reste la source de vérité pour la lecture ; cette méthode sert à l’audit ou à la réparation.
   */
  async reconstituteStateFromEvents(
    ticketId: string,
  ): Promise<{
    title: string;
    description: string | null;
    priority: string;
    tags: string[];
    workflowId: string;
    currentStateId: string | null;
    assigneeId: string | null;
  } | null> {
    const events = await this.prisma.ticketEvent.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
    if (events.length === 0) return null;

    type State = {
      title: string;
      description: string | null;
      priority: string;
      tags: string[];
      workflowId: string;
      currentStateId: string | null;
      assigneeId: string | null;
    };
    let state: State | null = null;

    for (const e of events) {
      const payload = e.payload as Record<string, unknown>;
      switch (e.type) {
        case EVENT_TYPES.TICKET_CREATED:
          state = {
            title: (payload.title as string) ?? '',
            description: (payload.description as string | null) ?? null,
            priority: (payload.priority as string) ?? 'MEDIUM',
            tags: Array.isArray(payload.tags) ? (payload.tags as string[]) : [],
            workflowId: (payload.workflowId as string) ?? '',
            currentStateId: (payload.currentStateId as string | null) ?? null,
            assigneeId: null,
          };
          break;
        case EVENT_TYPES.TICKET_UPDATED: {
          const changes = payload.changes as Record<string, unknown> | undefined;
          if (state && changes) {
            if (changes.title !== undefined) state.title = changes.title as string;
            if (changes.description !== undefined) state.description = changes.description as string | null;
            if (changes.priority !== undefined) state.priority = changes.priority as string;
            if (changes.tags !== undefined) state.tags = Array.isArray(changes.tags) ? (changes.tags as string[]) : state.tags;
            if (changes.workflowId !== undefined) {
              state.workflowId = changes.workflowId as string;
              state.currentStateId = null;
            }
          }
          break;
        }
        case EVENT_TYPES.TICKET_ASSIGNED:
          if (state) state.assigneeId = (payload.assigneeId as string | null) ?? null;
          break;
        case EVENT_TYPES.TRANSITION_APPLIED:
          if (state && payload.toStateId !== undefined) state.currentStateId = payload.toStateId as string | null;
          break;
      }
    }
    return state;
  }
}
