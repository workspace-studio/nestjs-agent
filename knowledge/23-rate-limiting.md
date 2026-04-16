# Rate Limiting

## When to Use

- Protecting public endpoints (login, register, forgot-password) from brute-force
- Preventing API abuse by unauthenticated users
- Enforcing fair usage across tenants

## Installation

```bash
npm install @nestjs/throttler
```

## Module Setup

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 1000,    // 1 second window
          limit: 3,      // max 3 requests
        },
        {
          name: 'medium',
          ttl: 10000,   // 10 second window
          limit: 20,
        },
        {
          name: 'long',
          ttl: 60000,   // 1 minute window
          limit: 100,
        },
      ],
    }),
  ],
})
export class AppModule {}
```

## Global Guard

Register `ThrottlerGuard` globally so all endpoints are protected:

```typescript
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

## Per-Route Overrides

### Skip Throttling

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

### Stricter Limits

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 per minute
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle({ short: { limit: 3, ttl: 300000 } }) // 3 per 5 minutes
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }
}
```

## Behind a Proxy

If your app runs behind nginx/load balancer, configure trust proxy:

```typescript
// main.ts (Express)
const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.set('trust proxy', 1); // trust first proxy
```

## Async Configuration

```typescript
ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    throttlers: [
      {
        ttl: config.get('THROTTLE_TTL', 60000),
        limit: config.get('THROTTLE_LIMIT', 100),
      },
    ],
  }),
}),
```

## Time Helpers

```typescript
import { seconds, minutes, hours } from '@nestjs/throttler';

{ ttl: seconds(30), limit: 5 }
{ ttl: minutes(1), limit: 20 }
{ ttl: hours(1), limit: 1000 }
```

## DO NOT

- Do NOT skip rate limiting on login/register/forgot-password endpoints — these are brute-force targets
- Do NOT set limits too low for authenticated users — frustrates real users
- Do NOT use in-memory throttling in production with multiple instances — use Redis storage
- Do NOT forget `trust proxy` behind a reverse proxy — all requests will appear from the same IP
