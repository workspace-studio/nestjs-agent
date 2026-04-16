# Production Logging

## Built-in Logger

### Log Levels

```typescript
// Available levels (from most to least severe):
// 'fatal' | 'error' | 'warn' | 'log' | 'debug' | 'verbose'

const app = await NestFactory.create(AppModule, {
  logger: process.env.NODE_ENV === 'production'
    ? ['error', 'warn', 'log']
    : ['error', 'warn', 'log', 'debug', 'verbose'],
});
```

### JSON Logging (for log aggregators)

```typescript
import { ConsoleLogger } from '@nestjs/common';

const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger({
    json: process.env.NODE_ENV === 'production',
    colors: process.env.NODE_ENV !== 'production',
  }),
});
```

JSON output format:
```json
{
  "level": "log",
  "pid": 19096,
  "timestamp": 1607370779834,
  "message": "Court created: clx1234567890",
  "context": "CourtsService"
}
```

### Service Logger (Standard Pattern)

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CourtsService {
  private readonly logger = new Logger(CourtsService.name);

  async create(dto: CreateCourtDto): Promise<CourtResponseDto> {
    this.logger.log(`Creating court: ${dto.name}`);
    const result = await this.courtsRepository.create(dto);
    this.logger.log(`Court created: ${result.id}`);
    return result;
  }

  async delete(id: string): Promise<void> {
    this.logger.warn(`Soft-deleting court: ${id}`);
    await this.courtsRepository.softDelete(id);
  }
}
```

### Logger Levels Guide

| Level | When to Use | Example |
|-------|------------|---------|
| `fatal` | App cannot continue | Database connection lost permanently |
| `error` | Operation failed, needs attention | External API returned 500 |
| `warn` | Unusual but recoverable | Rate limit approaching, deprecated endpoint used |
| `log` | Normal operations worth recording | User created, reservation booked |
| `debug` | Detailed flow for debugging | Query parameters, cache hit/miss |
| `verbose` | Extremely detailed tracing | Full request/response bodies |

## Custom Logger with Winston

### Installation

```bash
npm install winston nest-winston
```

### Logger Service

```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      defaultMeta: { service: process.env.APP_NAME || 'nestjs-api' },
      transports: [
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'production'
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
              ),
        }),
        // Production: write to file or send to log aggregator
        ...(process.env.NODE_ENV === 'production'
          ? [
              new winston.transports.File({ filename: 'error.log', level: 'error' }),
              new winston.transports.File({ filename: 'combined.log' }),
            ]
          : []),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
```

### Registration in main.ts

```typescript
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(AppLogger));
```

`bufferLogs: true` ensures early startup logs aren't lost before the custom logger is ready.

## Request Correlation ID

Track requests across services with a unique ID:

### Middleware

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

### Usage in Services

```typescript
// Access via @Req() in controller, pass to service
this.logger.log(`Processing request`, { correlationId, userId });
```

## What to Log

### Always Log
- Authentication events (login success/failure, token refresh)
- Authorization failures (403 responses)
- Data mutations (create, update, delete) with entity ID
- External API calls (URL, status, duration)
- Errors with stack traces

### Never Log
- Passwords, tokens, secrets
- Full request bodies with PII (personal data)
- Credit card numbers, SSNs
- Session tokens or API keys
- Full database query results (use IDs only)

## DO NOT

- Do NOT use `console.log` — always use NestJS Logger (it includes context and levels)
- Do NOT log passwords, tokens, or secrets — sanitize before logging
- Do NOT log at `verbose` level in production — it generates massive log volumes
- Do NOT skip `bufferLogs: true` when using custom loggers — early logs will be lost
- Do NOT log full request/response bodies — log IDs and summaries only
