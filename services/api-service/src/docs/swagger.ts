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
    '/stream': {
      get: {
        summary: 'Server-Sent Events (SSE) live event stream',
        tags: ['Real-Time'],
        responses: {
          '200': {
            description: 'Real-time SSE event stream',
            content: {
              'text/event-stream': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  telegram_chat_id: { type: 'string' },
                  discord_webhook: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User registered successfully' },
          '400': { description: 'Validation error' },
          '409': { description: 'Email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate and receive JWT token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authenticated successfully' },
          '401': { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User profile retrieved' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/alerts/rules': {
      get: {
        summary: 'List alert rules for authenticated user',
        tags: ['Alerts'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of alert rules' },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create a new alert rule',
        tags: ['Alerts'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type', 'config', 'channels'],
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['solar_flare', 'asteroid', 'natural_event'] },
                  config: { type: 'object' },
                  channels: { type: 'array', items: { type: 'string', enum: ['telegram', 'discord', 'email'] } },
                  cooldown_minutes: { type: 'integer', default: 60 },
                  active: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Alert rule created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/alerts/rules/{id}': {
      put: {
        summary: 'Update an existing alert rule',
        tags: ['Alerts'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Alert rule updated' },
          '400': { description: 'Validation error' },
          '404': { description: 'Alert rule not found' },
        },
      },
      delete: {
        summary: 'Delete an alert rule',
        tags: ['Alerts'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Alert rule deleted' },
          '404': { description: 'Alert rule not found' },
        },
      },
    },
    '/alerts/history': {
      get: {
        summary: 'Get notification delivery history for authenticated user',
        tags: ['Alerts'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': { description: 'Notification delivery history' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/alerts/test': {
      post: {
        summary: 'Send a test notification to configured channels',
        tags: ['Alerts'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  channel: { type: 'string', enum: ['telegram', 'discord', 'email'] },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Test notification results' },
          '400': { description: 'Invalid channel or missing destination' },
          '401': { description: 'Unauthorized' },
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
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec);
