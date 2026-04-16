# Queues (BullMQ)

## When to Use

- Email sending (don't block the HTTP response)
- Image/file processing (resize, convert)
- Report generation (heavy computation)
- External API calls with retry logic
- Any task that takes >1 second and doesn't need an immediate response

## Installation

```bash
npm install @nestjs/bullmq bullmq
```

Requires Redis running (add to docker-compose.yml).

## Docker Compose — Redis

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## Module Setup

### Root Configuration

```typescript
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Queue Registration

```typescript
// In the module that uses the queue
@Module({
  imports: [
    BullModule.registerQueue({ name: 'email' }),
    BullModule.registerQueue({ name: 'reports' }),
  ],
  providers: [EmailService, EmailProcessor],
})
export class EmailModule {}
```

## Producer (Adding Jobs)

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendWelcomeEmail(userId: string, email: string) {
    await this.emailQueue.add('welcome', { userId, email }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(`Queued welcome email for ${email}`);
  }

  async sendResetEmail(email: string, token: string) {
    await this.emailQueue.add('password-reset', { email, token }, {
      priority: 1, // high priority
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
```

### Job Options

| Option | Type | Description |
|--------|------|-------------|
| `attempts` | number | Retry count on failure |
| `backoff` | object | `{ type: 'exponential' \| 'fixed', delay: ms }` |
| `delay` | number | Delay before processing (ms) |
| `priority` | number | 1 = highest priority |
| `removeOnComplete` | boolean | Clean up completed jobs |
| `removeOnFail` | boolean | Keep failed jobs for inspection |
| `lifo` | boolean | Last-in-first-out processing |

## Consumer (Processing Jobs)

```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'welcome':
        await this.sendWelcome(job.data);
        break;
      case 'password-reset':
        await this.sendReset(job.data);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async sendWelcome(data: { userId: string; email: string }) {
    // Use nodemailer or email service to send
    this.logger.log(`Sending welcome email to ${data.email}`);
  }

  private async sendReset(data: { email: string; token: string }) {
    this.logger.log(`Sending password reset to ${data.email}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} (${job.name}) failed: ${error.message}`);
  }
}
```

## Folder Structure

```
src/modules/email/
├── email.module.ts
├── email.service.ts          # Producer — adds jobs to queue
├── email.processor.ts        # Consumer — processes jobs
├── templates/                # Email HTML templates
│   ├── welcome.hbs
│   └── password-reset.hbs
└── dto/
    └── send-email.dto.ts
```

## Queue Monitoring

Access queue stats in an admin endpoint:

```typescript
@Controller('admin/queues')
@Roles(Role.ADMIN)
export class QueueAdminController {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  @Get('email/stats')
  async getStats() {
    return {
      waiting: await this.emailQueue.getWaitingCount(),
      active: await this.emailQueue.getActiveCount(),
      completed: await this.emailQueue.getCompletedCount(),
      failed: await this.emailQueue.getFailedCount(),
    };
  }
}
```

## DO NOT

- Do NOT process heavy work in the HTTP request-response cycle — queue it
- Do NOT store large payloads in job data — store references (IDs, URLs) and fetch in processor
- Do NOT forget to register both the producer service AND the processor as providers
- Do NOT use queues for synchronous operations that need immediate response
- Do NOT skip retry configuration — network and external service failures are common
