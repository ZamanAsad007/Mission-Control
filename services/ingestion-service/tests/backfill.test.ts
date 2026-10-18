import {
  publishEventCreated,
  publishEventsCreated,
  publishAsteroidCreated,
} from '../src/events/publisher';
import { runBackfill } from '../src/scripts/backfill';
import * as apodJob from '../src/jobs/apod.job';
import * as neowsJob from '../src/jobs/neows.job';
import * as donkiJob from '../src/jobs/donki.job';
import * as eonetJob from '../src/jobs/eonet.job';

jest.mock('../src/jobs/apod.job');
jest.mock('../src/jobs/neows.job');
jest.mock('../src/jobs/donki.job');
jest.mock('../src/jobs/eonet.job');

describe('Event Publisher & Backfill Script', () => {
  describe('publisher', () => {
    let mockRedis: any;

    beforeEach(() => {
      mockRedis = {
        publish: jest.fn().mockResolvedValue(1),
      };
    });

    it('publishEventCreated should publish formatted JSON to event.created channel', async () => {
      const evt: any = {
        id: 'evt-1',
        category: 'solar_flare',
        title: 'Flare X1',
      };

      await publishEventCreated(mockRedis, evt);
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'event.created',
        expect.stringContaining('"event":"event.created"')
      );
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'event.created',
        expect.stringContaining('"title":"Flare X1"')
      );
    });

    it('publishEventsCreated should iterate and publish all events', async () => {
      const events: any = [
        { id: 'evt-1', title: 'Flare 1' },
        { id: 'evt-2', title: 'Flare 2' },
      ];

      const count = await publishEventsCreated(mockRedis, events);
      expect(count).toBe(2);
      expect(mockRedis.publish).toHaveBeenCalledTimes(2);
    });

    it('publishAsteroidCreated should publish to asteroid.created channel', async () => {
      const asteroid: any = {
        neo_id: '12345',
        name: 'Asteroid Neo',
        hazardous: true,
      };

      await publishAsteroidCreated(mockRedis, asteroid);
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'asteroid.created',
        expect.stringContaining('"event":"asteroid.created"')
      );
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'asteroid.created',
        expect.stringContaining('"name":"Asteroid Neo"')
      );
    });
  });

  describe('runBackfill', () => {
    it('should coordinate 30-day backfill across APOD, NeoWs, DONKI, and EONET', async () => {
      (apodJob.runApodJob as jest.Mock).mockResolvedValue({
        count: 1,
        date: '2026-10-18',
      });
      (neowsJob.runNeoWsJob as jest.Mock).mockResolvedValue({
        count: 14,
        elementCount: 14,
      });
      (donkiJob.runDonkiJob as jest.Mock).mockResolvedValue({
        count: 8,
        flaresCount: 5,
        cmesCount: 3,
        newEventsCount: 8,
      });
      (eonetJob.runEonetJob as jest.Mock).mockResolvedValue({
        count: 22,
        newEventsCount: 22,
      });

      const mockClient: any = {};
      const mockPool: any = {};
      const mockRedis: any = {};

      const result = await runBackfill({
        client: mockClient,
        pool: mockPool,
        redis: mockRedis,
        days: 30,
      });

      expect(apodJob.runApodJob).toHaveBeenCalledWith(mockClient, mockPool);
      expect(neowsJob.runNeoWsJob).toHaveBeenCalledWith(
        mockClient,
        mockPool,
        expect.any(String),
        expect.any(String)
      );
      expect(donkiJob.runDonkiJob).toHaveBeenCalledWith(
        mockClient,
        mockPool,
        mockRedis,
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        })
      );
      expect(eonetJob.runEonetJob).toHaveBeenCalledWith(
        mockClient,
        mockPool,
        mockRedis,
        expect.objectContaining({
          days: 30,
          status: 'all',
        })
      );

      expect(result.apod.count).toBe(1);
      expect(result.neows.count).toBe(14);
      expect(result.donki.count).toBe(8);
      expect(result.eonet.count).toBe(22);
    });
  });
});
