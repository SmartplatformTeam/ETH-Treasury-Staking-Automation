import { Controller, Get } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  authStubHeaderNames,
  authStubUsers,
  getRolePermissions,
  opsNavigation,
  userRoleDescriptions,
  userRoleLabels,
  userRoles,
  type AuthSession
} from "@eth-staking/domain";

import { CurrentSession, RequirePermissions } from "./auth.decorators";

const knownStubUserSummary = authStubUsers
  .map((user) => `${user.email} (${user.role})`)
  .join(", ");

@ApiTags("auth")
@ApiHeader({
  name: authStubHeaderNames.email,
  required: false,
  description: `Stub user email. Known users: ${knownStubUserSummary}.`
})
@ApiHeader({
  name: authStubHeaderNames.role,
  required: false,
  description: "Optional UserRole override when using an ad-hoc stub identity."
})
@ApiHeader({
  name: authStubHeaderNames.name,
  required: false,
  description: "Optional display name override for the stub session."
})
@Controller("auth")
export class AuthController {
  @Get("session")
  @ApiOperation({ summary: "Resolve the current stub session and effective RBAC grants." })
  getSession(@CurrentSession() session: AuthSession) {
    return {
      session,
      visibleNavigation: opsNavigation.filter((item) =>
        session.permissions.includes(item.requiredPermission)
      ),
      knownStubUsers: authStubUsers
    };
  }

  @Get("rbac-matrix")
  @RequirePermissions("rbac:manage")
  @ApiOperation({ summary: "Inspect the shared role-to-permission matrix used by the API." })
  getRbacMatrix(@CurrentSession() session: AuthSession) {
    return {
      requestedBy: {
        email: session.email,
        role: session.role
      },
      roles: userRoles.map((role) => ({
        role,
        label: userRoleLabels[role],
        description: userRoleDescriptions[role],
        permissions: getRolePermissions(role)
      })),
      navigation: opsNavigation.map((item) => ({
        href: item.href,
        label: item.label,
        requiredPermission: item.requiredPermission
      }))
    };
  }
}
