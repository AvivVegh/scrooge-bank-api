import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

export const Roles =
  (...roles: string[]) =>
  (target, key?, desc?) =>
    Reflect.defineMetadata(ROLES_KEY, roles, desc?.value ?? target);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!allowed?.length) {
      return true;
    }

    const { user } = ctx.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException();
    }

    if (allowed.some(r => user.roles?.includes(r))) {
      return true;
    }

    throw new ForbiddenException('Insufficient role');
  }
}
