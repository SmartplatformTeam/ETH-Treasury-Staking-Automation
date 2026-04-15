import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  authStubHeaderNames,
  createAuthSession,
  defaultAuthStubUser,
  findAuthStubUserByEmail,
  isUserRole,
  userRoleLabels,
  type UserRole
} from "@eth-staking/domain";

import { IS_PUBLIC_KEY } from "./auth.decorators";
import type { AuthenticatedHttpRequest } from "./auth.types";

@Injectable()
export class AuthStubGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const emailHeader = this.getHeaderValue(request, authStubHeaderNames.email);
    const roleHeader = this.getHeaderValue(request, authStubHeaderNames.role);
    const nameHeader = this.getHeaderValue(request, authStubHeaderNames.name);
    const parsedRole = roleHeader && isUserRole(roleHeader) ? roleHeader : undefined;

    if (roleHeader && !parsedRole) {
      throw new UnauthorizedException(
        `Unsupported stub role '${roleHeader}'. Use one of the documented UserRole values.`
      );
    }

    if (emailHeader) {
      const matchedUser = findAuthStubUserByEmail(emailHeader);

      if (matchedUser) {
        if (parsedRole && parsedRole !== matchedUser.role) {
          throw new UnauthorizedException(
            `Stub role '${parsedRole}' does not match '${emailHeader}', which is mapped to '${matchedUser.role}'.`
          );
        }

        request.authSession = createAuthSession(
          {
            ...matchedUser,
            name: nameHeader ?? matchedUser.name
          },
          parsedRole ? "header_email_with_role" : "header_email"
        );

        return true;
      }

      if (!parsedRole) {
        throw new UnauthorizedException(
          `Unknown stub email '${emailHeader}'. Provide '${authStubHeaderNames.role}' as well, or use a seeded stub user email.`
        );
      }

      request.authSession = createAuthSession(
        {
          email: emailHeader.trim().toLowerCase(),
          name: nameHeader ?? this.getFallbackName(parsedRole),
          role: parsedRole
        },
        "header_email_with_role"
      );

      return true;
    }

    if (parsedRole) {
      request.authSession = createAuthSession(
        {
          email: `stub.${parsedRole.toLowerCase()}@local`,
          name: nameHeader ?? this.getFallbackName(parsedRole),
          role: parsedRole
        },
        "header_role"
      );

      return true;
    }

    request.authSession = createAuthSession(defaultAuthStubUser, "default_stub");

    return true;
  }

  private getHeaderValue(
    request: AuthenticatedHttpRequest,
    headerName: string
  ): string | undefined {
    const rawValue = request.headers[headerName];

    if (Array.isArray(rawValue)) {
      return rawValue[0]?.trim() || undefined;
    }

    return rawValue?.trim() || undefined;
  }

  private getFallbackName(role: UserRole): string {
    return `Stub ${userRoleLabels[role]}`;
  }
}
