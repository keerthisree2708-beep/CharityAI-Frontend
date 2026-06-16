'use strict';

/**
 * UNIT / API TESTS — U-01 to U-07
 * Direct HTTP tests against the live Render backend (no browser needed).
 */

const { get, post, authHeader, API_URL } = require('../helpers/apiHelper');

let TEST_EMAIL = process.env.TEST_EMAIL || '';
let TEST_PASSWORD = process.env.TEST_PASSWORD || '';

// ─── Utility ──────────────────────────────────────────────────────────────────

async function runTest(id, category, name, fn) {
  const start = Date.now();
  try {
    await fn();
    return { id, category, name, status: 'PASS', durationMs: Date.now() - start, error: null };
  } catch (err) {
    const msg = err.message || String(err);
    return { id, category, name, status: 'FAIL', durationMs: Date.now() - start, error: msg.slice(0, 300) };
  }
}

// ─── Test implementations ─────────────────────────────────────────────────────

/**
 * U-01: Health check — root endpoint returns 200 and the API is alive.
 *        Retries up to 3 times with 15s delay to handle Render cold starts.
 */
async function U01_healthCheck() {
  const baseUrl = API_URL.replace(/\/api\/?$/, '');
  const axios = require('axios');
  const MAX_RETRIES = 3;
  let lastErr = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(baseUrl, { timeout: 30000, validateStatus: () => true });
      if (res.status === 200) {
        const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        // Accept any 200 response — Render may return generic text
        return; // PASS
      }
      lastErr = new Error(`Backend root returned HTTP ${res.status}.`);
    } catch (e) {
      lastErr = e;
      console.log(`  [U-01] Attempt ${attempt}/${MAX_RETRIES} failed: ${e.message}. Retrying in 15s...`);
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 15000));
    }
  }
  throw lastErr || new Error('Backend health check failed after 3 attempts.');
}

/**
 * U-02: Register endpoint — POST /api/auth/register returns a token on success.
 */
async function U02_registerEndpointReturnsToken() {
  const uniqueEmail = `api_test_${Date.now()}@charityaitest.com`;
  const res = await post('/auth/register', {
    name:     'API Test User',
    email:    uniqueEmail,
    password: 'APITestPass@123',
    phone:    `+9190000${Date.now().toString().slice(-5)}`,
    address:  'API Test City',
    role:     'donor',
  });

  // Detect backend JWT_SECRET misconfiguration (common on Render first deploy)
  if (res.status === 500) {
    const body = JSON.stringify(res.data || '');
    if (body.includes('secretOrPrivateKey') || body.includes('secret') || body.includes('jwt')) {
      throw new Error(
        'Backend JWT_SECRET is NOT configured on Render. ' +
        'Go to Render Dashboard → Your Service → Environment → Add JWT_SECRET=<your_secret_key>. ' +
        'This is a backend environment config issue, not a code bug.'
      );
    }
    throw new Error(`Register returned HTTP 500: ${body.slice(0, 200)}`);
  }

  if (res.status !== 200 && res.status !== 201) {
    const msg = res.data?.message || JSON.stringify(res.data).slice(0, 200);
    throw new Error(`Register returned HTTP ${res.status}: ${msg}`);
  }

  const token = res.data?.data?.token || res.data?.token;
  if (!token) {
    throw new Error(`Register response missing token. Body: ${JSON.stringify(res.data).slice(0, 300)}`);
  }
}

/**
 * U-03: Login endpoint — POST /api/auth/login returns a JWT token for valid credentials.
 */
async function U03_loginEndpointReturnsToken() {
  const email    = TEST_EMAIL;
  const password = TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_EMAIL / TEST_PASSWORD not configured — cannot test login endpoint.');
  }

  const res = await post('/auth/login', { email, password });

  if (res.status !== 200) {
    const msg = res.data?.message || JSON.stringify(res.data).slice(0, 200);
    throw new Error(`Login returned HTTP ${res.status}: ${msg}`);
  }

  const token = res.data?.data?.token || res.data?.token;
  if (!token) {
    throw new Error(`Login response missing token. Body: ${JSON.stringify(res.data).slice(0, 300)}`);
  }
}

/**
 * U-04: Login with wrong password — should return 400 or 401, NOT 200.
 */
async function U04_loginWrongPasswordReturns401() {
  const res = await post('/auth/login', {
    email:    TEST_EMAIL || 'nobody_real@charityaitest.com',
    password: 'absolutelyWrongPassword_xyz_99',
  });

  if (res.status === 200) {
    throw new Error('Login with wrong password returned HTTP 200 — authentication is broken!');
  }
  if (res.status !== 400 && res.status !== 401 && res.status !== 403) {
    throw new Error(`Login with wrong password returned unexpected status ${res.status}.`);
  }
}

/**
 * U-05: Profile endpoint — GET /api/auth/profile requires authentication.
 *        Without a token it should return 401.
 */
async function U05_profileEndpointRequiresAuth() {
  // No token
  const resNoAuth = await get('/auth/profile');
  if (resNoAuth.status !== 401 && resNoAuth.status !== 403) {
    throw new Error(`Profile without token returned ${resNoAuth.status}, expected 401/403.`);
  }

  // With a valid token
  const email    = TEST_EMAIL;
  const password = TEST_PASSWORD;
  if (email && password) {
    const loginRes = await post('/auth/login', { email, password });
    const token = loginRes.data?.data?.token || loginRes.data?.token;
    if (token) {
      const resAuth = await get('/auth/profile', authHeader(token));
      if (resAuth.status !== 200) {
        throw new Error(`Profile with valid token returned ${resAuth.status}, expected 200.`);
      }
    }
  }
}

/**
 * U-06: NGO requirements endpoint — GET /api/ngo/requirements responds (public).
 */
async function U06_ngoRequirementsEndpointResponds() {
  const res = await get('/ngo/requirements');
  // Should return 200 (even if empty array)
  if (res.status !== 200) {
    throw new Error(`GET /api/ngo/requirements returned HTTP ${res.status}, expected 200.`);
  }
  // Response should be JSON
  if (!res.data) {
    throw new Error('GET /api/ngo/requirements returned empty body.');
  }
}

/**
 * U-07: Nearby NGOs endpoint — GET /api/donations/nearby-ngos responds.
 */
async function U07_nearbyNgosEndpointResponds() {
  const res = await get('/donations/nearby-ngos');
  if (res.status !== 200 && res.status !== 400) {
    // 400 is acceptable if location params are required but not provided
    throw new Error(`GET /api/donations/nearby-ngos returned HTTP ${res.status}, expected 200 or 400.`);
  }
  if (!res.data) {
    throw new Error('GET /api/donations/nearby-ngos returned empty body.');
  }
}

// ─── Suite runner ─────────────────────────────────────────────────────────────

async function runUnitApiTests() {
  console.log('\n⚙️  Running UNIT / API Tests (U-01 → U-07)...\n');

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.log('  [03_unit_api] TEST_EMAIL/TEST_PASSWORD not configured. Registering a test user dynamically...');
    try {
      const uniqueSuffix = Date.now();
      const uniqueEmail = `api_test_${uniqueSuffix}@charityaitest.com`;
      const res = await post('/auth/register', {
        name:     'API Test User',
        email:    uniqueEmail,
        password: 'APITestPass@123',
        phone:    `+9190000${uniqueSuffix.toString().slice(-5)}`,
        address:  'API Test City',
        role:     'donor',
      });
      if (res.status === 201 || res.status === 200) {
        TEST_EMAIL = uniqueEmail;
        TEST_PASSWORD = 'APITestPass@123';
        console.log(`  [03_unit_api] Dynamic test user registered: ${TEST_EMAIL}`);
      } else {
        console.log(`  [03_unit_api] Failed to register dynamic test user (status: ${res.status})`);
      }
    } catch (err) {
      console.warn('  ⚠️ [03_unit_api] Error registering dynamic test user:', err.message);
    }
  }

  const CAT = 'Unit/API';
  const results = [];

  results.push(await runTest('U-01', CAT, 'Health check — backend API is alive', U01_healthCheck));
  results.push(await runTest('U-02', CAT, 'Register endpoint returns JWT token', U02_registerEndpointReturnsToken));
  results.push(await runTest('U-03', CAT, 'Login endpoint returns JWT token', U03_loginEndpointReturnsToken));
  results.push(await runTest('U-04', CAT, 'Login wrong password returns 401/400', U04_loginWrongPasswordReturns401));
  results.push(await runTest('U-05', CAT, 'Profile endpoint requires authentication', U05_profileEndpointRequiresAuth));
  results.push(await runTest('U-06', CAT, 'NGO requirements endpoint responds (public)', U06_ngoRequirementsEndpointResponds));
  results.push(await runTest('U-07', CAT, 'Nearby NGOs endpoint responds', U07_nearbyNgosEndpointResponds));

  return results;
}

module.exports = { runUnitApiTests };
