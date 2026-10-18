export interface NotificationPayload {
  recipient: string; // chat_id for telegram, webhook url for discord, email address for email
  title: string;
  body: string;
  severity?: string | null;
  timestamp?: string;
  details?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  channel: 'telegram' | 'discord' | 'email';
  error?: string;
}

export interface Notifier {
  channel: 'telegram' | 'discord' | 'email';
  send(payload: NotificationPayload): Promise<NotificationResult>;
}
