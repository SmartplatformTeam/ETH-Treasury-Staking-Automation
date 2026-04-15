import { PrismaClient } from "./generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __ethStakingPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__ethStakingPrisma__ ??
  new PrismaClient({
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__ethStakingPrisma__ = prisma;
}
