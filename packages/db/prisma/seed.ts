import {
  ApprovalPolicyType,
  ApprovalStatus,
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
