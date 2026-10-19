import fs from 'fs';
import path from 'path';
import {
  ApodItemSchema,
  SolarFlareSchema,
  CoronalMassEjectionSchema,
  EonetEventSchema,
  NearEarthObjectSchema,
} from '../src';

describe('NASA API Contract Tests (Stored Fixtures)', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('validates APOD fixture against ApodItemSchema contract', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'apod.json'), 'utf-8'));
    const result = ApodItemSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBeDefined();
      expect(result.data.url).toMatch(/^https?:\/\//);
      expect(result.data.media_type).toMatch(/^(image|video)$/);
    }
  });

  it('validates DONKI Solar Flare fixture against SolarFlareSchema contract', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'donki-flr.json'), 'utf-8'));
    expect(Array.isArray(raw)).toBe(true);
    expect(raw.length).toBeGreaterThan(0);

    for (const item of raw) {
      const result = SolarFlareSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flrID).toBeDefined();
        expect(result.data.beginTime).toBeDefined();
        expect(result.data.classType).toMatch(/^[A-Z0-9.]+$/);
      }
    }
  });

  it('validates DONKI CME fixture against CoronalMassEjectionSchema contract', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'donki-cme.json'), 'utf-8'));
    expect(Array.isArray(raw)).toBe(true);
    expect(raw.length).toBeGreaterThan(0);

    for (const item of raw) {
      const result = CoronalMassEjectionSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.activityID).toBeDefined();
        expect(result.data.startTime).toBeDefined();
      }
    }
  });

  it('validates EONET natural events fixture against EonetEventSchema contract', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'eonet.json'), 'utf-8'));
    expect(raw.events).toBeDefined();
    expect(Array.isArray(raw.events)).toBe(true);

    for (const item of raw.events) {
      const result = EonetEventSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeDefined();
        expect(result.data.title).toBeDefined();
        expect(result.data.categories.length).toBeGreaterThan(0);
        expect(result.data.geometry.length).toBeGreaterThan(0);
      }
    }
  });

  it('validates NeoWs asteroid fixture against NearEarthObjectSchema contract', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'neows.json'), 'utf-8'));
    expect(raw.near_earth_objects).toBeDefined();

    const dates = Object.keys(raw.near_earth_objects);
    expect(dates.length).toBeGreaterThan(0);

    let count = 0;
    for (const date of dates) {
      const list = raw.near_earth_objects[date];
      for (const neo of list) {
        const result = NearEarthObjectSchema.safeParse(neo);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBeDefined();
          expect(result.data.name).toBeDefined();
          expect(result.data.estimated_diameter).toBeDefined();
          expect(result.data.close_approach_data.length).toBeGreaterThan(0);
        }
        count++;
      }
    }
    expect(count).toBeGreaterThan(0);
  });
});
