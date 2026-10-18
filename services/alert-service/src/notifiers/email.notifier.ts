import nodemailer from 'nodemailer';
import { Notifier, NotificationPayload, NotificationResult } from './types';
import { config } from '../config';

export class EmailNotifier implements Notifier {
  public channel = 'email' as const;
  private transporter: nodemailer.Transporter;

  constructor(transporter?: nodemailer.Transporter) {
    this.transporter =
      transporter ||
      nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        ignoreTLS: true,
      });
  }

  public async send(payload: NotificationPayload): Promise<NotificationResult> {
    if (!payload.recipient || !payload.recipient.includes('@')) {
      return {
        success: false,
        channel: 'email',
        error: 'Invalid or missing recipient email address',
      };
    }

    try {
      const subject = `[Mission Control Alert] ${payload.title}`;
      const text = `${payload.title}\n\n${payload.body}\n\nSeverity: ${
        payload.severity || 'N/A'
      }\nTime: ${payload.timestamp || new Date().toISOString()}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #d32f2f;">🚨 ${payload.title}</h2>
          <p style="font-size: 16px; color: #333;">${payload.body}</p>
          ${
            payload.severity
              ? `<p><strong>Severity:</strong> <span style="background: #ffebee; color: #c62828; padding: 3px 8px; border-radius: 4px;">${payload.severity}</span></p>`
              : ''
          }
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Mission Control Space & Earth Dashboard Alerts</p>
        </div>
      `;

      await this.transporter.sendMail({
        from: config.email.from,
        to: payload.recipient,
        subject,
        text,
        html,
      });

      return { success: true, channel: 'email' };
    } catch (err: any) {
      return {
        success: false,
        channel: 'email',
        error: `Email notification failed: ${err.message}`,
      };
    }
  }
}
