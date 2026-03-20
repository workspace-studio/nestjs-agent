# Interceptors & Middleware

## Response Format

Controllers return data directly — no response wrapper. List endpoints return Serwizz format:

```json
{
  "entities": [...],
  "totalCount": 42,
  "pagination": {
    "pageNumber": 0,
    "pageSize": 20
  }
}
```

Single entity endpoints return the entity directly (no wrapper).

## HTTP Logging Middleware

```typescript
// src/common/middleware/logging.middleware.ts
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
```

Register in `AppModule`:

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { LoggingMiddleware } from './common/middleware/logging.middleware';

@Module({ ... })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
```

## ValidationPipe (Global)

```typescript
// In main.ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    transform: true,                  // Auto-transform payloads to DTO instances
    whitelist: true,                   // Strip properties not in DTO
    forbidNonWhitelisted: true,        // Throw error for unknown properties
  }),
);
```

## ClassSerializerInterceptor

Automatically applies `class-transformer` decorators (`@Exclude`, `@Expose`):

```typescript
// In main.ts
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

Or register in `AppModule`:

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
```

## TimeoutInterceptor

```typescript
// src/common/interceptors/timeout.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = 30000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request timed out'));
        }
        return throwError(() => err);
      }),
    );
  }
}
```

## Global Setup in main.ts

```typescript
// src/main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { LoggingExceptionFilter } from './common/filters/exception.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Interceptors
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TimeoutInterceptor(30000),
  );

  // Exception filter
  app.useGlobalFilters(new LoggingExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger-ui', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
```

## Global Setup via AppModule (alternative)

```typescript
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

@Module({
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) },
    { provide: APP_FILTER, useClass: LoggingExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
  ],
})
export class AppModule {}
```

The `main.ts` approach is preferred for simplicity. Use `AppModule` providers when interceptors/filters need dependency injection.
