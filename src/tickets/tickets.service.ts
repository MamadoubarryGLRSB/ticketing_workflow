import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Priority } from '@prisma/client';

/** Retire les champs *Id redondants (déjà dans workflow.id, currentState.id, assignee.id). */
function withoutRedundantIds<
  T extends { workflowId?: string | null; currentStateId?: string | null; assigneeId?: string | null },
>(ticket: T): Omit<T, 'workflowId' | 'currentStateId' | 'assigneeId'> {
  const { workflowId, currentStateId, assigneeId, ...rest } = ticket;
  return rest as Omit<T, 'workflowId' | 'currentStateId' | 'assigneeId'>;
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId },
      include: { states: { orderBy: { order: 'asc' }, take: 1 } },
    });
    if (!workflow) {
      throw new NotFoundException('Workflow introuvable');
    }
    const firstState = workflow.states[0] ?? null;

    const ticket = await this.prisma.ticket.create({
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
    return withoutRedundantIds(ticket);
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

  async update(id: string, dto: UpdateTicketDto) {
    await this.findOne(id);
    const ticket = await this.prisma.ticket.update({
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
    return withoutRedundantIds(ticket);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.ticket.delete({ where: { id } });
    return { message: 'Ticket supprimé' };
  }

  async assign(ticketId: string, assigneeId: string | null) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    if (assigneeId !== null && assigneeId !== undefined) {
      const user = await this.prisma.user.findUnique({ where: { id: assigneeId } });
      if (!user) throw new NotFoundException('Utilisateur introuvable');
    }
    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assigneeId: assigneeId ?? null },
      include: {
        workflow: true,
        currentState: true,
        assignee: { select: { id: true, email: true, name: true } },
      },
    });
    return withoutRedundantIds(updated);
  }

  /**
   * Applique une transition (ex. Ouvert → En cours). Vérifie que le ticket est bien dans l'état "from"
   * et que l'utilisateur a un des rôles requis.
   */
  async applyTransition(ticketId: string, transitionId: string, userRoles: string[] = []) {
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

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { currentStateId: transition.toStateId },
      include: {
        workflow: true,
        currentState: true,
        assignee: { select: { id: true, email: true, name: true } },
      },
    });
    return withoutRedundantIds(updated);
  }
}
