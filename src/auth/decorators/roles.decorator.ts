import { SetMetadata } from '@nestjs/common';

// Clé utilisée par RolesGuard pour lire les rôles requis sur la route (handler ou controller).
export const ROLES_KEY = 'roles';

// Décorateur à placer sur une route ou un controller : @Roles('ADMIN') = seul un utilisateur avec le rôle ADMIN peut accéder. Utilisé avec RolesGuard.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
