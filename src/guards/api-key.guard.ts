import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const apiKey = req.header('x-api-key');

    if (apiKey && apiKey === process.env.OPERATOR_API_KEY) {
      return true;
    }

    throw new ForbiddenException('Invalid API key');
  }
}
