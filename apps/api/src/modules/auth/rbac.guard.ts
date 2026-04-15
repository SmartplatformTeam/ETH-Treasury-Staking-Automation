import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { hasPermission, type RbacPermission, type UserRole } from "@eth-staking/domain";

import {
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY
} from "./auth.decorators";
import type { AuthenticatedHttpRequest } from "./auth.types";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<RbacPermission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );
    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const session = request.authSession;

    if (!session) {
      throw new ForbiddenException("RBAC guard ran before an auth session was resolved.");
    }

    if (requiredRoles && !requiredRoles.includes(session.role)) {
      throw new ForbiddenException(
        `Role '${session.role}' cannot access this resource. Required roles: ${requiredRoles.join(", ")}.`
      );
    }

    if (
      requiredPermissions &&
      !requiredPermissions.every((permission) => hasPermission(session, permission))
    ) {
      throw new ForbiddenException(
        `Role '${session.role}' is missing one or more required permissions.`
      );
    }

    return true;
  }
}
