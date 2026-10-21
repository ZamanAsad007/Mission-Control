import axios from 'axios';
import { TelegramNotifier } from '../src/notifiers/telegram.notifier';
import { DiscordNotifier } from '../src/notifiers/discord.notifier';
import { EmailNotifier } from '../src/notifiers/email.notifier';
import { getNotifier } from '../src/notifiers';

jest.mock('axios');

describe('Notification Channels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TelegramNotifier', () => {
    it('should send HTML message to Telegram API', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { ok: true } });
      const notifier = new TelegramNotifier('mock-token-123');

      const result = await notifier.send({
        recipient: '12345678',
        title: 'X-Class Solar Flare',
        body: 'Extreme solar flare detected by GOES-16.',
        severity: 'X2.2',
      });

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/botmock-token-123/sendMessage',
        expect.objectContaining({
          chat_id: '12345678',
          text: expect.stringContaining('X-Class Solar Flare'),
          parse_mode: 'HTML',
        }),
        expect.anything()
      );
    });

    it('should return error if recipient chat_id is missing', async () => {
      const notifier = new TelegramNotifier('mock-token-123');
      const result = await notifier.send({
        recipient: '',
        title: 'Flare',
        body: 'Details',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('missing');
    });

    it('should handle API failure gracefully', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      const notifier = new TelegramNotifier('mock-token-123');
      const result = await notifier.send({
        recipient: '12345678',
        title: 'Flare',
        body: 'Details',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('DiscordNotifier', () => {
    it('should post rich embed to Discord webhook', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: {} });
      const notifier = new DiscordNotifier();

      const result = await notifier.send({
        recipient: 'https://discord.com/api/webhooks/123/abc',
        title: 'Hazardous Asteroid Approaching',
        body: 'Asteroid 2026-AB miss distance is 2.5M km.',
        severity: 'Hazardous (28 km/s)',
      });

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/123/abc',
        expect.objectContaining({
          username: 'Mission Control',
          embeds: [
            expect.objectContaining({
              title: '🚨 Hazardous Asteroid Approaching',
              description: 'Asteroid 2026-AB miss distance is 2.5M km.',
            }),
          ],
        }),
        expect.anything()
      );
    });

    it('should return error if webhook URL is invalid', async () => {
      const notifier = new DiscordNotifier();
      const result = await notifier.send({
        recipient: 'invalid-url',
        title: 'Test',
        body: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('EmailNotifier', () => {
    it('should send email using configured transporter', async () => {
      const mockTransporter: any = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
      };
      const notifier = new EmailNotifier(mockTransporter);

      const result = await notifier.send({
        recipient: 'commander@mission-control.space',
        title: 'Wildfire Outbreak',
        body: 'Multiple hotspots detected in California.',
        severity: 'High',
      });

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'commander@mission-control.space',
          subject: '[Mission Control Alert] Wildfire Outbreak',
          text: expect.stringContaining('Wildfire Outbreak'),
          html: expect.stringContaining('Wildfire Outbreak'),
        })
      );
    });

    it('should return error for invalid email', async () => {
      const notifier = new EmailNotifier({} as any);
      const result = await notifier.send({
        recipient: 'not-an-email',
        title: 'Test',
        body: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('getNotifier', () => {
    it('should return correct notifier instance for valid channels', () => {
      expect(getNotifier('telegram')).toBeInstanceOf(TelegramNotifier);
      expect(getNotifier('discord')).toBeInstanceOf(DiscordNotifier);
      expect(getNotifier('email')).toBeInstanceOf(EmailNotifier);
      expect(getNotifier('unknown')).toBeNull();
    });
  });
});
