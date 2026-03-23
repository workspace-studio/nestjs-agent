# Code Style & Conventions

## ESLint Configuration

The project uses `@typescript-eslint` with Prettier integration. The `.eslintrc.js` at root:

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'import'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/order': [
      'error',
      {
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [
          { pattern: '@nestjs/**', group: 'external', position: 'before' },
          { pattern: 'src/**', group: 'internal', position: 'before' },
        ],
        pathGroupsExcludedImportTypes: ['@nestjs'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
  },
};
```

## Prettier Configuration

`.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 120,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## Naming Conventions

| Element          | Convention       | Example                          |
|------------------|------------------|----------------------------------|
| Files            | kebab-case       | `work-order.service.ts`          |
| Classes          | PascalCase       | `WorkOrderService`               |
| Interfaces       | PascalCase       | `WorkOrderResponse`              |
| DTOs             | PascalCase       | `CreateWorkOrderDto`             |
| Variables/funcs  | camelCase        | `findAllByStatus`                |
| Constants        | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                |
| Enums            | PascalCase       | `WorkOrderStatus`                |
| Enum members     | UPPER_SNAKE_CASE | `IN_PROGRESS`                    |
| DB tables        | snake_case       | `work_order` (Prisma maps)       |
| Test files       | kebab-case       | `work-order.service.spec.ts`     |

## DTO Naming

- Create: `Create{Name}Dto` (e.g., `CreateWorkOrderDto`)
- Update: `Update{Name}Dto` (e.g., `UpdateWorkOrderDto`)
- Response: `{Name}ResponseDto` (e.g., `WorkOrderResponseDto`)
- Query/filter: `Query{Name}Dto` (e.g., `QueryWorkOrderDto`)

## Import Order

Always follow this order with blank lines between groups:

```typescript
// 1. @nestjs imports
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 2. Third-party imports
import { plainToInstance } from 'class-transformer';

// 3. Cross-module imports via src/ path alias
import { PrismaService } from 'src/modules/common/prisma/prisma.service';

// 4. Within-module relative imports
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { WorkOrderRepository } from './work-order.repository';
```

**Rule**: Cross-module imports always use `src/` path alias. Within-module imports use `./`. Never use `../` to cross module boundaries.

## Dependency Injection

Always use `private readonly` for injected dependencies:

```typescript
@Injectable()
export class WorkOrderService {
  constructor(
    private readonly workOrderRepository: WorkOrderRepository,
    private readonly configService: ConfigService,
  ) {}
}
```

## Exports

- **Never** use default exports. Always use named exports.
- One class per file.
- File name must match the class name in kebab-case (e.g., `WorkOrderService` lives in `work-order.service.ts`).

## Type Imports

Use `import type` for interfaces and type-only imports that are not used at runtime:

```typescript
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { PaginatedResult } from 'src/modules/common/utils/pagination';
```

## File Suffixes

| Type         | Suffix              | Example                        |
|--------------|---------------------|--------------------------------|
| Controller   | `.controller.ts`    | `work-order.controller.ts`     |
| Service      | `.service.ts`       | `work-order.service.ts`        |
| Repository   | `.repository.ts`    | `work-order.repository.ts`     |
| Module       | `.module.ts`        | `work-order.module.ts`         |
| DTO          | `.dto.ts`           | `create-work-order.dto.ts`     |
| Guard        | `.guard.ts`         | `roles.guard.ts`               |
| Interceptor  | `.interceptor.ts`   | `response.interceptor.ts`      |
| Filter       | `.filter.ts`        | `exception.filter.ts`          |
| Pipe         | `.pipe.ts`          | `parse-uuid.pipe.ts`           |
| Middleware   | `.middleware.ts`    | `logging.middleware.ts`        |
| Unit test    | `.spec.ts`          | `work-order.service.spec.ts`   |
| E2E test     | `.e2e-spec.ts`      | `work-order.e2e-spec.ts`       |
