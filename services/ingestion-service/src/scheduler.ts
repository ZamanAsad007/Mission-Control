import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection } from './redis';
import { NasaClient } from '@mission-control/nasa-client';
import { startIngestionRun, finishIngestionRun, getPool } from '@mission-control/db';
import { runApodJob } from './jobs/apod.job';
import { runNeoWsJob } from './jobs/neows.job';
import { config } from './config';

export const INGESTION_QUEUE_NAME = 'nasa-ingestion-queue';

export class IngestionScheduler {
  private queue: Queue;
  private worker: Worker | null = null;
  private nasaClient: NasaClient;

  constructor(nasaClient?: NasaClient) {
    this.nasaClient = nasaClient || new NasaClient({ apiKey: config.nasaApiKey });
    const connection = getRedisConnection();

    this.queue = new Queue(INGESTION_QUEUE_NAME, {
      connection,
    });
  }

  public async init(): Promise<void> {
    const connection = getRedisConnection();

    this.worker = new Worker(
      INGESTION_QUEUE_NAME,
      async (job: Job) => {
        return this.processJob(job.name, job.data);
      },
      {
        connection,
        concurrency: 2,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[Scheduler] Job ${job.name} (id: ${job.id}) completed successfully.`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[Scheduler] Job ${job?.name} (id: ${job?.id}) failed: ${err.message}`);
    });

    await this.setupRepeatableJobs();
  }

  public async setupRepeatableJobs(): Promise<void> {
    // BullMQ repeatable jobs
    // Job 1: APOD daily at 01:00 UTC
    await this.queue.add(
      'apod_job',
      {},
      {
        repeat: {
          pattern: '0 1 * * *',
        },
        jobId: 'repeatable-apod-job',
        removeOnComplete: true,
      }
    );

    // Job 2: NeoWs asteroids every 4 hours
    await this.queue.add(
      'neows_job',
      {},
      {
        repeat: {
          pattern: '0 */4 * * *',
        },
        jobId: 'repeatable-neows-job',
        removeOnComplete: true,
      }
    );

    console.log('[Scheduler] Repeatable jobs scheduled: APOD (daily), NeoWs (every 4h)');
  }

  public async triggerJob(jobName: string, data: any = {}): Promise<Job> {
    console.log(`[Scheduler] Manually triggering job: ${jobName}`);
    return this.queue.add(jobName, data, {
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  public async processJob(jobName: string, data: any = {}): Promise<any> {
    const pool = getPool();
    const runId = await startIngestionRun(jobName, pool);

    try {
      let recordsUpserted = 0;
      let resultDetails: any = null;

      if (jobName === 'apod_job') {
        const res = await runApodJob(this.nasaClient, pool, data.date);
        recordsUpserted = res.count;
        resultDetails = res;
      } else if (jobName === 'neows_job') {
        const res = await runNeoWsJob(this.nasaClient, pool, data.startDate, data.endDate);
        recordsUpserted = res.count;
        resultDetails = res;
      } else {
        throw new Error(`Unknown job name: ${jobName}`);
      }

      await finishIngestionRun(runId, 'completed', recordsUpserted, null, pool);
      return { success: true, recordsUpserted, details: resultDetails };
    } catch (err: any) {
      console.error(`[Scheduler] Error running ${jobName}:`, err.message);
      await finishIngestionRun(runId, 'failed', 0, err.message, pool);
      throw err;
    }
  }

  public async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    await this.queue.close();
  }
}
