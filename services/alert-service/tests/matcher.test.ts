import {
  parseFlareClass,
  calculateHaversineDistanceKm,
  matchSolarFlare,
  matchAsteroid,
  matchNaturalEvent,
  matchRule,
} from '../src/matcher';
import { DbEvent, DbAsteroid, DbAlertRule } from '@mission-control/db';

describe('Rule Matching Engine', () => {
  describe('parseFlareClass', () => {
    it('should correctly rank flare classes', () => {
      expect(parseFlareClass('C8.0')).toBeLessThan(parseFlareClass('M1.0'));
      expect(parseFlareClass('M2.5')).toBeLessThan(parseFlareClass('M5.0'));
      expect(parseFlareClass('M9.9')).toBeLessThan(parseFlareClass('X1.0'));
      expect(parseFlareClass('X1.0')).toBeLessThan(parseFlareClass('X2.5'));
    });

    it('should handle null, empty or invalid strings gracefully', () => {
      expect(parseFlareClass(null)).toBe(0);
      expect(parseFlareClass('')).toBe(0);
      expect(parseFlareClass('invalid')).toBe(0);
    });
  });

  describe('calculateHaversineDistanceKm', () => {
    it('should calculate approximate distance between London and Paris (~344km)', () => {
      const london = { lat: 51.5074, lng: -0.1278 };
      const paris = { lat: 48.8566, lng: 2.3522 };
      const dist = calculateHaversineDistanceKm(london.lat, london.lng, paris.lat, paris.lng);
      expect(dist).toBeGreaterThan(330);
      expect(dist).toBeLessThan(360);
    });
  });

  describe('matchSolarFlare', () => {
    const flareEvent = (severity: string): DbEvent => ({
      source: 'DONKI_FLR',
      source_id: 'FLR-1',
      category: 'solar_flare',
      title: `Solar Flare ${severity}`,
      severity,
      started_at: new Date().toISOString(),
    });

    it('should match flares of equal or higher class than minClass', () => {
      const rule = { minClass: 'M5' };
      expect(matchSolarFlare(rule, flareEvent('M5.0'))).toBe(true);
      expect(matchSolarFlare(rule, flareEvent('M7.2'))).toBe(true);
      expect(matchSolarFlare(rule, flareEvent('X1.5'))).toBe(true);
    });

    it('should reject flares of lower class than minClass', () => {
      const rule = { minClass: 'M5' };
      expect(matchSolarFlare(rule, flareEvent('M2.0'))).toBe(false);
      expect(matchSolarFlare(rule, flareEvent('C9.9'))).toBe(false);
      expect(matchSolarFlare(rule, flareEvent('B1.0'))).toBe(false);
    });

    it('should reject non-flare events', () => {
      const nonFlare: DbEvent = {
        source: 'DONKI_CME',
        source_id: 'CME-1',
        category: 'cme',
        title: 'CME',
        started_at: new Date().toISOString(),
      };
      expect(matchSolarFlare({ minClass: 'M1' }, nonFlare)).toBe(false);
    });
  });

  describe('matchAsteroid', () => {
    const asteroid = (hazardous: boolean, distanceKm: number): DbAsteroid => ({
      neo_id: 'AST-1',
      name: 'Asteroid 1',
      approach_date: '2026-10-20',
      miss_distance_km: distanceKm,
      velocity_kps: 20,
      hazardous,
    });

    it('should match hazardous asteroids when hazardousOnly is true', () => {
      const rule = { hazardousOnly: true };
      expect(matchAsteroid(rule, asteroid(true, 10000000))).toBe(true);
      expect(matchAsteroid(rule, asteroid(false, 10000000))).toBe(false);
    });

    it('should match asteroids within maxMissDistanceKm', () => {
      const rule = { maxMissDistanceKm: 5000000 };
      expect(matchAsteroid(rule, asteroid(false, 3000000))).toBe(true);
      expect(matchAsteroid(rule, asteroid(false, 6000000))).toBe(false);
    });

    it('should match both hazardousOnly and maxMissDistanceKm combined', () => {
      const rule = { hazardousOnly: true, maxMissDistanceKm: 5000000 };
      expect(matchAsteroid(rule, asteroid(true, 4000000))).toBe(true);
      expect(matchAsteroid(rule, asteroid(false, 4000000))).toBe(false);
      expect(matchAsteroid(rule, asteroid(true, 8000000))).toBe(false);
    });
  });

  describe('matchNaturalEvent', () => {
    const naturalEvent = (category: string, lat?: number, lng?: number): DbEvent => ({
      source: 'EONET',
      source_id: 'EONET-1',
      category,
      title: `Event ${category}`,
      started_at: new Date().toISOString(),
      latitude: lat ?? null,
      longitude: lng ?? null,
    });

    it('should match events belonging to specified categories', () => {
      const rule = { categories: ['wildfires', 'severeStorms'] };
      expect(matchNaturalEvent(rule, naturalEvent('wildfires'))).toBe(true);
      expect(matchNaturalEvent(rule, naturalEvent('severeStorms'))).toBe(true);
      expect(matchNaturalEvent(rule, naturalEvent('volcanoes'))).toBe(false);
    });

    it('should match events within specified radius of geographic center', () => {
      // Center at San Francisco (lng: -122.4194, lat: 37.7749)
      const rule = {
        center: [-122.4194, 37.7749] as [number, number],
        radiusKm: 200,
      };

      // San Jose (~70km from SF)
      expect(matchNaturalEvent(rule, naturalEvent('earthquakes', 37.3382, -121.8863))).toBe(true);

      // Los Angeles (~560km from SF)
      expect(matchNaturalEvent(rule, naturalEvent('earthquakes', 34.0522, -118.2437))).toBe(false);
    });

    it('should reject events without coordinates when radius is required', () => {
      const rule = {
        center: [-122.4194, 37.7749] as [number, number],
        radiusKm: 200,
      };
      expect(matchNaturalEvent(rule, naturalEvent('wildfires'))).toBe(false);
    });
  });

  describe('matchRule', () => {
    it('should return false if rule is not active', () => {
      const inactiveRule: DbAlertRule = {
        id: 'r1',
        user_id: 'u1',
        name: 'Inactive Flare Rule',
        type: 'solar_flare',
        config: { minClass: 'M1' },
        channels: ['telegram'],
        cooldown_minutes: 60,
        active: false,
      };

      const event: DbEvent = {
        source: 'DONKI_FLR',
        source_id: 'FLR-1',
        category: 'solar_flare',
        title: 'Flare X1',
        severity: 'X1.0',
        started_at: new Date().toISOString(),
      };

      expect(matchRule(inactiveRule, { type: 'event', data: event })).toBe(false);
    });

    it('should dispatch to the correct matcher based on rule type', () => {
      const rule: DbAlertRule = {
        id: 'r2',
        user_id: 'u1',
        name: 'Active Asteroid Rule',
        type: 'asteroid',
        config: { hazardousOnly: true },
        channels: ['discord'],
        cooldown_minutes: 30,
        active: true,
      };

      const ast: DbAsteroid = {
        neo_id: 'AST-99',
        name: 'Neo',
        approach_date: '2026-10-21',
        miss_distance_km: 1000000,
        velocity_kps: 12,
        hazardous: true,
      };

      expect(matchRule(rule, { type: 'asteroid', data: ast })).toBe(true);
    });
  });
});
