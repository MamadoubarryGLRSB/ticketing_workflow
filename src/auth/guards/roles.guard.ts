import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Guard à utiliser avec @Roles('ADMIN') : vérifie que request.user.roles contient au moins un des rôles requis. À placer après JwtAuthGuard (pour que user soit déjà rempli).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lire les rôles requis sur la méthode (handler) ou la classe (controller) ; si aucun @Roles, on laisse passer.
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.roles) return false;

    // L'utilisateur doit avoir au moins un des rôles demandés (ex. ADMIN pour les routes de suppression).
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
