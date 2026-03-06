import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Décorateur de paramètre : dans une route protégée par JwtAuthGuard, @CurrentUser() injecte l'objet user attaché par la JWT strategy (id, email, roles, etc.).
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
