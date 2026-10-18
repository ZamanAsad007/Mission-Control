import { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Mission Control API',
    version: '1.0.0',
    description:
      'API service for Mission Control dashboard pulling NASA space weather, near-Earth asteroids, natural events, and APOD.',
  },
  servers: [
    {
      url: '/api',
      description: 'API Gateway',
    },
    {
      url: '/',
      description: 'Direct Service',
    },
  ],
  paths: {
    '/apod/today': {
      get: {
        summary: "Get today's Astronomy Picture of the Day",
        tags: ['APOD'],
        responses: {
          '200': {
            description: 'APOD retrieved successfully',
          },
          '404': {
            description: 'No APOD record found',
          },
        },
      },
    },
    '/apod': {
      get: {
        summary: 'Get APOD by date',
        tags: ['APOD'],
        parameters: [
          {
            name: 'date',
            in: 'query',
            description: 'Target date in YYYY-MM-DD format',
            schema: { type: 'string', example: '2026-10-18' },
          },
        ],
        responses: {
          '200': { description: 'APOD record' },
          '400': { description: 'Invalid date format' },
          '404': { description: 'Record not found' },
        },
      },
    },
    '/asteroids': {
      get: {
        summary: 'Get Near-Earth Asteroids by approach date range',
        tags: ['Asteroids'],
        parameters: [
          {
            name: 'from',
            in: 'query',
            description: 'Start date in YYYY-MM-DD format',
            schema: { type: 'string', example: '2026-10-18' },
          },
          {
            name: 'to',
            in: 'query',
            description: 'End date in YYYY-MM-DD format',
            schema: { type: 'string', example: '2026-10-25' },
          },
          {
            name: 'hazardous',
            in: 'query',
            description: 'Filter only potentially hazardous asteroids',
            schema: { type: 'boolean', example: true },
          },
        ],
        responses: {
          '200': { description: 'List of asteroids' },
          '400': { description: 'Invalid query parameters' },
        },
      },
    },
    '/events': {
      get: {
        summary: 'Unified space and earth events feed',
        tags: ['Events'],
        parameters: [
          {
            name: 'category',
            in: 'query',
            description: 'Category filter (solar_flare, cme, wildfires, severeStorms, volcanoes, etc.)',
            schema: { type: 'string' },
          },
          {
            name: 'source',
            in: 'query',
            description: 'Source filter (DONKI_FLR, DONKI_CME, EONET)',
            schema: { type: 'string' },
          },
          {
            name: 'from',
            in: 'query',
            description: 'Earliest event timestamp',
            schema: { type: 'string' },
          },
          {
            name: 'to',
            in: 'query',
            description: 'Latest event timestamp',
            schema: { type: 'string' },
          },
          {
            name: 'bbox',
            in: 'query',
            description: 'Bounding box filter (minLng,minLat,maxLng,maxLat)',
            schema: { type: 'string', example: '-125,30,-115,45' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 100 },
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
          },
        ],
        responses: {
          '200': { description: 'List of events' },
        },
      },
    },
    '/events/nearby': {
      get: {
        summary: 'Find events within a radius using PostGIS geography queries',
        tags: ['Events'],
        parameters: [
          {
            name: 'lat',
            in: 'query',
            required: true,
            schema: { type: 'number', example: 37.7749 },
          },
          {
            name: 'lng',
            in: 'query',
            required: true,
            schema: { type: 'number', example: -122.4194 },
          },
          {
            name: 'radiusKm',
            in: 'query',
            schema: { type: 'number', default: 500 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
          },
        ],
        responses: {
          '200': { description: 'Nearby events ordered by distance' },
          '400': { description: 'Missing or invalid parameters' },
        },
      },
    },
    '/events/{id}': {
      get: {
        summary: 'Get event details by UUID',
        tags: ['Events'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Event detail' },
          '404': { description: 'Event not found' },
        },
      },
    },
    '/stats/space-weather': {
      get: {
        summary: 'Space weather flares per day, grouped by class',
        tags: ['Stats'],
        parameters: [
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', default: 30 },
          },
        ],
        responses: {
          '200': { description: 'Space weather statistics' },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check and background ingestion status',
        tags: ['System'],
        responses: {
          '200': { description: 'Service health and background job status' },
        },
      },
    },
  },
};

export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec);
