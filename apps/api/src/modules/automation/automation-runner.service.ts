import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { Injectable } from "@nestjs/common";

import { AutomationRunStatus, AutomationRunStream, prisma } from "@eth-staking/db";

import type { AutomationCommand } from "./automation-command-builder";
import { redactLogMessage } from "./log-redactor";

@Injectable()
export class AutomationRunnerService {
  private readonly processes = new Map<string, ChildProcessWithoutNullStreams>();

  async start(runId: string, command: AutomationCommand) {
    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        status: AutomationRunStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    let nextSequence = (await prisma.automationRunEvent.count({ where: { runId } })) + 1;
    let eventChain = Promise.resolve();

    const appendEvent = (stream: AutomationRunStream, rawMessage: string) => {
      const sequence = nextSequence;
      nextSequence += 1;
      const redaction = redactLogMessage(rawMessage);

      eventChain = eventChain.then(async () => {
        await prisma.automationRunEvent.create({
          data: {
            runId,
            sequence,
            stream,
            message: redaction.message,
            redacted: redaction.redacted,
          },
        });
      });
    };

    appendEvent(
      AutomationRunStream.SYSTEM,
      `Started ${command.playbook} with inventory ${command.inventoryRef}.`,
    );

    const child = spawn(command.binary, command.args, {
      cwd: command.cwd,
      shell: false,
    });
    this.processes.set(runId, child);

    let spawnError: Error | undefined;

    child.stdout.on("data", (chunk: Buffer) => {
      appendEvent(AutomationRunStream.STDOUT, chunk.toString("utf8"));
    });

    child.stderr.on("data", (chunk: Buffer) => {
      appendEvent(AutomationRunStream.STDERR, chunk.toString("utf8"));
    });

    child.on("error", (error) => {
      spawnError = error;
      appendEvent(AutomationRunStream.SYSTEM, `Failed to start ansible-playbook: ${error.message}`);
    });

    child.on("close", (code, signal) => {
      void (async () => {
        this.processes.delete(runId);
        await eventChain;

        const currentRun = await prisma.automationRun.findUnique({
          where: { id: runId },
          select: { status: true },
        });
        const cancellationRequested = currentRun?.status === AutomationRunStatus.CANCEL_REQUESTED;
        const succeeded = code === 0 && !spawnError;
        const failureReason = spawnError
          ? spawnError.message
          : succeeded
            ? null
            : `ansible-playbook exited with code ${code ?? "unknown"}${signal ? ` and signal ${signal}` : ""}`;

        await prisma.automationRun.update({
          where: { id: runId },
          data: {
            status: cancellationRequested
              ? AutomationRunStatus.CANCELLED
              : succeeded
                ? AutomationRunStatus.SUCCEEDED
                : AutomationRunStatus.FAILED,
            completedAt: new Date(),
            exitCode: code,
            failureReason,
          },
        });

        const finalMessage = cancellationRequested
          ? "Process exited after cancellation was requested."
          : succeeded
            ? "Automation run completed successfully."
            : `Automation run failed: ${failureReason}`;

        appendEvent(AutomationRunStream.SYSTEM, finalMessage);
        await eventChain;
      })();
    });
  }
}
