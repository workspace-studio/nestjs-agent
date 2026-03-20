# Swagger / OpenAPI Documentation

## main.ts Setup

```typescript
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'bearerAuth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Work Orders', 'Work order management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger-ui', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(3000);
}
bootstrap();
```

## DTO Decorators

### Basic DTO with Validation + Swagger

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecureP@ss1',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.TECHNICIAN,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1-555-0100',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
```

### Update DTO (PartialType)

```typescript
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'Whether the user account is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

**Important:** Use `PartialType` from `@nestjs/swagger` (not `@nestjs/mapped-types`) to inherit Swagger metadata.

### Response DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ example: 'clx1234567890' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @Expose()
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @Expose()
  @ApiProperty({ enum: UserRole, example: UserRole.TECHNICIAN })
  role: UserRole;

  @Expose()
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  created: Date;
}
```

## Controller Decorators

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { Role } from 'src/auth/enums/role.enum';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@ApiBearerAuth('bearerAuth')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ description: 'User created successfully', type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email already exists' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({ description: 'List of users', type: [UserResponseDto] })
  @ApiQuery({ name: 'pageNumber', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('pageNumber') pageNumber = 0,
    @Query('pageSize') pageSize = 20,
    @Query('search') search?: string,
  ) {
    return this.userService.findAll({ pageNumber, pageSize, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'User found', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'User updated', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiNoContentResponse({ description: 'User deleted' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
```

## Combined Decorator Pattern

For repeated decorator stacks, use `applyDecorators`:

```typescript
import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';

import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

export function AdminOnly() {
  return applyDecorators(
    Roles(Role.ADMIN),
    ApiBearerAuth('bearerAuth'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Forbidden - Admin role required' }),
  );
}

// Usage:
@AdminOnly()
@Post()
async create(@Body() dto: CreateUserDto) { ... }
```

## Enum Documentation

```typescript
export enum WorkOrderStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// In DTO:
@ApiProperty({
  enum: WorkOrderStatus,
  enumName: 'WorkOrderStatus',
  description: 'Current status of the work order',
  example: WorkOrderStatus.OPEN,
})
@IsEnum(WorkOrderStatus)
status: WorkOrderStatus;
```

## Paginated Response Schema

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 0 })
  pageNumber: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class PaginatedResponseDto<T> {
  entities: T[];

  @ApiProperty()
  totalCount: number;

  @ApiProperty({ type: PaginationMetaDto })
  pagination: PaginationMetaDto;
}

// For Swagger generic type, create concrete classes:
export class PaginatedUserResponseDto extends PaginatedResponseDto<UserResponseDto> {
  @ApiProperty({ type: [UserResponseDto] })
  entities: UserResponseDto[];
}
```

## @ApiExcludeController

Use `@ApiExcludeController()` to hide internal endpoints (e.g., scheduled task triggers) from Swagger:

```typescript
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('tasks')
export class TasksController {
  // These endpoints won't appear in Swagger docs
}
```
