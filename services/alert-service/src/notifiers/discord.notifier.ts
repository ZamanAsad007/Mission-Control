import axios from 'axios';
import { Notifier, NotificationPayload, NotificationResult } from './types';

export class DiscordNotifier implements Notifier {
  public channel = 'discord' as const;

  public async send(payload: NotificationPayload): Promise<NotificationResult> {
    const webhookUrl = payload.recipient;

    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return {
        success: false,
        channel: 'discord',
        error: 'Invalid or missing Discord webhook URL',
      };
    }

    try {
      // Color: Red (0xED4245) for flares/hazardous, Orange (0xFEE75C) for others
      const color =
        payload.severity && (payload.severity.startsWith('X') || payload.severity.includes('km/s'))
          ? 0xed4245
          : 0xf1c40f;

      const embed: any = {
        title: `🚨 ${payload.title}`,
        description: payload.body,
        color,
        timestamp: payload.timestamp || new Date().toISOString(),
        footer: {
          text: 'Mission Control Alerts',
        },
      };

      if (payload.severity) {
        embed.fields = [
          {
            name: 'Severity',
            value: payload.severity,
            inline: true,
          },
        ];
      }

      await axios.post(webhookUrl, {
        username: 'Mission Control',
        embeds: [embed],
      });

      return { success: true, channel: 'discord' };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      return {
        success: false,
        channel: 'discord',
        error: `Discord notification failed: ${errorMsg}`,
      };
    }
  }
}
