import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiHandler, notFound, unauthorized, forbidden } from '@/lib/api-handler';

function makeRequest(body?: unknown, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost:3001/api/test', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const ctx = { params: Promise.resolve({}) };

describe('apiHandler', () => {
  it('passes parsed body to handler', async () => {
    const schema = z.object({ name: z.string() });
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    const wrapped = apiHandler({ body: schema, handler });
    const res = await wrapped(makeRequest({ name: 'test' }), ctx);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(expect.anything(), { name: 'test' }, ctx);
  });

  it('returns 400 on validation failure', async () => {
    const schema = z.object({ name: z.string().min(1) });
    const handler = vi.fn();

    const wrapped = apiHandler({ body: schema, handler });
    const res = await wrapped(makeRequest({ name: '' }), ctx);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validacion fallida');
    expect(body.details).toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 500 on handler error', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapped = apiHandler({ handler });
    const res = await wrapped(makeRequest(), ctx);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error interno del servidor');
    consoleSpy.mockRestore();
  });

  it('works without body schema (GET)', async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 })
    );

    const wrapped = apiHandler({ handler });
    const res = await wrapped(makeRequest(undefined, 'GET'), ctx);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(expect.anything(), undefined, ctx);
  });
});

describe('error helpers', () => {
  it('notFound returns 404', async () => {
    const res = notFound('Lead');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Lead no encontrado');
  });

  it('unauthorized returns 401', async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
  });

  it('forbidden returns 403', async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
  });
});
