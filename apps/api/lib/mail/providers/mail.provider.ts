import { MailOptions } from '../interfaces/mail.interface';

export interface MailProvider {
  sendMail(options: MailOptions): Promise<string>;
  verifyConnection(): Promise<boolean>;
}
