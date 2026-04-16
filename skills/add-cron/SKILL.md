---
name: add-cron
description: Add a scheduled cron job — cleanup, sync, or notification task with @nestjs/schedule
---

# Add Cron Job

Add a scheduled task. Usage: `/add-cron <task-name> — <schedule> <description>`

## Pre-Work

1. READ `@knowledge/20-task-scheduling.md` for scheduling patterns
2. READ existing scheduled services if any

## Steps

### Step 1: Install Dependencies (if first cron)

```bash
npm install @nestjs/schedule
```

### Step 2: Add ScheduleModule to AppModule (if first cron)

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
})
```

### Step 3: Create Scheduled Service

```typescript
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'cleanup-expired-tokens',
    timeZone: 'Europe/Zagreb',
  })
  async cleanExpiredTokens() {
    this.logger.log('Starting token cleanup...');
    const count = await this.tokenRepository.deleteExpired();
    this.logger.log(`Cleaned ${count} expired tokens`);
  }
}
```

Place in `src/modules/common/scheduled/` folder.

### Step 4: Register in Module

Add the service to module providers.

### Step 5: Add Tests

- Unit test: verify the cron method calls the right repository method
- No e2e test needed — cron jobs are internal

### Step 6: Validate

```bash
npm run build && npm run lint && npm run test
```

## DO NOT

- Do NOT put business logic in the cron handler — delegate to existing service methods
- Do NOT schedule external API calls more than once per minute without checking rate limits
- Do NOT forget `waitForCompletion: true` for long-running jobs
- Do NOT use `@Interval` when you need precise timing — use `@Cron`
