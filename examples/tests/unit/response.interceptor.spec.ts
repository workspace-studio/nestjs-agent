import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/test' }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should wrap a plain object response', (done) => {
    const data = { id: 1, name: 'Test' };
    const callHandler: CallHandler = { handle: () => of(data) };

    interceptor.intercept(mockExecutionContext, callHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({ data: { id: 1, name: 'Test' } });
        done();
      },
    });
  });

  it('should wrap an array response', (done) => {
    const data = [{ id: 1 }, { id: 2 }];
    const callHandler: CallHandler = { handle: () => of(data) };

    interceptor.intercept(mockExecutionContext, callHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({ data: [{ id: 1 }, { id: 2 }] });
        done();
      },
    });
  });

  it('should pass through paginated results with meta', (done) => {
    const data = {
      data: [{ id: 1 }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    const callHandler: CallHandler = { handle: () => of(data) };

    interceptor.intercept(mockExecutionContext, callHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          data: [{ id: 1 }],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        });
        done();
      },
    });
  });

  it('should handle null response', (done) => {
    const callHandler: CallHandler = { handle: () => of(null) };

    interceptor.intercept(mockExecutionContext, callHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({ data: null });
        done();
      },
    });
  });
});
