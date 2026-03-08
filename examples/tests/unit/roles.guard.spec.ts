import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Role } from '../../../common/enums/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  function createMockContext(userRole: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, role: userRole, tenantId: 1 },
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext('USER');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const context = createMockContext('USER');

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access when user has one of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, 'MANAGER']);
    const context = createMockContext('MANAGER');

    expect(guard.canActivate(context)).toBe(true);
  });
});
