import { headers } from "next/headers";

import {
  authStubHeaderNames,
  createAuthSession,
  defaultAuthStubUser,
  findAuthStubUserByEmail,
  isUserRole,
  userRoleLabels,
  type AuthSession
} from "@eth-staking/domain";

export async function getWebAuthSession(): Promise<AuthSession> {
  const requestHeaders = await headers();
  const emailHeader = requestHeaders.get(authStubHeaderNames.email)?.trim();
  const roleHeader = requestHeaders.get(authStubHeaderNames.role)?.trim();
  const nameHeader = requestHeaders.get(authStubHeaderNames.name)?.trim();

  if (emailHeader) {
    const matchedUser = findAuthStubUserByEmail(emailHeader);

    if (matchedUser) {
      return createAuthSession(
        {
          ...matchedUser,
          name: nameHeader || matchedUser.name
        },
        roleHeader ? "header_email_with_role" : "header_email"
      );
    }

    if (roleHeader && isUserRole(roleHeader)) {
      return createAuthSession(
        {
          email: emailHeader.toLowerCase(),
          name: nameHeader || `Stub ${userRoleLabels[roleHeader]}`,
          role: roleHeader
        },
        "header_email_with_role"
      );
    }
  }

  if (roleHeader && isUserRole(roleHeader)) {
    return createAuthSession(
      {
        email: `stub.${roleHeader.toLowerCase()}@local`,
        name: nameHeader || `Stub ${userRoleLabels[roleHeader]}`,
        role: roleHeader
      },
      "header_role"
    );
  }

  return createAuthSession(defaultAuthStubUser, "default_stub");
}
