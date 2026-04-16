# Security Hardening (Production)

## Helmet — HTTP Security Headers

### Installation

```bash
npm install helmet
```

### Setup in main.ts

```typescript
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet MUST be registered BEFORE other middleware
  app.use(helmet());

  // ... rest of setup
}
```

Helmet sets these headers automatically:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `X-XSS-Protection`
- Content-Security-Policy (configurable)

## CORS — Cross-Origin Resource Sharing

### Basic (Allow All)

```typescript
app.enableCors();
```

### Production (Explicit Origins)

```typescript
app.enableCors({
  origin: [
    'https://myapp.com',
    'https://admin.myapp.com',
    config.get('FRONTEND_URL'),
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true, // Allow cookies
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

## Cookies

### Installation

```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```

### Setup

```typescript
import * as cookieParser from 'cookie-parser';

app.use(cookieParser(config.get('COOKIE_SECRET')));
```

### Setting Cookies

```typescript
@Post('login')
async login(
  @Body() dto: LoginDto,
  @Res({ passthrough: true }) res: Response,
) {
  const { accessToken, refreshToken } = await this.authService.login(dto);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,     // Not accessible via JavaScript
    secure: true,       // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',
  });

  return { accessToken };
}
```

### Reading Cookies

```typescript
@Post('refresh')
async refresh(@Req() req: Request) {
  const refreshToken = req.cookies['refreshToken'];
  if (!refreshToken) throw new UnauthorizedException('No refresh token');
  return this.authService.refreshTokens(refreshToken);
}
```

### Custom @Cookies Decorator

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Cookies = createParamDecorator(
  (key: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return key ? request.cookies?.[key] : request.cookies;
  },
);

// Usage: @Cookies('refreshToken') token: string
```

## Raw Body for Webhook Signature Verification

### Enable in main.ts

```typescript
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  rawBody: true,
});
```

### Webhook Controller

```typescript
import { Controller, Post, Req, Headers, BadRequestException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhookController {
  @Post('stripe')
  @Public()
  handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) throw new BadRequestException('No raw body');

    const expectedSig = crypto
      .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== `sha256=${expectedSig}`) {
      throw new BadRequestException('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString());
    // Process webhook event...
  }
}
```

## Production Security Checklist

```
[ ] Helmet enabled (before other middleware)
[ ] CORS configured with explicit origins (not *)
[ ] Cookies: httpOnly, secure, sameSite
[ ] Rate limiting on auth endpoints (@nestjs/throttler)
[ ] ValidationPipe: whitelist + forbidNonWhitelisted
[ ] No secrets in code (all in .env, not committed)
[ ] Password hashing with bcrypt (salt >= 10)
[ ] JWT secrets from env, not hardcoded
[ ] Raw body enabled for webhook endpoints
[ ] File upload size limits configured
[ ] No stack traces in production error responses
[ ] Trust proxy configured if behind reverse proxy
```

## DO NOT

- Do NOT use `cors: true` (allow all origins) in production
- Do NOT store JWT tokens in localStorage — use httpOnly cookies for refresh tokens
- Do NOT skip Helmet — it's one line and prevents common attacks
- Do NOT expose raw Prisma errors to clients — use exception filters
- Do NOT trust `X-Forwarded-For` without configuring `trust proxy`
- Do NOT set cookie `sameSite: 'none'` unless you specifically need cross-site cookies
