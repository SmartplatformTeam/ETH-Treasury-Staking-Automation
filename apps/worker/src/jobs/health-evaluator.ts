export type HealthEvaluationJob = {
  clusterName: string;
  triggeredAt: string;
  baselineVersion: string;
};

export async function runHealthEvaluation(job: HealthEvaluationJob) {
  return {
    clusterName: job.clusterName,
    triggeredAt: job.triggeredAt,
    baselineVersion: job.baselineVersion,
    result: "pending-implementation"
  };
}
