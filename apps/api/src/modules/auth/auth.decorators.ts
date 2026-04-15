import {
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
  type ExecutionContext
} from "@nestjs/common";

import type { AuthSession, RbacPermission, UserRole } from "@eth-staking/domain";

import type { AuthenticatedHttpRequest } from "./auth.types";

export const IS_PUBLIC_KEY = "is_public";
export const REQUIRED_ROLES_KEY = "required_roles";
export const REQUIRED_PERMISSIONS_KEY = "required_permissions";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RequireRoles = (...roles: UserRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);

export const RequirePermissions = (...permissions: RbacPermission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthSession => {
    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();

    if (!request.authSession) {
      throw new UnauthorizedException("Auth session was not attached to the request.");
    }

    return request.authSession;
  }
);
