import { Notifier } from './types';
import { TelegramNotifier } from './telegram.notifier';
import { DiscordNotifier } from './discord.notifier';
import { EmailNotifier } from './email.notifier';

export * from './types';
export * from './telegram.notifier';
export * from './discord.notifier';
export * from './email.notifier';

const telegramNotifier = new TelegramNotifier();
const discordNotifier = new DiscordNotifier();
const emailNotifier = new EmailNotifier();

export function getNotifier(channel: string): Notifier | null {
  switch (channel.toLowerCase()) {
    case 'telegram':
      return telegramNotifier;
    case 'discord':
      return discordNotifier;
    case 'email':
      return emailNotifier;
    default:
      return null;
  }
}
