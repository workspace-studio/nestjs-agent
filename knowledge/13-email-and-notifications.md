# Email & Notifications

## Nodemailer + Mailpit for Development

### EmailService

```typescript
// src/common/email/email.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;

  constructor(
    @Inject('EMAIL_OPTIONS')
    private readonly options: { host: string; port: number; from: string; auth?: { user: string; pass: string } },
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.options.host,
      port: this.options.port,
      secure: this.options.port === 465,
      auth: this.options.auth,
    });
  }

  async sendMail(emailOptions: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: emailOptions.from || this.options.from,
        to: Array.isArray(emailOptions.to) ? emailOptions.to.join(', ') : emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
      });

      this.logger.log(`Email sent: ${info.messageId} to ${emailOptions.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${emailOptions.to}`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(name: string, email: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Welcome to the platform',
      html: welcomeTemplate(name),
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `https://app.example.com/reset-password?token=${resetToken}`;
    await this.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: passwordResetTemplate(resetUrl),
    });
  }

  async sendWorkOrderAssignedEmail(
    technicianEmail: string,
    technicianName: string,
    workOrderTitle: string,
    workOrderId: string,
  ): Promise<void> {
    await this.sendMail({
      to: technicianEmail,
      subject: `Work Order Assigned: ${workOrderTitle}`,
      html: workOrderAssignedTemplate(technicianName, workOrderTitle, workOrderId),
    });
  }
}
```

### HTML Template Pattern

```typescript
// src/common/email/templates/welcome.template.ts
export function welcomeTemplate(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Welcome to our platform. Your account has been created successfully.</p>
            <p><a href="https://app.example.com" class="button">Get Started</a></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 My App. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function passwordResetTemplate(resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      </body>
    </html>
  `;
}

export function workOrderAssignedTemplate(name: string, title: string, id: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2>Work Order Assigned</h2>
      <p>Hi ${name},</p>
      <p>A work order has been assigned to you:</p>
      <p><strong>${title}</strong> (ID: ${id})</p>
      <p><a href="https://app.example.com/work-orders/${id}">View Work Order</a></p>
    </div>
  `;
}
```

### Email Module

```typescript
// src/common/email/email.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EmailService } from './email.service';

@Module({})
export class EmailModule {
  static forRootAsync(): DynamicModule {
    return {
      module: EmailModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'EMAIL_OPTIONS',
          useFactory: (config: ConfigService) => ({
            host: config.get('SMTP_HOST', 'localhost'),
            port: config.get('SMTP_PORT', 1025),
            from: config.get('EMAIL_FROM', 'noreply@example.com'),
            auth: config.get('SMTP_USER')
              ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') }
              : undefined,
          }),
          inject: [ConfigService],
        },
        EmailService,
      ],
      exports: [EmailService],
      global: true,
    };
  }
}
```

## Mailpit for Development

Mailpit catches all outgoing emails in development. Web UI at `http://localhost:8025`.

Docker Compose:

```yaml
mailpit:
  image: axllent/mailpit:latest
  container_name: mailpit
  ports:
    - '1025:1025'   # SMTP
    - '8025:8025'   # Web UI
  environment:
    MP_SMTP_AUTH_ACCEPT_ANY: 1
    MP_SMTP_AUTH_ALLOW_INSECURE: 1
```

Environment variables:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@myapp.local
```

## Web Push Notifications

```typescript
// src/common/notifications/push.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private readonly configService: ConfigService) {
    webPush.setVapidDetails(
      `mailto:${configService.get('VAPID_EMAIL', 'admin@example.com')}`,
      configService.getOrThrow('VAPID_PUBLIC_KEY'),
      configService.getOrThrow('VAPID_PRIVATE_KEY'),
    );
  }

  async sendNotification(
    subscription: webPush.PushSubscription,
    payload: { title: string; body: string; url?: string },
  ): Promise<void> {
    try {
      await webPush.sendNotification(subscription, JSON.stringify(payload));
      this.logger.log(`Push notification sent: ${payload.title}`);
    } catch (error) {
      this.logger.error('Push notification failed', error);
      if ((error as any).statusCode === 410) {
        this.logger.warn('Subscription expired, should remove from DB');
      }
    }
  }
}
```

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```
