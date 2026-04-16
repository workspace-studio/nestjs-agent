# External API Integration

## HttpModule Setup

```typescript
// src/modules/weather/weather.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>('WEATHER_API_URL'),
        timeout: 5000,
        maxRedirects: 3,
        headers: {
          'X-API-Key': configService.get<string>('WEATHER_API_KEY'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
```

## Service Wrapper

```typescript
// src/modules/weather/weather.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, retry, timer } from 'rxjs';

interface WeatherResponse {
  temperature: number;
  humidity: number;
  description: string;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly httpService: HttpService) {}

  async getWeather(city: string): Promise<WeatherResponse> {
    const { data } = await firstValueFrom(
      this.httpService.get<WeatherResponse>(`/weather`, { params: { city } }).pipe(
        retry({
          count: 3,
          delay: (error, retryCount) => {
            this.logger.warn(`Retry attempt ${retryCount} for weather API: ${error.message}`);
            return timer(1000 * retryCount); // exponential-ish backoff
          },
        }),
        catchError((error: AxiosError) => {
          this.logger.error(`Weather API error: ${error.message}`, error.stack);
          this.handleAxiosError(error);
          throw error; // unreachable but satisfies TS
        }),
      ),
    );

    return data;
  }

  async postData(endpoint: string, payload: Record<string, any>): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.post(endpoint, payload).pipe(
        retry({ count: 2, delay: 1000 }),
        catchError((error: AxiosError) => {
          this.handleAxiosError(error);
          throw error;
        }),
      ),
    );

    return data;
  }

  private handleAxiosError(error: AxiosError): never {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as any)?.message || error.message;

      this.logger.error(`External API returned ${status}: ${message}`);

      if (status >= 500) {
        throw new ServiceUnavailableException('External service is temporarily unavailable');
      }

      throw new InternalServerErrorException(`External API error: ${message}`);
    }

    if (error.code === 'ECONNABORTED') {
      throw new ServiceUnavailableException('External service request timed out');
    }

    if (error.code === 'ECONNREFUSED') {
      throw new ServiceUnavailableException('External service is unreachable');
    }

    throw new InternalServerErrorException('Failed to communicate with external service');
  }
}
```

## Generic API Client Pattern

For reusable external service integration:

```typescript
// src/common/http/api-client.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosError } from 'axios';
import { catchError, firstValueFrom, retry, timer } from 'rxjs';

export interface ApiClientOptions {
  retries?: number;
  retryDelay?: number;
}

@Injectable()
export class ApiClientService {
  private readonly logger = new Logger(ApiClientService.name);

  constructor(private readonly httpService: HttpService) {}

  async get<T>(url: string, config?: AxiosRequestConfig, options?: ApiClientOptions): Promise<T> {
    const { data } = await firstValueFrom(
      this.httpService.get<T>(url, config).pipe(
        retry({
          count: options?.retries ?? 3,
          delay: (_, retryCount) => timer((options?.retryDelay ?? 1000) * retryCount),
        }),
        catchError((error: AxiosError) => {
          this.logger.error(`GET ${url} failed: ${error.message}`);
          throw error;
        }),
      ),
    );
    return data;
  }

  async post<T>(url: string, body: any, config?: AxiosRequestConfig, options?: ApiClientOptions): Promise<T> {
    const { data } = await firstValueFrom(
      this.httpService.post<T>(url, body, config).pipe(
        retry({
          count: options?.retries ?? 2,
          delay: (_, retryCount) => timer((options?.retryDelay ?? 1000) * retryCount),
        }),
        catchError((error: AxiosError) => {
          this.logger.error(`POST ${url} failed: ${error.message}`);
          throw error;
        }),
      ),
    );
    return data;
  }
}
```

## Webhook Receiver Pattern

```typescript
@Controller('webhooks')
@Public()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleStripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.webhookService.processStripeEvent(payload, signature);
  }
}
```

## Module with Config

```typescript
// Full module example with environment-based configuration
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        baseURL: config.getOrThrow<string>('EXTERNAL_API_URL'),
        timeout: config.get<number>('EXTERNAL_API_TIMEOUT', 5000),
        maxRedirects: 3,
        headers: {
          Authorization: `Bearer ${config.getOrThrow<string>('EXTERNAL_API_TOKEN')}`,
          'Content-Type': 'application/json',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ExternalApiService],
  exports: [ExternalApiService],
})
export class ExternalApiModule {}
```

## Modern Pattern: firstValueFrom (NOT .toPromise())

HttpService returns Observables. Convert to Promises with `firstValueFrom`:

```typescript
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly httpService: HttpService) {}

  async getCurrentWeather(city: string): Promise<WeatherResponse> {
    const { data } = await firstValueFrom(
      this.httpService.get<WeatherResponse>(`/weather?q=${city}`).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(`Weather API error: ${error.response?.status} ${error.message}`);
          throw new BadRequestException(`Weather API error: ${error.message}`);
        }),
      ),
    );
    return data;
  }
}
```

**Do NOT use `.toPromise()` — it's deprecated in RxJS 8.**

## Webhook Receiver with Signature Verification

For receiving webhooks from external services (Stripe, GitHub, etc.), see `@knowledge/27-security-hardening.md` for raw body parsing and HMAC verification.
