# API Versioning

## When to Use

- Breaking changes to response format or request shape
- Multiple frontend clients on different versions
- Gradual migration of consumers to new API contract
- Public APIs with external consumers

## Setup

```typescript
// main.ts
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,        // /v1/courts, /v2/courts
    defaultVersion: '1',             // unversioned routes default to v1
  });

  await app.listen(3000);
}
```

## Versioning Types

### URI Versioning (Recommended)

```typescript
app.enableVersioning({
  type: VersioningType.URI, // /v1/courts, /v2/courts
});
```

### Header Versioning

```typescript
app.enableVersioning({
  type: VersioningType.HEADER,
  header: 'X-API-Version', // Custom-Header: 1
});
```

### Media Type Versioning

```typescript
app.enableVersioning({
  type: VersioningType.MEDIA_TYPE,
  key: 'v=', // Accept: application/json;v=2
});
```

## Controller Versioning

Entire controller on one version:

```typescript
@Controller({ path: 'courts', version: '1' })
export class CourtsControllerV1 {
  @Get()
  findAll() {
    return this.courtsService.findAllV1();
  }
}

@Controller({ path: 'courts', version: '2' })
export class CourtsControllerV2 {
  @Get()
  findAll() {
    return this.courtsService.findAllV2(); // New response format
  }
}
```

## Route Versioning

Different versions on individual routes:

```typescript
@Controller('courts')
export class CourtsController {
  @Version('1')
  @Get()
  findAllV1() {
    return this.courtsService.findAllV1();
  }

  @Version('2')
  @Get()
  findAllV2() {
    return this.courtsService.findAllV2();
  }
}
```

## Multiple Versions

Share handler across versions:

```typescript
@Controller({ path: 'courts', version: ['1', '2'] })
export class CourtsController {
  @Get()
  findAll() {
    // Same handler for v1 and v2
  }
}
```

## Version-Neutral Routes

Routes that work across all versions:

```typescript
import { VERSION_NEUTRAL } from '@nestjs/common';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

## Folder Structure (when using versioning)

```
src/modules/courts/
├── courts.module.ts
├── v1/
│   ├── courts-v1.controller.ts
│   └── dto/
│       └── court-v1-response.dto.ts
├── v2/
│   ├── courts-v2.controller.ts
│   └── dto/
│       └── court-v2-response.dto.ts
├── courts.service.ts              # Shared business logic
├── courts.repository.ts           # Shared data access
└── dto/
    ├── create-court.dto.ts        # Shared input DTOs
    └── update-court.dto.ts
```

## DO NOT

- Do NOT version internal APIs consumed only by your own frontend — use versioning for public/multi-consumer APIs
- Do NOT create a new version for every minor change — version only on breaking changes
- Do NOT duplicate entire services per version — share logic, only version the response shape
- Do NOT mix versioning types (URI + header) in the same app
- Do NOT forget to document version deprecation timelines for consumers
