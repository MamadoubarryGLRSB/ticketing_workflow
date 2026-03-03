import { Injectable, NotFoundException } from '@nestjs/common';
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
}
