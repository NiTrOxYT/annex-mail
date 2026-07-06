export interface SendEmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string; // HTML or Plain text
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
  headers?: Record<string, string>;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  attachments?: {
    id: string;
    filename: string;
    size: number;
  }[];
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<{ messageId: string }>;
  reply(
    threadId: string,
    options: Omit<SendEmailOptions, "subject"> & { subject?: string },
  ): Promise<{ messageId: string }>;
  forward(
    messageId: string,
    to: string[],
    comment?: string,
  ): Promise<{ messageId: string }>;
  sync(since?: Date): Promise<EmailMessage[]>;
}
