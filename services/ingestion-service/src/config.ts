import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.INGESTION_PORT || '3001', 10),
  nasaApiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    url: process.env.REDIS_URL,
  },
  databaseUrl: process.env.DATABASE_URL,
};
