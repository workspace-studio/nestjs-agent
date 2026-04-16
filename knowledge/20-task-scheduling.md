# Task Scheduling (Cron Jobs)

## When to Use

- Periodic cleanup (expired tokens, soft-deleted records)
- Scheduled reports or notifications
- Data synchronization with external systems
- Recurring health checks

## Installation

```bash
npm install @nestjs/schedule
```

## Module Setup

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
})
export class AppModule {}
```

## Cron Jobs

### Basic Cron

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredTokens() {
    this.logger.log('Cleaning expired refresh tokens...');
    const count = await this.tokenRepository.deleteExpired();
    this.logger.log(`Deleted ${count} expired tokens`);
  }

  @Cron('0 */30 9-17 * * 1-5', {
    name: 'business-hours-sync',
    timeZone: 'Europe/Zagreb',
  })
  async syncExternalData() {
    this.logger.log('Syncing external data (business hours)...');
  }
}
```

### Cron Pattern

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─ day of week (0-7, 0 and 7 = Sunday)
│ │ │ │ └─── month (1-12)
│ │ │ └───── day of month (1-31)
│ │ └─────── hour (0-23)
│ └───────── minute (0-59)
└─────────── second (0-59, optional)
```

### Common Patterns

| Pattern | Meaning |
|---------|---------|
| `CronExpression.EVERY_MINUTE` | Every minute |
| `CronExpression.EVERY_HOUR` | Every hour |
| `CronExpression.EVERY_DAY_AT_MIDNIGHT` | Daily at 00:00 |
| `CronExpression.EVERY_WEEK` | Weekly |
| `0 0 9 * * 1-5` | Weekdays at 9:00 |
| `0 */15 * * * *` | Every 15 minutes |

### Options

```typescript
@Cron('45 * * * * *', {
  name: 'myJob',              // for dynamic access
  timeZone: 'Europe/Zagreb',  // timezone-aware execution
  waitForCompletion: true,    // prevent overlapping runs
  disabled: false,            // disable without removing
})
```

## Intervals

```typescript
@Interval(10000) // every 10 seconds
handleInterval() {
  this.logger.debug('Checking pending notifications...');
}

@Interval('health-check', 30000) // named, every 30s
checkHealth() {
  this.logger.debug('Health check...');
}
```

## Timeouts (One-Shot)

```typescript
@Timeout(5000) // runs once, 5s after app start
onApplicationReady() {
  this.logger.log('Application warm-up complete');
}
```

## Dynamic Scheduling

```typescript
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';

@Injectable()
export class DynamicScheduleService {
  constructor(private schedulerRegistry: SchedulerRegistry) {}

  addCronJob(name: string, cronExpression: string, callback: () => void) {
    const job = new CronJob(cronExpression, callback);
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  stopJob(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.stop();
  }

  reschedule(name: string, newCron: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.setTime(new CronTime(newCron));
    job.start();
  }

  deleteJob(name: string) {
    this.schedulerRegistry.deleteCronJob(name);
  }
}
```

## Service Structure

Put scheduled tasks in dedicated services, not in domain services:

```
src/modules/common/
├── scheduled/
│   ├── cleanup.service.ts        # Token/data cleanup
│   ├── sync.service.ts           # External API sync
│   └── notification.service.ts   # Scheduled notifications
```

Register in a shared module:

```typescript
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [CleanupService, SyncService, NotificationService],
})
export class ScheduledModule {}
```

## DO NOT

- Do NOT put business logic directly in cron handlers — call existing service methods
- Do NOT use `@Interval` for tasks that need precise timing — use `@Cron` with explicit schedule
- Do NOT forget `waitForCompletion: true` for long-running jobs — prevents overlapping executions
- Do NOT schedule jobs that hit external APIs every second — respect rate limits
- Do NOT use cron jobs for real-time processing — use queues instead
