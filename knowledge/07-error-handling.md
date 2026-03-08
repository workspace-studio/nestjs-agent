# Error Handling

## Built-in NestJS Exceptions

| Exception                    | Status | When to Use                                    |
|------------------------------|--------|------------------------------------------------|
| `BadRequestException`        | 400    | Invalid input, business rule violation         |
| `UnauthorizedException`      | 401    | Missing/invalid credentials                    |
| `ForbiddenException`         | 403    | Authenticated but not authorized               |
| `NotFoundException`          | 404    | Resource not found                             |
| `ConflictException`          | 409    | Duplicate resource (unique constraint)         |
| `GoneException`              | 410    | Resource no longer available                   |
| `UnprocessableEntityException`| 422   | Semantically invalid request                   |
| `InternalServerErrorException`| 500   | Unexpected server error                        |
| `ServiceUnavailableException`| 503    | Downstream service unavailable                 |

## LoggingExceptionFilter

```typescript
// src/common/filters/exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class LoggingExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LoggingExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        message = resp.message || exception.message;
        error = resp.error || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      // Log full stack for unexpected errors
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Log 4xx as warnings, 5xx as errors
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} ${status}`, JSON.stringify({ message }));
    } else if (status >= 400) {
      this.logger.warn(`${request.method} ${request.url} ${status}: ${JSON.stringify(message)}`);
    }

    const responseBody = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(responseBody);
  }
}
```

Register globally in `main.ts`:

```typescript
app.useGlobalFilters(new LoggingExceptionFilter());
```

## Standard Error Response Format

All errors return this shape:

```json
{
  "statusCode": 404,
  "message": "Work order with ID \"abc123\" not found",
  "error": "Not Found",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/work-orders/abc123"
}
```

## Validation Error Format

When `class-validator` rejects input (via `ValidationPipe`), the response is:

```json
{
  "statusCode": 400,
  "message": [
    "title must be a string",
    "title should not be empty",
    "priority must be one of the following values: LOW, MEDIUM, HIGH, CRITICAL"
  ],
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/work-orders"
}
```

## Usage in Services

```typescript
@Injectable()
export class WorkOrderService {
  async findOne(id: string): Promise<WorkOrderResponseDto> {
    const workOrder = await this.repository.findById(id);
    if (!workOrder) {
      throw new NotFoundException(`Work order with ID "${id}" not found`);
    }
    return this.toResponseDto(workOrder);
  }

  async create(dto: CreateWorkOrderDto): Promise<WorkOrderResponseDto> {
    const exists = await this.repository.existsByTitle(dto.title);
    if (exists) {
      throw new ConflictException(`Work order with title "${dto.title}" already exists`);
    }

    if (dto.dueDate && new Date(dto.dueDate) < new Date()) {
      throw new BadRequestException('Due date must be in the future');
    }

    // ... create logic
  }

  async updateStatus(id: string, status: WorkOrderStatus): Promise<WorkOrderResponseDto> {
    const workOrder = await this.findOneOrFail(id);

    if (workOrder.status === WorkOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot change status of a cancelled work order');
    }

    // ... update logic
  }

  private async findOneOrFail(id: string) {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Work order with ID "${id}" not found`);
    }
    return entity;
  }
}
```

## Custom Exception (if needed)

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessRuleException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message,
        error: 'Business Rule Violation',
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
```
