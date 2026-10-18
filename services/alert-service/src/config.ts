import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    url: process.env.REDIS_URL,
  },
  databaseUrl: process.env.DATABASE_URL,
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  email: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10), // Mailpit SMTP port
    from: process.env.SMTP_FROM || 'alerts@mission-control.space',
  },
};
