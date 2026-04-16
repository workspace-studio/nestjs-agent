# OAuth & Two-Factor Authentication (2FA)

## Google OAuth

### Installation

```bash
npm install passport-google-oauth20
npm install -D @types/passport-google-oauth20
```

### Google Strategy

```typescript
// src/modules/auth/strategies/google.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
    };
    done(null, user);
  }
}
```

### Google Auth Guard

```typescript
// src/modules/auth/guards/google-auth.guard.ts
import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
```

### Controller Endpoints

```typescript
@Controller('auth')
export class AuthController {
  @Get('google')
  @Public()
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request) {
    // req.user contains the Google profile from validate()
    return this.authService.googleLogin(req.user);
  }
}
```

### Auth Service — Google Login

```typescript
async googleLogin(googleUser: GoogleUserDto): Promise<{ accessToken: string }> {
  // Find or create user
  let user = await this.usersRepository.findByEmail(googleUser.email);

  if (!user) {
    user = await this.usersRepository.create({
      email: googleUser.email,
      name: `${googleUser.firstName} ${googleUser.lastName}`,
      password: '', // no password for OAuth users
      provider: 'GOOGLE',
    });
  }

  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
  return { accessToken: await this.jwtService.signAsync(payload) };
}
```

### Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### Auth Module

```typescript
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({ /* ... */ }),
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

---

## Two-Factor Authentication (TOTP)

### Installation

```bash
npm install otplib qrcode
npm install -D @types/qrcode
```

### Prisma Schema

```prisma
model User {
  // ... existing fields
  twoFactorSecret   String?
  isTwoFactorEnabled Boolean @default(false)
}
```

### 2FA Service

```typescript
import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';

@Injectable()
export class TwoFactorService {
  async generateSecret(userId: string, email: string) {
    const secret = authenticator.generateSecret();

    await this.usersRepository.update(userId, { twoFactorSecret: secret });

    const otpAuthUrl = authenticator.keyuri(email, 'MyApp', secret);
    const qrCode = await toDataURL(otpAuthUrl);

    return { secret, qrCode };
  }

  verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }

  async enable2FA(userId: string, token: string): Promise<void> {
    const user = await this.usersRepository.findOne(userId);
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Generate a secret first');
    }

    const isValid = this.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    await this.usersRepository.update(userId, { isTwoFactorEnabled: true });
  }

  async validate2FA(userId: string, token: string): Promise<boolean> {
    const user = await this.usersRepository.findOne(userId);
    if (!user?.twoFactorSecret || !user.isTwoFactorEnabled) {
      return true; // 2FA not enabled, skip
    }
    return this.verifyToken(token, user.twoFactorSecret);
  }
}
```

### 2FA Controller

```typescript
@Controller('auth/2fa')
@ApiBearerAuth('bearerAuth')
export class TwoFactorController {
  @Post('generate')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  async generate(@User('sub') userId: string) {
    const user = await this.usersService.findOne(userId);
    return this.twoFactorService.generateSecret(userId, user.email);
  }

  @Post('enable')
  @ApiOperation({ summary: 'Enable 2FA with verification token' })
  async enable(
    @User('sub') userId: string,
    @Body() dto: Enable2FADto,
  ) {
    await this.twoFactorService.enable2FA(userId, dto.token);
    return { message: '2FA enabled' };
  }

  @Post('verify')
  @Public()
  @ApiOperation({ summary: 'Verify 2FA token during login' })
  async verify(@Body() dto: Verify2FADto) {
    const isValid = await this.twoFactorService.validate2FA(dto.userId, dto.token);
    if (!isValid) throw new UnauthorizedException('Invalid 2FA token');
    return this.authService.generateFullToken(dto.userId);
  }
}
```

### Login Flow with 2FA

```typescript
// auth.service.ts
async login(dto: LoginDto): Promise<LoginResponseDto> {
  const user = await this.validateCredentials(dto.email, dto.password);

  if (user.isTwoFactorEnabled) {
    // Return partial token that only allows 2FA verification
    const partialToken = await this.jwtService.signAsync(
      { sub: user.id, requires2FA: true },
      { expiresIn: '5m' },
    );
    return { requires2FA: true, partialToken };
  }

  // Normal login — full access token
  return { accessToken: await this.generateFullToken(user.id) };
}
```

### DTOs

```typescript
export class Enable2FADto {
  @ApiProperty({ description: '6-digit TOTP code from authenticator app' })
  @IsString()
  @Length(6, 6)
  token: string;
}

export class Verify2FADto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ description: '6-digit TOTP code' })
  @IsString()
  @Length(6, 6)
  token: string;
}
```

---

## Folder Structure

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── google.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── google-auth.guard.ts
├── two-factor/
│   ├── two-factor.service.ts
│   ├── two-factor.controller.ts
│   └── dto/
│       ├── enable-2fa.dto.ts
│       └── verify-2fa.dto.ts
├── decorators/
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── user.decorator.ts
└── dto/
    ├── login.dto.ts
    └── register.dto.ts
```

## DO NOT

- Do NOT store Google client secret in code — use environment variables
- Do NOT store 2FA secrets unencrypted in production — encrypt at rest
- Do NOT skip email verification before enabling 2FA
- Do NOT allow password-only login when 2FA is enabled — always require the TOTP code
- Do NOT use SMS-based 2FA — TOTP (authenticator app) is more secure
- Do NOT forget to handle the case where an OAuth user tries to login with password (they have no password)
