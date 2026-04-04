import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { DuckDBServer, type DuckDBServerInfo } from './helpers/DuckDBServer';

// Use a high port to avoid conflicts with any running DuckDB UI
const TEST_PORT_AUTH_ENABLED = 14213;
const TEST_PORT_AUTH_DISABLED = 14214;

describe('token auth enabled', () => {
  const server = new DuckDBServer({
    port: TEST_PORT_AUTH_ENABLED,
    tokenAuth: true,
  });
  let info: DuckDBServerInfo;

  beforeAll(async () => {
    info = await server.start();
  });

  afterAll(() => {
    server.stop();
  });

  // --- /info endpoint (no auth required) ---

  test('/info does not require authentication', async () => {
    const res = await fetch(`${info.url}/info`);
    expect(res.status).toBe(200);
  });

  test('/info returns DuckDB version headers', async () => {
    const res = await fetch(`${info.url}/info`);
    expect(res.headers.get('X-DuckDB-Version')).toBeTruthy();
    expect(res.headers.get('X-DuckDB-Platform')).toBeTruthy();
    expect(res.headers.get('X-DuckDB-UI-Extension-Version')).toBeTruthy();
  });

  test('/info returns Access-Control-Allow-Origin header', async () => {
    const res = await fetch(`${info.url}/info`);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  // --- Authentication via Authorization header ---

  test('valid Authorization header grants access', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: { Authorization: `token ${info.token}` },
    });
    expect(res.status).toBe(200);
  });

  test('valid Authorization header sets cookie', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: { Authorization: `token ${info.token}` },
    });
    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toContain(`duckdb_ui_token=${info.token}`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Path=/');
  });

  test('invalid Authorization header returns 401', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: { Authorization: 'token invalid_token' },
    });
    expect(res.status).toBe(401);
  });

  test('wrong Authorization scheme returns 401', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: { Authorization: `Bearer ${info.token}` },
    });
    expect(res.status).toBe(401);
  });

  test('empty Authorization header returns 401', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: { Authorization: '' },
    });
    expect(res.status).toBe(401);
  });

  // --- Authentication via URL query parameter ---

  test('valid token query parameter grants access', async () => {
    const res = await fetch(`${info.url}/localToken?token=${info.token}`);
    expect(res.status).toBe(200);
  });

  test('valid token query parameter sets cookie', async () => {
    const res = await fetch(`${info.url}/localToken?token=${info.token}`);
    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toContain(`duckdb_ui_token=${info.token}`);
  });

  test('invalid token query parameter returns 401', async () => {
    const res = await fetch(`${info.url}/localToken?token=wrong`);
    expect(res.status).toBe(401);
  });

  // --- Authentication via Cookie ---

  test('valid cookie grants access', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: { Cookie: `duckdb_ui_token=${info.token}` },
    });
    expect(res.status).toBe(200);
  });

  test('valid cookie among multiple cookies grants access', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: {
        Cookie: `other=foo; duckdb_ui_token=${info.token}; another=bar`,
      },
    });
    expect(res.status).toBe(200);
  });

  test('invalid cookie returns 401', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: { Cookie: 'duckdb_ui_token=wrong_token' },
    });
    expect(res.status).toBe(401);
  });

  test('missing cookie returns 401', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: { Cookie: 'other=foo' },
    });
    expect(res.status).toBe(401);
  });

  // --- No credentials at all ---

  test('request with no credentials returns 401', async () => {
    const res = await fetch(`${info.url}/localToken`);
    expect(res.status).toBe(401);
  });

  // --- Token properties ---

  test('token is a 64-character hex string', () => {
    expect(info.token).toMatch(/^[0-9a-f]{64}$/);
  });

  // --- Protected endpoints return 401 without auth ---

  test('/localEvents returns 401 without auth', async () => {
    const res = await fetch(`${info.url}/localEvents`);
    expect(res.status).toBe(401);
  });

  // The catch-all GET handler proxies to remote, but requires auth first
  test('GET / returns 401 without auth', async () => {
    const res = await fetch(`${info.url}/`);
    expect(res.status).toBe(401);
  });

  test('POST /ddb/run returns 401 without auth', async () => {
    const res = await fetch(`${info.url}/ddb/run`, {
      method: 'POST',
      body: 'SELECT 1',
    });
    expect(res.status).toBe(401);
  });

  test('POST /ddb/tokenize returns 401 without auth', async () => {
    const res = await fetch(`${info.url}/ddb/tokenize`, {
      method: 'POST',
      body: 'SELECT 1',
    });
    expect(res.status).toBe(401);
  });

  test('POST /ddb/interrupt returns 401 without auth', async () => {
    const res = await fetch(`${info.url}/ddb/interrupt`, {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });

  // --- Auth grants access to protected endpoints ---

  test('/localToken is accessible with valid auth', async () => {
    const res = await fetch(`${info.url}/localToken`, {
      headers: { Authorization: `token ${info.token}` },
    });
    // Returns 200 (body may be empty if MotherDuck is not connected)
    expect(res.status).toBe(200);
  });

  test('/localEvents is accessible with valid auth', async () => {
    const controller = new AbortController();
    const res = await fetch(`${info.url}/localEvents`, {
      headers: { Authorization: `token ${info.token}` },
      signal: controller.signal,
    });
    // SSE endpoint returns 200 with chunked transfer
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    controller.abort();
  });
});

describe('token auth disabled', () => {
  const server = new DuckDBServer({
    port: TEST_PORT_AUTH_DISABLED,
    tokenAuth: false,
  });
  let info: DuckDBServerInfo;

  beforeAll(async () => {
    info = await server.start();
  });

  afterAll(() => {
    server.stop();
  });

  test('/info is accessible without auth', async () => {
    const res = await fetch(`${info.url}/info`);
    expect(res.status).toBe(200);
  });

  test('/localToken is accessible without auth', async () => {
    const res = await fetch(`${info.url}/localToken`);
    expect(res.status).toBe(200);
  });

  test('/localEvents is accessible without auth', async () => {
    const controller = new AbortController();
    const res = await fetch(`${info.url}/localEvents`, {
      signal: controller.signal,
    });
    expect(res.status).toBe(200);
    controller.abort();
  });

  test('a token is still generated even when auth is disabled', () => {
    expect(info.token).toMatch(/^[0-9a-f]{64}$/);
  });
});
