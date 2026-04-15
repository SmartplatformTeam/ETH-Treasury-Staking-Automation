export const userRoles = [
  "ADMIN",
  "TREASURY_OPERATOR",
  "INFRA_OPERATOR",
  "APPROVER",
  "FINANCE_REVIEWER",
  "AUDITOR"
] as const;

export type UserRole = (typeof userRoles)[number];

export const rbacPermissions = [
  "dashboard:read",
  "inventory:read",
  "alerts:read",
  "deposits:read",
  "deposits:write",
  "approvals:read",
  "approvals:decide",
  "rewards:read",
  "audit:read",
  "safe-proposals:write",
  "rbac:manage"
] as const;

export type RbacPermission = (typeof rbacPermissions)[number];

export type AuthSessionSource =
  | "default_stub"
  | "header_email"
  | "header_role"
  | "header_email_with_role";

export type AuthStubUser = {
  email: string;
  name: string;
  role: UserRole;
};

export type AuthSession = AuthStubUser & {
  source: AuthSessionSource;
  permissions: RbacPermission[];
};

export const authStubHeaderNames = {
  email: "x-eth-user-email",
  role: "x-eth-user-role",
  name: "x-eth-user-name"
} as const;

export const userRoleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  TREASURY_OPERATOR: "Treasury Operator",
  INFRA_OPERATOR: "Infra Operator",
  APPROVER: "Approver",
  FINANCE_REVIEWER: "Finance Reviewer",
  AUDITOR: "Auditor"
};

export const userRoleDescriptions: Record<UserRole, string> = {
  ADMIN: "Full control over inventory, approvals, audit, and RBAC configuration.",
  TREASURY_OPERATOR: "Owns deposit preparation, treasury workflows, and Safe export coordination.",
  INFRA_OPERATOR: "Owns node, cluster, signer, and runtime health operations.",
  APPROVER: "Reviews and decides approval-gated workflows before risky actions proceed.",
  FINANCE_REVIEWER: "Reviews rewards, exports, and treasury-facing accounting flows.",
  AUDITOR: "Read-only access for oversight, traceability, and post-incident review."
};

export const authStubUsers: AuthStubUser[] = [
  {
    email: "infra.operator@treasury.example",
    name: "Infra Operator",
    role: "INFRA_OPERATOR"
  },
  {
    email: "treasury.operator@treasury.example",
    name: "Treasury Operator",
    role: "TREASURY_OPERATOR"
  },
  {
    email: "approver.1@treasury.example",
    name: "Primary Approver",
    role: "APPROVER"
  },
  {
    email: "finance.reviewer@treasury.example",
    name: "Finance Reviewer",
    role: "FINANCE_REVIEWER"
  },
  {
    email: "auditor@treasury.example",
    name: "Audit Reviewer",
    role: "AUDITOR"
  },
  {
    email: "admin@treasury.example",
    name: "Platform Admin",
    role: "ADMIN"
  }
];

export const defaultAuthStubUser: AuthStubUser = {
  email: "infra.operator@treasury.example",
  name: "Infra Operator",
  role: "INFRA_OPERATOR"
};

const rolePermissionMatrix = {
  ADMIN: rbacPermissions,
  TREASURY_OPERATOR: [
    "dashboard:read",
    "inventory:read",
    "alerts:read",
    "deposits:read",
    "deposits:write",
    "approvals:read",
    "rewards:read",
    "safe-proposals:write"
  ],
  INFRA_OPERATOR: [
    "dashboard:read",
    "inventory:read",
    "alerts:read",
    "approvals:read",
    "audit:read"
  ],
  APPROVER: [
    "dashboard:read",
    "inventory:read",
    "alerts:read",
    "deposits:read",
    "approvals:read",
    "approvals:decide",
    "audit:read"
  ],
  FINANCE_REVIEWER: [
    "dashboard:read",
    "deposits:read",
    "approvals:read",
    "rewards:read",
    "audit:read"
  ],
  AUDITOR: [
    "dashboard:read",
    "inventory:read",
    "alerts:read",
    "deposits:read",
    "approvals:read",
    "rewards:read",
    "audit:read"
  ]
} satisfies Record<UserRole, readonly RbacPermission[]>;

export function isUserRole(value: string): value is UserRole {
  return userRoles.some((role) => role === value);
}

export function getRolePermissions(role: UserRole): RbacPermission[] {
  return [...rolePermissionMatrix[role]];
}

export function hasPermission(
  subject: UserRole | Pick<AuthSession, "permissions">,
  permission: RbacPermission
): boolean {
  if (typeof subject === "string") {
    return getRolePermissions(subject).includes(permission);
  }

  return subject.permissions.includes(permission);
}

export function findAuthStubUserByEmail(email: string): AuthStubUser | undefined {
  const normalizedEmail = email.trim().toLowerCase();

  return authStubUsers.find((user) => user.email.toLowerCase() === normalizedEmail);
}

export function createAuthSession(
  user: AuthStubUser,
  source: AuthSessionSource
): AuthSession {
  return {
    ...user,
    source,
    permissions: getRolePermissions(user.role)
  };
}
