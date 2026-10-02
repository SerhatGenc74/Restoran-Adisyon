import { describe, it, expect, vi } from 'vitest';
import { requireRoles } from './authorization-middleware.js';

describe('Authorization Middleware', () => {
  it('should allow access if user has required role', async () => {
    const request = { user: { role: 'ADMIN' }, jwtVerify: vi.fn().mockResolvedValue(undefined) } as any;
    const reply = {} as any;
    
    const middleware = requireRoles('ADMIN', 'OWNER');
    await expect(middleware(request, reply)).resolves.toBeUndefined();
    expect(request.jwtVerify).toHaveBeenCalled();
  });

  it('should reject access if user lacks required role', async () => {
    const request = { user: { role: 'WAITER' }, jwtVerify: vi.fn().mockResolvedValue(undefined) } as any;
    const reply = { forbidden: vi.fn() } as any;
    
    const middleware = requireRoles('ADMIN', 'OWNER');
    await middleware(request, reply);
    expect(reply.forbidden).toHaveBeenCalledWith('Bu işlem için yetkiniz bulunmuyor.');
  });

  it('should reject access if user is missing (unauthenticated)', async () => {
    const request = { user: null, jwtVerify: vi.fn().mockRejectedValue(new Error("Unauthenticated")) } as any;
    const reply = { forbidden: vi.fn(), unauthorized: vi.fn() } as any;
    
    const middleware = requireRoles('ADMIN');
    // It should throw the error that jwtVerify throws, or handle it depending on how the route handles it.
    // If the middleware doesn't catch it, it bubbles up. Let's see if it bubbles up.
    await expect(middleware(request, reply)).rejects.toThrow("Unauthenticated");
  });
});
