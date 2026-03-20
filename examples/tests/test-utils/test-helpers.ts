import { ExecutionContext } from '@nestjs/common';

export function mockUserFactory(overrides: Record<string, any> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@test.com',
    role: 'ADMIN',
    tenantId: 'test-tenant-id',
    ...overrides,
  };
}

export function createMockExecutionContext(
  user: Record<string, any> = mockUserFactory(),
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({ statusCode: 200 }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

export function mockPrismaService() {
  const createModelMock = () => ({
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  });

  return {
    hall: createModelMock(),
    equipment: createModelMock(),
    user: createModelMock(),
    tenant: createModelMock(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $transaction: jest.fn((fn: any) => fn()),
  };
}

export async function cleanDatabase(prisma: any) {
  const tables = ['Equipment', 'Hall', 'User'];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${table}" CASCADE;`,
    );
  }
}
