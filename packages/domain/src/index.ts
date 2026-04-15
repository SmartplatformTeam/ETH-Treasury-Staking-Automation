import type { RbacPermission } from "./auth";

export type StatusTone = "healthy" | "degraded" | "critical" | "warning" | "neutral";

export type MetricCard = {
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
};

export type NavItem = {
  href: string;
  label: string;
  description: string;
  requiredPermission: RbacPermission;
};

export type ValidatorRow = {
  publicKey: string;
  status: string;
  strategy: string;
  cluster: string;
  ownerEntity: string;
};

export type NodeRow = {
  name: string;
  role: string;
  client: string;
  region: string;
  status: string;
  lastHeartbeat: string;
};

export type ClusterRow = {
  name: string;
  baselineVersion: string;
  overlayVersion: string;
  threshold: string;
  signerPath: string;
  status: string;
};

export type AlertRow = {
  source: string;
  severity: string;
  summary: string;
  acknowledged: string;
};

export type ApprovalRow = {
  resource: string;
  policy: string;
  status: string;
  requestedBy: string;
};

export type RewardRow = {
  period: string;
  strategy: string;
  consensusReward: string;
  executionReward: string;
  netApr: string;
};

export type AuditRow = {
  actor: string;
  action: string;
  resource: string;
  timestamp: string;
};

export const opsNavigation: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    description: "fleet summary and approval pressure",
    requiredPermission: "dashboard:read"
  },
  {
    href: "/validators",
    label: "Validators",
    description: "inventory and policy bindings",
    requiredPermission: "inventory:read"
  },
  {
    href: "/nodes",
    label: "Nodes",
    description: "operator runtime and heartbeat",
    requiredPermission: "inventory:read"
  },
  {
    href: "/clusters",
    label: "Clusters",
    description: "Obol CDVN baseline and topology",
    requiredPermission: "inventory:read"
  },
  {
    href: "/signers",
    label: "Signers",
    description: "remote signer endpoints and KMS bindings",
    requiredPermission: "inventory:read"
  },
  {
    href: "/alerts",
    label: "Alerts",
    description: "severity queue and routing state",
    requiredPermission: "alerts:read"
  },
  {
    href: "/deposits",
    label: "Deposits",
    description: "requests, DKG, export flow",
    requiredPermission: "deposits:read"
  },
  {
    href: "/approvals",
    label: "Approvals",
    description: "human control path for risky actions",
    requiredPermission: "approvals:read"
  },
  {
    href: "/rewards",
    label: "Rewards",
    description: "treasury reporting and net yield",
    requiredPermission: "rewards:read"
  },
  {
    href: "/audit",
    label: "Audit",
    description: "operator actions and payload history",
    requiredPermission: "audit:read"
  }
];

export const dashboardMetrics: MetricCard[] = [
  { label: "Validator Fleet", value: "128", detail: "124 active, 4 pending deposit", tone: "healthy" },
  { label: "Operator Hosts", value: "4 / 4", detail: "CDVN baseline aligned", tone: "healthy" },
  { label: "Approval Queue", value: "3", detail: "2 deposit, 1 rollout", tone: "warning" },
  { label: "Critical Alerts", value: "1", detail: "charon peer churn on operator-3", tone: "critical" }
];

export const validatorRows: ValidatorRow[] = [
  {
    publicKey: "0x8f53...b813",
    status: "ACTIVE",
    strategy: "DVT",
    cluster: "mainnet-obol-a",
    ownerEntity: "Treasury Alpha"
  },
  {
    publicKey: "0x3ac2...01af",
    status: "PENDING_DEPOSIT",
    strategy: "DVT",
    cluster: "mainnet-obol-b",
    ownerEntity: "Treasury Alpha"
  },
  {
    publicKey: "0x76b1...92fd",
    status: "ACTIVE",
    strategy: "RESTAKING",
    cluster: "mainnet-obol-a",
    ownerEntity: "Treasury Beta"
  }
];

export const nodeRows: NodeRow[] = [
  {
    name: "operator-1/charon",
    role: "CHARON",
    client: "charon v1.6.x",
    region: "ap-northeast-2",
    status: "HEALTHY",
    lastHeartbeat: "2026-04-14T14:54:00+09:00"
  },
  {
    name: "operator-2/lighthouse",
    role: "CONSENSUS",
    client: "lighthouse v7.x",
    region: "ap-northeast-2",
    status: "HEALTHY",
    lastHeartbeat: "2026-04-14T14:54:05+09:00"
  },
  {
    name: "operator-3/web3signer",
    role: "SIGNER",
    client: "web3signer v25.x",
    region: "ap-northeast-2",
    status: "DEGRADED",
    lastHeartbeat: "2026-04-14T14:53:41+09:00"
  }
];

export const clusterRows: ClusterRow[] = [
  {
    name: "mainnet-obol-a",
    baselineVersion: "CDVN v1.6.0",
    overlayVersion: "web3signer@2026-04-14",
    threshold: "3 / 4",
    signerPath: "Web3Signer + KMS",
    status: "HEALTHY"
  },
  {
    name: "mainnet-obol-b",
    baselineVersion: "CDVN v1.6.0",
    overlayVersion: "web3signer@2026-04-14",
    threshold: "3 / 4",
    signerPath: "Web3Signer + KMS",
    status: "PLANNING_DKG"
  }
];

export const alertRows: AlertRow[] = [
  {
    source: "operator-3/charon",
    severity: "CRITICAL",
    summary: "peer churn above threshold for 7m",
    acknowledged: "false"
  },
  {
    source: "operator-4/disk",
    severity: "WARNING",
    summary: "execution client volume above 78%",
    acknowledged: "true"
  }
];

export const approvalRows: ApprovalRow[] = [
  {
    resource: "deposit-request-2026-04-14-01",
    policy: "DEPOSIT_REQUEST",
    status: "REQUESTED",
    requestedBy: "infra.operator@treasury.example"
  },
  {
    resource: "cluster-rollout-mainnet-obol-a",
    policy: "ROLLOUT",
    status: "IN_REVIEW",
    requestedBy: "release.bot@treasury.example"
  }
];

export const rewardRows: RewardRow[] = [
  {
    period: "2026-04",
    strategy: "DVT",
    consensusReward: "18.42 ETH",
    executionReward: "4.07 ETH",
    netApr: "3.84%"
  },
  {
    period: "2026-04",
    strategy: "RESTAKING",
    consensusReward: "5.18 ETH",
    executionReward: "1.11 ETH",
    netApr: "4.02%"
  }
];

export const auditRows: AuditRow[] = [
  {
    actor: "approver.1@treasury.example",
    action: "APPROVAL_CREATED",
    resource: "deposit-request-2026-04-14-01",
    timestamp: "2026-04-14T14:22:10+09:00"
  },
  {
    actor: "ops.bot@treasury.example",
    action: "SAFE_PAYLOAD_EXPORTED",
    resource: "safe-proposal-mainnet-88",
    timestamp: "2026-04-14T14:31:44+09:00"
  }
];

export * from "./auth";
