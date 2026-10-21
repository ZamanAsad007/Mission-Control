import axios from 'axios';
import https from 'https';
import dns from 'dns';
import { Notifier, NotificationPayload, NotificationResult } from './types';
import { config } from '../config';

// Force IPv4 lookup to prevent ENETUNREACH in environments without IPv6 routing
const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
  lookup: (hostname, lookupOptions, callback) => {
    if (typeof lookupOptions === 'function') {
      callback = lookupOptions;
      lookupOptions = { family: 4 };
    } else {
      lookupOptions = Object.assign({}, lookupOptions, { family: 4 });
    }
    dns.lookup(hostname, lookupOptions, callback);
  },
});

export class TelegramNotifier implements Notifier {
  public channel = 'telegram' as const;
  private botToken: string;

  constructor(botToken?: string) {
    this.botToken = botToken || config.telegram.botToken;
  }

  public async send(payload: NotificationPayload): Promise<NotificationResult> {
    if (!this.botToken) {
      return {
        success: false,
        channel: 'telegram',
        error: 'Telegram bot token is not configured',
      };
    }

    if (!payload.recipient) {
      return {
        success: false,
        channel: 'telegram',
        error: 'Telegram recipient chat ID is missing',
      };
    }

    try {
      const text = `🚨 <b>[Mission Control Alert]</b>\n<b>${payload.title}</b>\n\n${payload.body}${
        payload.severity ? `\n\n<b>Severity:</b> ${payload.severity}` : ''
      }`;

      await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          chat_id: payload.recipient,
          text,
          parse_mode: 'HTML',
        },
        {
          httpsAgent,
          timeout: 10000,
        }
      );

      return { success: true, channel: 'telegram' };
    } catch (err: any) {
      const errorMsg = err.response?.data?.description || err.message;
      return {
        success: false,
        channel: 'telegram',
        error: `Telegram notification failed: ${errorMsg}`,
      };
    }
  }
}
