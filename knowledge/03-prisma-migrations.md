# Prisma Migrations

## Commands

```bash
# Create a new migration (generates SQL + applies it)
npx prisma migrate dev --name add-work-orders

# Apply pending migrations (production / CI)
npx prisma migrate deploy

# Reset database (drops all data, re-applies all migrations, runs seed)
npx prisma migrate reset

# Generate Prisma Client (after schema changes without migration)
npx prisma generate

# View migration status
npx prisma migrate status

# Pull existing DB schema into schema.prisma
npx prisma db pull

# Push schema without creating migration (prototyping only)
npx prisma db push

# Open Prisma Studio (GUI)
npx prisma studio
```

## Migration Naming

Use descriptive snake_case names:

```bash
npx prisma migrate dev --name add_work_orders_table
npx prisma migrate dev --name add_status_to_work_order
npx prisma migrate dev --name create_user_role_enum
npx prisma migrate dev --name add_index_on_email
npx prisma migrate dev --name add_location_equipment_relation
```

## schema.prisma Example

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  MANAGER
  TECHNICIAN
  EMPLOYEE
}

enum WorkOrderStatus {
  OPEN
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      UserRole @default(EMPLOYEE)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  assignedWorkOrders WorkOrder[] @relation("AssignedTo")
  createdWorkOrders  WorkOrder[] @relation("CreatedBy")

  @@index([email])
  @@index([role])
  @@index([deletedAt])
  @@map("users")
}

model WorkOrder {
  id          String          @id @default(cuid())
  title       String
  description String?
  status      WorkOrderStatus @default(OPEN)
  priority    Priority        @default(MEDIUM)
  dueDate     DateTime?

  assigneeId String?
  assignee   User?   @relation("AssignedTo", fields: [assigneeId], references: [id])

  createdById String
  createdBy   User   @relation("CreatedBy", fields: [createdById], references: [id])

  locationId String?
  location   Location? @relation(fields: [locationId], references: [id])

  tasks Task[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([status])
  @@index([assigneeId])
  @@index([createdById])
  @@index([deletedAt])
  @@map("work_orders")
}

model Task {
  id          String  @id @default(cuid())
  title       String
  isCompleted Boolean @default(false)

  workOrderId String
  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("tasks")
}

model Location {
  id      String @id @default(cuid())
  name    String
  address String?

  workOrders WorkOrder[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("locations")
}
```

## Key Schema Patterns

### Audit Columns (always include)

```prisma
createdAt DateTime  @default(now())
updatedAt DateTime  @updatedAt
```

### Soft Delete

```prisma
deletedAt DateTime?

@@index([deletedAt])
```

### Relations

```prisma
// One-to-many
assigneeId String?
assignee   User? @relation(fields: [assigneeId], references: [id])

// Cascade delete
workOrder WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
```

### Composite Unique

```prisma
@@unique([tenantId, email])
```

## Seeding

`prisma/seed.ts`:

```typescript
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log('Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```
