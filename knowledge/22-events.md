# Events (EventEmitter)

## When to Use

- Decoupling side effects from main business logic (e.g., send email after user registration)
- Notifying multiple modules about state changes without direct imports
- Audit logging without cluttering service methods
- Triggering cache invalidation from a different module

## Installation

```bash
npm install @nestjs/event-emitter
```

## Module Setup

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
})
export class AppModule {}
```

## Defining Event Classes

Create typed event classes in a shared location:

```typescript
// src/modules/common/events/user-created.event.ts
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
  ) {}
}

// src/modules/common/events/reservation-cancelled.event.ts
export class ReservationCancelledEvent {
  constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly reason: string,
  ) {}
}
```

## Emitting Events

Emit from services after the primary operation succeeds:

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.create(dto);

    this.eventEmitter.emit(
      'user.created',
      new UserCreatedEvent(user.id, user.email, user.name),
    );

    return user;
  }
}
```

## Listening to Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  @OnEvent('user.created')
  async handleUserCreated(event: UserCreatedEvent) {
    this.logger.log(`Sending welcome email to ${event.email}`);
    await this.emailService.sendWelcome(event.email, event.name);
  }

  @OnEvent('reservation.cancelled')
  async handleReservationCancelled(event: ReservationCancelledEvent) {
    this.logger.log(`Notifying user ${event.userId} of cancellation`);
  }
}
```

### Async Listeners

```typescript
@OnEvent('user.created', { async: true, suppressErrors: true })
async handleUserCreatedAsync(event: UserCreatedEvent) {
  // Runs asynchronously, errors won't crash the emitter
}
```

## Event Naming Convention

Use dot-notation namespaces: `{domain}.{action}`

- `user.created`, `user.blocked`, `user.deleted`
- `reservation.created`, `reservation.cancelled`
- `payment.succeeded`, `payment.failed`

## Folder Structure

```
src/modules/common/events/
├── user-created.event.ts
├── reservation-cancelled.event.ts
└── index.ts                        # Re-export all events

src/modules/notifications/
├── listeners/
│   ├── email.listener.ts
│   └── audit.listener.ts
├── notifications.module.ts
└── notifications.service.ts
```

## DO NOT

- Do NOT emit events before the database write succeeds — emit AFTER commit
- Do NOT use events for synchronous operations that need a return value — use direct service calls
- Do NOT put business logic in listeners — keep them thin (delegate to services)
- Do NOT forget to register listener classes as providers in their module
- Do NOT use events to replace direct dependencies between tightly coupled modules
