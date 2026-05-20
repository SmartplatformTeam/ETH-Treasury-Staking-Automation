import {
  ApprovalPolicyType,
  ApprovalStatus,
  AutomationOperation,
  ClusterType,
  DepositExecutionStatus,
  DepositValidationStatus,
  DkgCeremonyStatus,
  HealthStatus,
  Network,
  NodeRole,
  Prisma,
  PrismaClient,
  SafeProposalStatus,
  SignerProvider,
  StrategyType,
  TreasuryAccountType,
  UserRole,
  ValidatorStatus
} from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [operator, approver] = await Promise.all([
    prisma.user.upsert({
      where: { email: "infra.operator@treasury.example" },
      update: {},
      create: {
        email: "infra.operator@treasury.example",
        name: "Infra Operator",
        role: UserRole.INFRA_OPERATOR
      }
    }),
    prisma.user.upsert({
      where: { email: "approver.1@treasury.example" },
      update: {},
      create: {
        email: "approver.1@treasury.example",
        name: "Primary Approver",
        role: UserRole.APPROVER
      }
    }),
    prisma.user.upsert({
      where: { email: "treasury.operator@treasury.example" },
      update: {},
      create: {
        email: "treasury.operator@treasury.example",
        name: "Treasury Operator",
        role: UserRole.TREASURY_OPERATOR
      }
    }),
    prisma.user.upsert({
      where: { email: "finance.reviewer@treasury.example" },
      update: {},
      create: {
        email: "finance.reviewer@treasury.example",
        name: "Finance Reviewer",
        role: UserRole.FINANCE_REVIEWER
      }
    }),
    prisma.user.upsert({
      where: { email: "auditor@treasury.example" },
      update: {},
      create: {
        email: "auditor@treasury.example",
        name: "Audit Reviewer",
        role: UserRole.AUDITOR
      }
    }),
    prisma.user.upsert({
      where: { email: "admin@treasury.example" },
      update: {},
      create: {
        email: "admin@treasury.example",
        name: "Platform Admin",
        role: UserRole.ADMIN
      }
    })
  ]);

  const cluster = await prisma.cluster.upsert({
    where: { name: "mainnet-obol-a" },
    update: {},
    create: {
      name: "mainnet-obol-a",
      type: ClusterType.OBOL_DVT,
      network: Network.MAINNET,
      baselineVersion: "CDVN v1.6.0",
      overlayVersion: "web3signer@2026-04-14",
      obolClusterId: "obol-mainnet-a",
      threshold: 3,
      operatorCount: 4,
      relayMode: "obol",
      signerMode: "web3signer",
      charonEnrs: ["enr://operator-1", "enr://operator-2", "enr://operator-3", "enr://operator-4"]
    }
  });

  const host = await prisma.operatorHost.upsert({
    where: { name: "operator-1" },
    update: {},
    create: {
      name: "operator-1",
      address: "203.0.113.11",
      region: "ap-northeast-2",
      profile: "baseline",
      baselineVersion: cluster.baselineVersion,
      overlayVersion: cluster.overlayVersion,
      healthStatus: HealthStatus.HEALTHY,
      clusterId: cluster.id
    }
  });

  const sandboxCluster = await prisma.cluster.upsert({
    where: { name: "team-sandbox-obol-a" },
    update: { network: Network.HOODI },
    create: {
      name: "team-sandbox-obol-a",
      type: ClusterType.OBOL_DVT,
      network: Network.HOODI,
      baselineVersion: "CDVN v1.9.5",
      overlayVersion: "web3signer@2026-05-18",
      obolClusterId: "obol-team-sandbox-a",
      threshold: 3,
      operatorCount: 4,
      relayMode: "obol",
      signerMode: "web3signer",
      charonEnrs: []
    }
  });

  const sandboxHost = await prisma.operatorHost.upsert({
    where: { name: "operator-sandbox-1" },
    update: {},
    create: {
      name: "operator-sandbox-1",
      address: "host.docker.internal",
      region: "team-server",
      profile: "baseline",
      baselineVersion: sandboxCluster.baselineVersion,
      overlayVersion: sandboxCluster.overlayVersion,
      healthStatus: HealthStatus.UNKNOWN,
      clusterId: sandboxCluster.id
    }
  });

  await prisma.validator.upsert({
    where: {
      publicKey:
        "0x90d1d0c93cc8c799c6f90d7f3742b7c565b7e61a379fedf05d4fa2ed91a70b542135f69b8b3eece641975b35891550a5"
    },
    update: {},
    create: {
      publicKey:
        "0x90d1d0c93cc8c799c6f90d7f3742b7c565b7e61a379fedf05d4fa2ed91a70b542135f69b8b3eece641975b35891550a5",
      network: Network.HOODI,
      status: ValidatorStatus.WITHDRAWN,
      strategyType: StrategyType.DVT,
      ownerEntity: "Team Sandbox",
      feeRecipient: "0x0000000000000000000000000000000000000000",
      withdrawalTarget: "0xf9d69b980fae269e61255d42fac54fae98cce214",
      signerType: "web3signer",
      clusterId: sandboxCluster.id
    }
  });

  await prisma.validator.upsert({
    where: {
      publicKey:
        "0x8f80f16f1783869c854f81c77fcd7a2a86cebc6a1ab3c5167d8ec7d18e0752612a5a2a96125e05681c0c68537571bfac"
    },
    update: {},
    create: {
      publicKey:
        "0x8f80f16f1783869c854f81c77fcd7a2a86cebc6a1ab3c5167d8ec7d18e0752612a5a2a96125e05681c0c68537571bfac",
      network: Network.HOODI,
      status: ValidatorStatus.ACTIVE,
      strategyType: StrategyType.DVT,
      ownerEntity: "Team Sandbox",
      feeRecipient: "0xd510880298982506d8a25a0a1d3777a32c9f9af4",
      withdrawalTarget: "0x968ad0f4bccd706494d9e0480fc9de764b93e655",
      signerType: "web3signer",
      clusterId: sandboxCluster.id
    }
  });

  const signer = await prisma.signer.upsert({
    where: { name: "signer-mainnet-a-1" },
    update: {},
    create: {
      name: "signer-mainnet-a-1",
      provider: SignerProvider.WEB3SIGNER,
      web3signerUrl: "http://operator-1.internal:9000",
      kmsKeyRef: "kms://mainnet-a/operator-1",
      keyAlias: "mainnet-obol-a/operator-1",
      healthStatus: HealthStatus.HEALTHY,
      clusterId: cluster.id,
      hostId: host.id
    }
  });

  const node = await prisma.node.upsert({
    where: { name: "operator-1/charon" },
    update: {},
    create: {
      name: "operator-1/charon",
      role: NodeRole.CHARON,
      provider: "bare-metal",
      region: "ap-northeast-2",
      hostName: "operator-1",
      clientType: "charon",
      clientVersion: "v1.6.0",
      endpointMetadata: { metrics: "http://operator-1.internal:3620" },
      healthStatus: HealthStatus.HEALTHY,
      lastHeartbeatAt: new Date(),
      clusterId: cluster.id,
      hostId: host.id
    }
  });

  await prisma.node.upsert({
    where: { name: "team-sandbox-obol-a/lighthouse" },
    update: {},
    create: {
      name: "team-sandbox-obol-a/lighthouse",
      role: NodeRole.CONSENSUS,
      provider: "bare-metal",
      region: "team-server",
      hostName: "operator-sandbox-1",
      clientType: "lighthouse",
      clientVersion: "v5.x",
      endpointMetadata: { beacon: "http://lighthouse:5052" },
      healthStatus: HealthStatus.UNKNOWN,
      clusterId: sandboxCluster.id,
      hostId: sandboxHost.id
    }
  });

  const validator = await prisma.validator.upsert({
    where: { publicKey: "0x8f53b8130000000000000000000000000000000000000000000000000000000001" },
    update: {},
    create: {
      publicKey: "0x8f53b8130000000000000000000000000000000000000000000000000000000001",
      network: Network.MAINNET,
      status: ValidatorStatus.ACTIVE,
      strategyType: StrategyType.DVT,
      ownerEntity: "Treasury Alpha",
      feeRecipient: "0x00000000000000000000000000000000000000f1",
      withdrawalTarget: "0x00000000000000000000000000000000000000f2",
      signerType: "web3signer",
      clusterId: cluster.id,
      signerId: signer.id,
      activeNodeId: node.id
    }
  });

  const treasuryAccount = await prisma.treasuryAccount.upsert({
    where: { safeAddress: "0x0000000000000000000000000000000000000000" },
    update: {},
    create: {
      label: "Main Treasury Safe",
      type: TreasuryAccountType.SAFE,
      network: Network.MAINNET,
      safeAddress: "0x0000000000000000000000000000000000000000",
      chainId: 1,
      isOvmAccount: true
    }
  });

  await prisma.treasuryAccount.upsert({
    where: { safeAddress: "0x000000000000000000000000000000000000beef" },
    update: {},
    create: {
      label: "Sandbox Hoodi Treasury",
      type: TreasuryAccountType.SAFE,
      network: Network.HOODI,
      safeAddress: "0x000000000000000000000000000000000000beef",
      chainId: 560048,
      isOvmAccount: true
    }
  });

  const dkgCeremony = await prisma.dkgCeremony.upsert({
    where: { ceremonyNumber: "dkg-2026-04-14-01" },
    update: {},
    create: {
      ceremonyNumber: "dkg-2026-04-14-01",
      clusterId: cluster.id,
      initiatedById: operator.id,
      status: DkgCeremonyStatus.PLANNED,
      operatorCount: 4,
      validatorCount: 4,
      baselineVersion: cluster.baselineVersion,
      overlayVersion: cluster.overlayVersion
    }
  });

  const safeProposal = await prisma.safeProposal.upsert({
    where: { proposalNumber: "safe-mainnet-88" },
    update: {},
    create: {
      proposalNumber: "safe-mainnet-88",
      treasuryAccountId: treasuryAccount.id,
      status: SafeProposalStatus.EXPORTED,
      description: "Initial deposit payload export for mainnet-obol-a",
      payloadObjectKey: "safe/mainnet/88.json",
      exportedById: approver.id
    }
  });

  const depositRequest = await prisma.depositRequest.upsert({
    where: { requestNumber: "deposit-request-2026-04-14-01" },
    update: {},
    create: {
      requestNumber: "deposit-request-2026-04-14-01",
      network: Network.MAINNET,
      ownerEntity: "Treasury Alpha",
      validatorCount: 4,
      depositDataObjectKey: "deposits/2026-04-14/request-01.json",
      validationStatus: DepositValidationStatus.VALID,
      approvalStatus: ApprovalStatus.REQUESTED,
      executionStatus: DepositExecutionStatus.EXPORTED,
      exportedPayloadObjectKey: "payloads/2026-04-14/request-01.json",
      requestedById: operator.id,
      clusterId: cluster.id,
      treasuryAccountId: treasuryAccount.id,
      safeProposalId: safeProposal.id,
      dkgCeremonyId: dkgCeremony.id
    }
  });

  await prisma.approval.deleteMany({
    where: {
      depositRequestId: depositRequest.id
    }
  });

  await prisma.approval.create({
    data: {
      resourceType: "DepositRequest",
      resourceId: depositRequest.id,
      policyType: ApprovalPolicyType.DEPOSIT_REQUEST,
      currentStep: 1,
      finalStatus: ApprovalStatus.IN_REVIEW,
      requestedById: operator.id,
      depositRequestId: depositRequest.id
    }
  });

  await prisma.approval.deleteMany({
    where: {
      clusterId: sandboxCluster.id,
      hostId: sandboxHost.id,
      policyType: ApprovalPolicyType.ROLLOUT,
      automationOperation: AutomationOperation.ROLLOUT_EXECUTE
    }
  });

  await prisma.approval.create({
    data: {
      resourceType: "AutomationRollout",
      resourceId: `${sandboxCluster.name}:${sandboxHost.name}:ROLLOUT_EXECUTE`,
      policyType: ApprovalPolicyType.ROLLOUT,
      currentStep: 1,
      finalStatus: ApprovalStatus.REQUESTED,
      requestedById: operator.id,
      clusterId: sandboxCluster.id,
      hostId: sandboxHost.id,
      automationOperation: AutomationOperation.ROLLOUT_EXECUTE
    }
  });

  await prisma.rewardLedger.deleteMany({
    where: {
      validatorId: validator.id,
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      periodEnd: new Date("2026-04-30T23:59:59.000Z")
    }
  });

  await prisma.rewardLedger.create({
    data: {
      validatorId: validator.id,
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      periodEnd: new Date("2026-04-30T23:59:59.000Z"),
      consensusReward: new Prisma.Decimal("18.42000000"),
      executionReward: new Prisma.Decimal("4.07000000"),
      mevReward: new Prisma.Decimal("0.52000000"),
      penalties: new Prisma.Decimal("0.10000000"),
      infraCostAllocated: new Prisma.Decimal("0.45000000"),
      netReward: new Prisma.Decimal("22.46000000")
    }
  });

  await prisma.auditLog.deleteMany({
    where: {
      resourceId: {
        in: [depositRequest.id, safeProposal.id]
      }
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: approver.id,
        actionType: "APPROVAL_CREATED",
        resourceType: "DepositRequest",
        resourceId: depositRequest.id,
        diff: { status: "IN_REVIEW" }
      },
      {
        actorId: approver.id,
        actionType: "SAFE_PAYLOAD_EXPORTED",
        resourceType: "SafeProposal",
        resourceId: safeProposal.id,
        diff: { payloadObjectKey: "safe/mainnet/88.json" }
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
