import request from 'supertest';
import { createApp } from '../src/app';

jest.mock('@mission-control/db', () => ({
  ...jest.requireActual('@mission-control/db'),
  getLastRuns: jest.fn().mockResolvedValue({
    apod_job: {
      id: 'run-1',
      job_name: 'apod_job',
      started_at: '2026-10-18T01:00:00Z',
      finished_at: '2026-10-18T01:00:02Z',
      status: 'completed',
      records_upserted: 1,
      error: null,
    },
    neows_job: {
      id: 'run-2',
      job_name: 'neows_job',
      started_at: '2026-10-18T04:00:00Z',
      finished_at: '2026-10-18T04:00:05Z',
      status: 'completed',
      records_upserted: 15,
      error: null,
    },
  }),
  getPool: jest.fn().mockReturnValue({}),
}));

describe('Ingestion Service HTTP Endpoints', () => {
  it('GET /health should return 200 with last runs for each job', async () => {
    const app = createApp();

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.service).toBe('ingestion-service');
    expect(res.body.jobs.apod_job).toBeDefined();
    expect(res.body.jobs.apod_job.status).toBe('completed');
    expect(res.body.jobs.neows_job).toBeDefined();
    expect(res.body.jobs.neows_job.records_upserted).toBe(15);
  });
});
