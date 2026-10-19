import {
  DbEvent,
  DbAsteroid,
  DbAlertRule,
  SolarFlareRuleConfig,
  AsteroidRuleConfig,
  NaturalEventRuleConfig,
} from '@mission-control/db';

/**
 * Parses flare class string into a comparable numeric score.
 * Example: A1=1, B1=10, C1=100, M1=1000, M5=5000, X1=10000, X2=20000
 */
export function parseFlareClass(flareClass?: string | null): number {
  if (!flareClass) return 0;
  const match = flareClass
    .trim()
    .toUpperCase()
    .match(/^([ABCMX])([0-9.]+)?$/);
  if (!match) return 0;

  const letter = match[1];
  const num = parseFloat(match[2] || '1');
  const multipliers: Record<string, number> = {
    A: 1,
    B: 10,
    C: 100,
    M: 1000,
    X: 10000,
  };

  return (multipliers[letter] || 0) * num;
}

/**
 * Calculates distance between two points on Earth in kilometers using the Haversine formula
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Rule matcher for Solar Flares
 */
export function matchSolarFlare(config: SolarFlareRuleConfig, event: DbEvent): boolean {
  if (event.category !== 'solar_flare') {
    return false;
  }

  if (!config.minClass) {
    return true;
  }

  const flareScore = parseFlareClass(event.severity);
  const minScore = parseFlareClass(config.minClass);

  return flareScore >= minScore;
}

/**
 * Rule matcher for Near-Earth Asteroids
 */
export function matchAsteroid(config: AsteroidRuleConfig, asteroid: DbAsteroid): boolean {
  if (config.hazardousOnly && !asteroid.hazardous) {
    return false;
  }

  if (
    config.maxMissDistanceKm !== undefined &&
    config.maxMissDistanceKm !== null &&
    asteroid.miss_distance_km > config.maxMissDistanceKm
  ) {
    return false;
  }

  return true;
}

/**
 * Rule matcher for Natural Earth Events
 */
export function matchNaturalEvent(config: NaturalEventRuleConfig, event: DbEvent): boolean {
  // Category check
  if (config.categories && config.categories.length > 0) {
    if (!config.categories.includes(event.category)) {
      return false;
    }
  }

  // Radius / Center check
  if (config.center && config.radiusKm) {
    if (
      event.latitude === null ||
      event.latitude === undefined ||
      event.longitude === null ||
      event.longitude === undefined
    ) {
      return false;
    }

    const [centerLng, centerLat] = config.center;
    const distanceKm = calculateHaversineDistanceKm(
      event.latitude,
      event.longitude,
      centerLat,
      centerLng
    );

    if (distanceKm > config.radiusKm) {
      return false;
    }
  }

  return true;
}

/**
 * Unified rule matching entry point
 */
export function matchRule(
  rule: DbAlertRule,
  payload: { type: 'event'; data: DbEvent } | { type: 'asteroid'; data: DbAsteroid }
): boolean {
  if (!rule.active) {
    return false;
  }

  if (rule.type === 'solar_flare') {
    if (payload.type !== 'event') return false;
    return matchSolarFlare(rule.config as SolarFlareRuleConfig, payload.data);
  }

  if (rule.type === 'asteroid') {
    if (payload.type !== 'asteroid') return false;
    return matchAsteroid(rule.config as AsteroidRuleConfig, payload.data);
  }

  if (rule.type === 'natural_event') {
    if (payload.type !== 'event') return false;
    return matchNaturalEvent(rule.config as NaturalEventRuleConfig, payload.data);
  }

  return false;
}
