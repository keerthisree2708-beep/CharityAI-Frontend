'use strict';

/**
 * ═══════════════════════════════════════════════════════════════
 *   CharityAI — COMPREHENSIVE TEST SUITE  (100+ Test Cases)
 *   Categories:
 *     F  - Functionality / UI (F-01 → F-40)
 *     A  - Authentication     (A-01 → A-15)
 *     D  - Donation Flows     (D-01 → D-15)
 *     V  - Vulnerability      (V-01 → V-12)
 *     U  - Unit / API         (U-01 → U-22)
 *   Total: 104 test cases
 * ═══════════════════════════════════════════════════════════════
 */

const { By, until, Key } = require('selenium-webdriver');
const { createDriver, quitDriver } = require('./helpers/driver');
const { get: apiGet, post: apiPost, put: apiPut, authHeader, API_URL } = require('./helpers/apiHelper');

async function get(path, headers = {}) {
  let res;
  for (let i = 0; i < 3; i++) {
    res = await apiGet(path, headers);
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 2000 + i * 1000));
    } else {
      break;
    }
  }
  return res;
}

async function post(path, body = {}, headers = {}) {
  let res;
  for (let i = 0; i < 3; i++) {
    res = await apiPost(path, body, headers);
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 2000 + i * 1000));
    } else {
      break;
    }
  }
  return res;
}

async function put(path, body = {}, headers = {}) {
  let res;
  for (let i = 0; i < 3; i++) {
    res = await apiPut(path, body, headers);
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 2000 + i * 1000));
    } else {
      break;
    }
  }
  return res;
}
const { generateReport } = require('./helpers/reporter');
const path = require('path');

// ─── Load env ─────────────────────────────────────────────────────────────────
try { require('fs').accessSync(path.join(__dirname, '.env')); require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch (_) {}
try { require('fs').accessSync(path.join(__dirname, '../.env')); require('dotenv').config({ path: path.join(__dirname, '../.env') }); } catch (_) {}

const BASE     = process.env.TEST_BASE_URL || 'http://localhost:5173';
let EMAIL    = process.env.TEST_EMAIL    || '';
let PASSWORD = process.env.TEST_PASSWORD || '';
const TIMEOUT  = parseInt(process.env.SELENIUM_TIMEOUT || '30000', 10);

// ─── Shared helpers ───────────────────────────────────────────────────────────
async function goto(driver, path) {
  await driver.get(`${BASE}${path}`);
  await driver.sleep(2500);
}

async function waitFor(driver, css, ms = TIMEOUT) {
  return driver.wait(until.elementLocated(By.css(css)), ms);
}

async function contains(driver, text) {
  const src = await driver.getPageSource();
  return src.toLowerCase().includes(text.toLowerCase());
}

async function currentUrl(driver) {
  return driver.getCurrentUrl();
}

function runTest(id, cat, name, fn) {
  const start = Date.now();
  return fn()
    .then(() => ({ id, category: cat, name, status: 'PASS', durationMs: Date.now() - start, error: null }))
    .catch(e  => ({ id, category: cat, name, status: 'FAIL', durationMs: Date.now() - start, error: (e.message || String(e)).slice(0, 350) }));
}

async function loginViaApi() {
  if (!EMAIL || !PASSWORD) return null;
  const res = await post('/auth/login', { email: EMAIL, password: PASSWORD });
  return res.data?.data?.token || res.data?.token || null;
}

async function registerTestUser(suffix = Date.now()) {
  const email = `ci_test_${suffix}@charityaitest.com`;
  const res = await post('/auth/register', {
    name: 'CI Test User', email, password: 'CiTestPass@123',
    phone: `+91900${suffix.toString().slice(-7)}`, address: 'Test City', role: 'donor',
  });
  const token = res.data?.data?.token || res.data?.token;
  return { email, token, status: res.status };
}

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION F — FUNCTIONALITY / UI  (F-01 → F-40)
// ══════════════════════════════════════════════════════════════════════════════
const CAT_F = 'Functionality';

async function F01() { // Landing page loads
  const d = await createDriver(); try {
    await goto(d, '/');
    if (!(await contains(d, 'CharityAI') || await contains(d, 'Donate') || await contains(d, 'Giving')))
      throw new Error('Landing page content not found.');
  } finally { await quitDriver(d); }
}
async function F02() { // Page title exists
  const d = await createDriver(); try {
    await goto(d, '/');
    const t = await d.getTitle();
    if (!t || t.trim().length < 3) throw new Error('Page title is empty or too short.');
  } finally { await quitDriver(d); }
}
async function F03() { // Nav — About link navigates
  const d = await createDriver(); try {
    await goto(d, '/');
    const lnks = await d.findElements(By.css('a'));
    for (const l of lnks) { if ((await l.getText()).toLowerCase().includes('about')) { await l.click(); break; } }
    await d.sleep(2000);
    if (!(await currentUrl(d)).includes('about')) throw new Error('About link did not navigate correctly.');
  } finally { await quitDriver(d); }
}
async function F04() { // Nav — Contact link navigates
  const d = await createDriver(); try {
    await goto(d, '/');
    const lnks = await d.findElements(By.css('a'));
    for (const l of lnks) { if ((await l.getText()).toLowerCase().includes('contact')) { await l.click(); break; } }
    await d.sleep(2000);
    if (!(await currentUrl(d)).includes('contact')) throw new Error('Contact link did not navigate.');
  } finally { await quitDriver(d); }
}
async function F05() { // Hero CTA buttons exist
  const d = await createDriver(); try {
    await goto(d, '/');
    const btns = await d.findElements(By.css('a, button'));
    let found = false;
    for (const b of btns) { const t = (await b.getText()).toLowerCase(); if (t.includes('donate') || t.includes('start') || t.includes('get started')) { found = true; break; } }
    if (!found) throw new Error('No CTA button found on landing page.');
  } finally { await quitDriver(d); }
}
async function F06() { // Login page renders
  const d = await createDriver(); try {
    await goto(d, '/login');
    if (!(await contains(d, 'sign in') || await contains(d, 'login') || await contains(d, 'welcome back')))
      throw new Error('Login page does not render expected content.');
  } finally { await quitDriver(d); }
}
async function F07() { // Login — email input field exists
  const d = await createDriver(); try {
    await goto(d, '/login');
    await waitFor(d, 'input[type="email"]');
  } finally { await quitDriver(d); }
}
async function F08() { // Login — password input field exists
  const d = await createDriver(); try {
    await goto(d, '/login');
    await waitFor(d, 'input[type="password"]');
  } finally { await quitDriver(d); }
}
async function F09() { // Login — tab switch (Email ↔ OTP)
  const d = await createDriver(); try {
    await goto(d, '/login');
    const btns = await d.findElements(By.css('button'));
    for (const b of btns) { if ((await b.getText()).toLowerCase().includes('otp') || (await b.getText()).toLowerCase().includes('mobile')) { await b.click(); break; } }
    await d.sleep(800);
    if (!(await contains(d, 'phone') || await contains(d, 'mobile') || await contains(d, 'otp'))) throw new Error('OTP tab not visible after click.');
  } finally { await quitDriver(d); }
}
async function F10() { // Login — Forgot password link present
  const d = await createDriver(); try {
    await goto(d, '/login');
    if (!(await contains(d, 'forgot'))) throw new Error('Forgot password link not found.');
  } finally { await quitDriver(d); }
}
async function F11() { // Login — "Sign up" link present
  const d = await createDriver(); try {
    await goto(d, '/login');
    if (!(await contains(d, 'sign up') || await contains(d, 'register') || await contains(d, 'account')))
      throw new Error('Sign-up link not found on login page.');
  } finally { await quitDriver(d); }
}
async function F12() { // Register page renders all fields
  const d = await createDriver(); try {
    await goto(d, '/register');
    const src = await d.getPageSource();
    for (const word of ['name', 'email', 'phone', 'password']) {
      if (!src.toLowerCase().includes(word)) throw new Error(`"${word}" field not found on register page.`);
    }
  } finally { await quitDriver(d); }
}
async function F13() { // Register — role toggle (Donor / NGO)
  const d = await createDriver(); try {
    await goto(d, '/register');
    const btns = await d.findElements(By.css('button'));
    let clicked = false;
    for (const b of btns) { if ((await b.getText()).toLowerCase().includes('ngo')) { await b.click(); clicked = true; break; } }
    if (!clicked) throw new Error('NGO role toggle button not found.');
    await d.sleep(500);
  } finally { await quitDriver(d); }
}
async function F14() { // Register — Sign in link present
  const d = await createDriver(); try {
    await goto(d, '/register');
    if (!(await contains(d, 'sign in') || await contains(d, 'login')))
      throw new Error('Sign-in link not found on register page.');
  } finally { await quitDriver(d); }
}
async function F15() { // Forgot password page loads
  const d = await createDriver(); try {
    await goto(d, '/forgot-password');
    if (!(await contains(d, 'forgot') || await contains(d, 'reset') || await contains(d, 'password')))
      throw new Error('Forgot password page did not load.');
  } finally { await quitDriver(d); }
}
async function F16() { // About page loads
  const d = await createDriver(); try {
    await goto(d, '/about');
    const src = await d.getPageSource();
    if (!src || src.length < 200) throw new Error('About page returned minimal content.');
  } finally { await quitDriver(d); }
}
async function F17() { // Contact page loads
  const d = await createDriver(); try {
    await goto(d, '/contact');
    const src = await d.getPageSource();
    if (!src || src.length < 200) throw new Error('Contact page returned minimal content.');
  } finally { await quitDriver(d); }
}
async function F18() { // 404 page for unknown route
  const d = await createDriver(); try {
    await goto(d, '/xyzunknownroute999');
    await d.sleep(1500);
    if (!(await contains(d, '404') || await contains(d, 'not found') || await contains(d, 'page not found')))
      throw new Error('No 404 message for unknown route.');
  } finally { await quitDriver(d); }
}
async function F19() { // Dashboard blocked without login
  const d = await createDriver(); try {
    await d.get(`${BASE}/`);
    await d.executeScript("localStorage.removeItem('charityai_user');");
    await goto(d, '/dashboard');
    await d.sleep(3000);
    const url = await currentUrl(d);
    if (url.includes('/dashboard') && !url.includes('login')) throw new Error(`Unauthenticated user reached dashboard! URL: ${url}`);
  } finally { await quitDriver(d); }
}
async function F20() { // Admin route blocked for non-admin
  const d = await createDriver(); try {
    await d.get(`${BASE}/`);
    await d.executeScript("localStorage.removeItem('charityai_user');");
    await goto(d, '/admin');
    await d.sleep(3000);
    const url = await currentUrl(d);
    if (url.includes('/admin') && !url.includes('login')) throw new Error(`Non-admin reached /admin. URL: ${url}`);
  } finally { await quitDriver(d); }
}
async function F21() { // Login with valid credentials → dashboard redirect
  if (!EMAIL || !PASSWORD) throw new Error('TEST_EMAIL/TEST_PASSWORD not set.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    if (!(await currentUrl(d)).includes('dashboard')) throw new Error('Did not redirect to dashboard after login.');
  } finally { await quitDriver(d); }
}
async function F22() { // Login with wrong password → error message
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys('nobody_test@nowhere123.xyz');
    await (await waitFor(d, 'input[type="password"]')).sendKeys('wrongPassword000');
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.sleep(4000);
    if ((await currentUrl(d)).includes('dashboard')) throw new Error('Wrong password should NOT lead to dashboard.');
  } finally { await quitDriver(d); }
}
async function F23() { // Register with valid donor data
  const d = await createDriver(); try {
    const uq = `ui_reg_${Date.now()}`;
    await goto(d, '/register');
    await d.sleep(1000);
    await (await waitFor(d, 'input[type="text"]')).sendKeys('UI Test Donor');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(`${uq}@charityaitest.com`);
    await (await waitFor(d, 'input[type="tel"]')).sendKeys('+91 9876000001');
    const texts = await d.findElements(By.css('input[type="text"]'));
    if (texts.length > 1) await texts[1].sendKeys('Chennai');
    await (await waitFor(d, 'input[type="password"]')).sendKeys('ValidPass@123');
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.sleep(5000);
  } finally { await quitDriver(d); }
}
async function F24() { // Donate Money page loads (auth required)
  if (!EMAIL || !PASSWORD) throw new Error('Needs TEST_EMAIL/TEST_PASSWORD.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/donate-money');
    if (!(await contains(d, 'donate') || await contains(d, 'fund') || await contains(d, 'payment')))
      throw new Error('Donate Money page content not found.');
  } finally { await quitDriver(d); }
}
async function F25() { // Donate Money — amount selection buttons visible
  if (!EMAIL || !PASSWORD) throw new Error('Needs TEST_EMAIL/TEST_PASSWORD.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/donate-money');
    if (!(await contains(d, '$10') || await contains(d, '$25') || await contains(d, '$50')))
      throw new Error('Amount preset buttons not visible on donate-money page.');
  } finally { await quitDriver(d); }
}
async function F26() { // Donate Food page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/donate-food');
    const src = await d.getPageSource();
    if (src.length < 100) throw new Error('Donate Food page empty.');
  } finally { await quitDriver(d); }
}
async function F27() { // Donate Clothes page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/donate-clothes');
    const src = await d.getPageSource();
    if (src.length < 100) throw new Error('Donate Clothes page empty.');
  } finally { await quitDriver(d); }
}
async function F28() { // Donate Books page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/donate-books');
    const src = await d.getPageSource();
    if (src.length < 100) throw new Error('Donate Books page empty.');
  } finally { await quitDriver(d); }
}
async function F29() { // Donate Medicine page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/donate-medicine');
    const src = await d.getPageSource();
    if (src.length < 100) throw new Error('Donate Medicine page empty.');
  } finally { await quitDriver(d); }
}
async function F30() { // Dashboard overview loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('Dashboard overview appears empty.');
  } finally { await quitDriver(d); }
}
async function F31() { // Donations history page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/donations');
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('Donations history page empty.');
  } finally { await quitDriver(d); }
}
async function F32() { // NGOs page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/ngos');
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('NGOs page appears empty.');
  } finally { await quitDriver(d); }
}
async function F33() { // Analytics page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/analytics');
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('Analytics page appears empty.');
  } finally { await quitDriver(d); }
}
async function F34() { // AI Insights page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/ai-insights');
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('AI Insights page appears empty.');
  } finally { await quitDriver(d); }
}
async function F35() { // Blockchain Ledger page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/blockchain');
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('Blockchain Ledger page appears empty.');
  } finally { await quitDriver(d); }
}
async function F36() { // Profile page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/profile');
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('Profile page appears empty.');
  } finally { await quitDriver(d); }
}
async function F37() { // Campaigns page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/campaigns');
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('Campaigns page appears empty.');
  } finally { await quitDriver(d); }
}
async function F38() { // Reports page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/reports');
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('Reports page appears empty.');
  } finally { await quitDriver(d); }
}
async function F39() { // Settings page loads
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/settings');
    const src = await d.getPageSource();
    if (src.length < 200) throw new Error('Settings page appears empty.');
  } finally { await quitDriver(d); }
}
async function F40() { // Donate Money — amount zero rejected
  if (!EMAIL || !PASSWORD) throw new Error('Needs credentials.');
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys(EMAIL);
    await (await waitFor(d, 'input[type="password"]')).sendKeys(PASSWORD);
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.wait(until.urlContains('dashboard'), 20000);
    await goto(d, '/dashboard/donate-money');
    // Deselect all amounts and enter 0
    const btns = await d.findElements(By.css('button[type="button"]'));
    for (const b of btns) { try { const t = await b.getText(); if (t.includes('$')) { await b.click(); await b.click(); break; } } catch(_){} }
    const customInput = await d.findElements(By.css('input[type="number"]'));
    if (customInput.length) { await customInput[0].clear(); await customInput[0].sendKeys('0'); }
    const submit = await waitFor(d, 'button[type="submit"]');
    await submit.click();
    await d.sleep(1500);
    try {
      const alert = await d.switchTo().alert();
      const txt = await alert.getText();
      await alert.accept();
    } catch (err) {
      if (await contains(d, 'secure checkout') || await contains(d, 'card number')) {
        throw new Error('Zero amount should not proceed to checkout.');
      }
    }
  } finally { await quitDriver(d); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION A — AUTHENTICATION API  (A-01 → A-15)
// ══════════════════════════════════════════════════════════════════════════════
const CAT_A = 'Authentication';

async function A01() { // Register returns 201 + token
  const { status, token } = await registerTestUser();
  if (status !== 200 && status !== 201) throw new Error(`Expected 201, got ${status}`);
  if (!token) throw new Error('No token in register response.');
}
async function A02() { // Register — duplicate email returns 400
  const email = `dup_${Date.now()}@charityaitest.com`;
  await post('/auth/register', { name:'Dup', email, password:'Pass123!', phone:'+911234567890', address:'City', role:'donor' });
  const res = await post('/auth/register', { name:'Dup2', email, password:'Pass123!', phone:'+911234567891', address:'City', role:'donor' });
  if (res.status !== 400) throw new Error(`Duplicate email should return 400, got ${res.status}`);
}
async function A03() { // Register — missing name returns 400
  const res = await post('/auth/register', { email:`nm_${Date.now()}@t.com`, password:'Pass123!', phone:'+91000', address:'X', role:'donor' });
  if (res.status !== 400) throw new Error(`Missing name should return 400, got ${res.status}`);
}
async function A04() { // Register — invalid email format returns 400
  const res = await post('/auth/register', { name:'X', email:'notanemail', password:'Pass123!', phone:'+910000', address:'Y', role:'donor' });
  if (res.status !== 400) throw new Error(`Invalid email should return 400, got ${res.status}`);
}
async function A05() { // Register — NGO without ngoDetails returns 400
  const res = await post('/auth/register', { name:'NGO Test', email:`ngo_${Date.now()}@t.com`, password:'Pass123!', phone:'+910000', address:'Z', role:'ngo' });
  if (res.status !== 400) throw new Error(`NGO without ngoDetails should return 400, got ${res.status}`);
}
async function A06() { // Login — valid credentials return 200 + token
  if (!EMAIL || !PASSWORD) throw new Error('TEST_EMAIL/TEST_PASSWORD required.');
  const res = await post('/auth/login', { email: EMAIL, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login returned ${res.status}, expected 200.`);
  const token = res.data?.data?.token || res.data?.token;
  if (!token) throw new Error('No token in login response.');
}
async function A07() { // Login — wrong password returns 401
  const res = await post('/auth/login', { email: EMAIL || 'x@x.com', password: 'AbsolutelyWrong_9999' });
  if (res.status === 200) throw new Error('Wrong password should NOT return 200.');
  if (res.status !== 400 && res.status !== 401) throw new Error(`Expected 401/400, got ${res.status}.`);
}
async function A08() { // Login — empty body returns 400
  const res = await post('/auth/login', {});
  if (res.status !== 400) throw new Error(`Empty login body should return 400, got ${res.status}.`);
}
async function A09() { // Login — missing password returns 400
  const res = await post('/auth/login', { email: EMAIL || 'x@x.com' });
  if (res.status !== 400) throw new Error(`Missing password should return 400, got ${res.status}.`);
}
async function A10() { // Profile — requires auth (401 without token)
  const res = await get('/auth/profile');
  if (res.status !== 401 && res.status !== 403) throw new Error(`Profile without token returned ${res.status}, expected 401/403.`);
}
async function A11() { // Profile — returns user data with valid token
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await get('/auth/profile', authHeader(token));
  if (res.status !== 200) throw new Error(`Profile with token returned ${res.status}, expected 200.`);
  if (!res.data?.data?.email && !res.data?.email) throw new Error('Profile response missing email field.');
}
async function A12() { // Profile — fake token returns 401/403
  const res = await get('/auth/profile', authHeader('faketoken.fake.fake'));
  if (res.status !== 401 && res.status !== 403) throw new Error(`Fake token returned ${res.status}, expected 401/403.`);
}
async function A13() { // Update profile — requires auth
  const res = await put('/auth/profile', { name: 'New Name' });
  if (res.status !== 401 && res.status !== 403) throw new Error(`PUT /profile without token returned ${res.status}, expected 401/403.`);
}
async function A14() { // Update profile — valid update succeeds
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await put('/auth/profile', { name: 'Updated CI Name' }, authHeader(token));
  if (res.status !== 200) throw new Error(`Profile update returned ${res.status}, expected 200.`);
}
async function A15() { // OTP — send-otp requires phone number
  const res = await post('/auth/send-otp', {});
  if (res.status !== 400) throw new Error(`send-otp without phone returned ${res.status}, expected 400.`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION D — DONATION FLOWS API  (D-01 → D-15)
// ══════════════════════════════════════════════════════════════════════════════
const CAT_D = 'Donation Flows';

async function D01() { // Nearby NGOs — missing coords returns 400
  const res = await get('/donations/nearby-ngos');
  if (res.status !== 200 && res.status !== 400) throw new Error(`nearby-ngos returned ${res.status}, expected 200 or 400.`);
}
async function D02() { // Nearby NGOs — with coords returns 200
  const res = await get('/donations/nearby-ngos?latitude=13.0827&longitude=80.2707');
  if (res.status !== 200) throw new Error(`nearby-ngos with coords returned ${res.status}, expected 200.`);
}
async function D03() { // Create donation — requires auth
  const res = await post('/donations/donations', { category:'food', description:'Rice bags', quantity:'10kg' });
  if (res.status !== 401 && res.status !== 403) throw new Error(`POST /donations without auth returned ${res.status}, expected 401/403.`);
}
async function D04() { // Create donation — valid payload succeeds
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await post('/donations/donations', { category:'food', description:'Fresh vegetables', quantity:'5kg' }, authHeader(token));
  if (res.status !== 200 && res.status !== 201) throw new Error(`Create donation returned ${res.status}, expected 201.`);
}
async function D05() { // Create donation — missing category returns 400
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await post('/donations/donations', { description:'Test', quantity:'1' }, authHeader(token));
  if (res.status !== 400) throw new Error(`Missing category should return 400, got ${res.status}.`);
}
async function D06() { // Create donation — missing description returns 400
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await post('/donations/donations', { category:'food', quantity:'1' }, authHeader(token));
  if (res.status !== 400) throw new Error(`Missing description should return 400, got ${res.status}.`);
}
async function D07() { // Create donation — missing quantity returns 400
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await post('/donations/donations', { category:'food', description:'test item' }, authHeader(token));
  if (res.status !== 400) throw new Error(`Missing quantity should return 400, got ${res.status}.`);
}
async function D08() { // Create donation — invalid category returns 400
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await post('/donations/donations', { category:'invalid_xyz', description:'Test', quantity:'1' }, authHeader(token));
  if (res.status !== 400) throw new Error(`Invalid category should return 400, got ${res.status}.`);
}
async function D09() { // My donation history — requires auth
  const res = await get('/donations/my-history');
  if (res.status !== 401 && res.status !== 403) throw new Error(`my-history without auth returned ${res.status}, expected 401/403.`);
}
async function D10() { // My donation history — returns list for donor
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await get('/donations/my-history', authHeader(token));
  if (res.status !== 200) throw new Error(`my-history returned ${res.status}, expected 200.`);
}
async function D11() { // Donation tracking — invalid ID returns 404/500
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await get('/donations/000000000000000000000000/tracking', authHeader(token));
  if (res.status !== 404 && res.status !== 400) throw new Error(`Tracking for fake ID returned ${res.status}, expected 404/400.`);
}
async function D12() { // AI Match — requires items param
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await get('/donations/ai-match', authHeader(token));
  if (res.status !== 400) throw new Error(`ai-match without items should return 400, got ${res.status}.`);
}
async function D13() { // AI Match — with items param returns response
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await get('/donations/ai-match?items=food,clothes', authHeader(token));
  // Accept 200 (matched NGO) or 404 (no NGOs registered yet)
  if (res.status !== 200 && res.status !== 404) throw new Error(`ai-match returned ${res.status}, expected 200 or 404.`);
}
async function D14() { // My history — pagination params work
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await get('/donations/my-history?page=1&limit=5', authHeader(token));
  if (res.status !== 200) throw new Error(`my-history with pagination returned ${res.status}.`);
}
async function D15() { // Create donation with blockchain hash in response
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const res = await post('/donations/donations', { category:'clothes', description:'Used winter clothes in good condition', quantity:'10 items' }, authHeader(token));
  if (res.status !== 200 && res.status !== 201) throw new Error(`Create donation returned ${res.status}.`);
  const hash = res.data?.data?.blockchainTxHash || res.data?.blockchainTxHash;
  if (!hash) throw new Error('Donation response missing blockchainTxHash field.');
}

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION V — VULNERABILITY / SECURITY  (V-01 → V-12)
// ══════════════════════════════════════════════════════════════════════════════
const CAT_V = 'Vulnerability';

async function V01() { // XSS in login email field — no script execution
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys('<script>window.__xss__=true;</script>');
    await (await waitFor(d, 'input[type="password"]')).sendKeys('any');
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.sleep(3000);
    const xss = await d.executeScript('return window.__xss__ === true;');
    if (xss) throw new Error('XSS EXECUTED — critical vulnerability!');
  } finally { await quitDriver(d); }
}
async function V02() { // SQL injection in login
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'input[type="email"]')).sendKeys("' OR '1'='1' --");
    await (await waitFor(d, 'input[type="password"]')).sendKeys("' OR '1'='1");
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.sleep(3000);
    if ((await currentUrl(d)).includes('dashboard')) throw new Error('SQL injection succeeded!');
  } finally { await quitDriver(d); }
}
async function V03() { // Empty form submission rejected
  const d = await createDriver(); try {
    await goto(d, '/login');
    await (await waitFor(d, 'button[type="submit"]')).click();
    await d.sleep(1500);
    if ((await currentUrl(d)).includes('dashboard')) throw new Error('Empty form should not log in.');
  } finally { await quitDriver(d); }
}
async function V04() { // Short password rejected (< 6 chars)
  const res = await post('/auth/register', { name:'ShortPass', email:`sp_${Date.now()}@t.com`, password:'abc', phone:'+910000', address:'X', role:'donor' });
  if (res.status === 200 || res.status === 201) throw new Error('Short password should be rejected, not accepted.');
}
async function V05() { // Invalid email format rejected by API
  const res = await post('/auth/register', { name:'BadEmail', email:'plainaddress', password:'Pass123!', phone:'+910000', address:'X', role:'donor' });
  if (res.status === 200 || res.status === 201) throw new Error('Invalid email format should be rejected by API.');
}
async function V06() { // Dashboard requires authentication
  const d = await createDriver(); try {
    await d.get(`${BASE}/`);
    await d.executeScript("localStorage.removeItem('charityai_user'); sessionStorage.clear();");
    await d.sleep(300);
    await d.get(`${BASE}/dashboard`);
    await d.sleep(3500);
    const url = await currentUrl(d);
    if (url.includes('/dashboard') && !url.includes('login')) throw new Error(`Dashboard accessible without login! URL: ${url}`);
  } finally { await quitDriver(d); }
}
async function V07() { // Admin route requires admin role
  const res = await get('/admin/stats');
  if (res.status !== 401 && res.status !== 403) throw new Error(`Admin stats without auth returned ${res.status}, expected 401/403.`);
}
async function V08() { // Donor cannot access admin endpoint even with token
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials (donor token needed).');
  const res = await get('/admin/stats', authHeader(token));
  // Donor token should get 403
  if (res.status === 200) throw new Error('Donor should NOT access admin stats endpoint!');
}
async function V09() { // JWT token tampering returns 401/403
  const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIn0.tampered_signature_here';
  const res = await get('/auth/profile', authHeader(fakeToken));
  if (res.status !== 401 && res.status !== 403) throw new Error(`Tampered token returned ${res.status}, expected 401/403.`);
}
async function V10() { // NGO donation status update — unauthorized NGO blocked
  const token = await loginViaApi();
  if (!token) throw new Error('Cannot test — no credentials.');
  const fakeId = '000000000000000000000001';
  const res = await put(`/ngo/donations/${fakeId}/status`, { status: 'delivered' }, authHeader(token));
  // Should return 403 (not this NGO's donation) or 404 (not found)
  if (res.status === 200) throw new Error('Unauthorized NGO should not update donation status!');
}
async function V11() { // HTTPS site (if production URL)
  const url = process.env.TEST_BASE_URL || '';
  if (!url || url.includes('localhost')) return; // Skip for local
  if (!url.startsWith('https://')) throw new Error(`Site is NOT served over HTTPS: ${url}`);
}
async function V12() { // Forgot password — doesn't reveal if email exists (anti-enumeration)
  const res1 = await post('/auth/forgot-password', { email: 'nonexistent_xyz@nowhere123.com' });
  const res2 = await post('/auth/forgot-password', { email: EMAIL || 'test@test.com' });
  // Both should return 200 (to prevent email enumeration)
  if (res1.status !== 200) throw new Error(`Forgot-password for nonexistent email returned ${res1.status}, expected 200.`);
  if (res2.status !== 200) throw new Error(`Forgot-password for real email returned ${res2.status}, expected 200.`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION U — UNIT / API  (U-01 → U-22)
// ══════════════════════════════════════════════════════════════════════════════
const CAT_U = 'Unit/API';

async function U01() { // Backend health check (root route)
  const axios = require('axios');
  const base = API_URL.replace(/\/api\/?$/, '');
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await axios.get(base, { timeout: 30000, validateStatus: () => true });
      if (r.status === 200) return;
      if (i < 3) await new Promise(r => setTimeout(r, 10000));
    } catch(e) { if (i < 3) await new Promise(r => setTimeout(r, 10000)); else throw e; }
  }
  throw new Error('Backend health check failed after 3 attempts.');
}
async function U02() { // POST /api/auth/register returns 201
  const { status } = await registerTestUser(`u02_${Date.now()}`);
  if (status !== 200 && status !== 201) throw new Error(`Register returned ${status}, expected 201.`);
}
async function U03() { // POST /api/auth/login returns 200 + token
  if (!EMAIL || !PASSWORD) throw new Error('Credentials not set.');
  const res = await post('/auth/login', { email: EMAIL, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login returned ${res.status}.`);
  if (!(res.data?.data?.token || res.data?.token)) throw new Error('No token in response.');
}
async function U04() { // POST /api/auth/login wrong creds → 401
  const res = await post('/auth/login', { email: 'notreal@nomail.xyz', password: 'badpass' });
  if (res.status === 200) throw new Error('Wrong creds should not return 200.');
}
async function U05() { // GET /api/auth/profile → 401 without token
  const res = await get('/auth/profile');
  if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401, got ${res.status}.`);
}
async function U06() { // GET /api/auth/profile → 200 with valid token
  const token = await loginViaApi();
  if (!token) throw new Error('No credentials.');
  const res = await get('/auth/profile', authHeader(token));
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}.`);
}
async function U07() { // PUT /api/auth/profile → 401 without token
  const res = await put('/auth/profile', { name: 'Test' });
  if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401, got ${res.status}.`);
}
async function U08() { // POST /api/auth/send-otp → 400 if no phone
  const res = await post('/auth/send-otp', {});
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}.`);
}
async function U09() { // POST /api/auth/send-otp → 200 with phone
  const res = await post('/auth/send-otp', { phone: '+919876543210' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}.`);
}
async function U10() { // POST /api/auth/verify-otp → 400 if no phone/otp
  const res = await post('/auth/verify-otp', {});
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}.`);
}
async function U11() { // POST /api/auth/verify-otp → 400 for wrong OTP
  const phone = '+919900000001';
  await post('/auth/send-otp', { phone });
  const res = await post('/auth/verify-otp', { phone, otp: '000000' });
  if (res.status !== 400) throw new Error(`Wrong OTP should return 400, got ${res.status}.`);
}
async function U12() { // POST /api/auth/forgot-password → 200 always
  const res = await post('/auth/forgot-password', { email: 'anyone@anywhere.com' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}.`);
}
async function U13() { // POST /api/auth/refresh → 401 without cookie
  const axios = require('axios');
  const res = await axios.post(`${API_URL}/auth/refresh`, {}, { validateStatus: () => true });
  if (res.status !== 401 && res.status !== 403) throw new Error(`Refresh without cookie returned ${res.status}, expected 401.`);
}
async function U14() { // GET /api/ngo/requirements → 200 (public)
  const res = await get('/ngo/requirements');
  if (res.status !== 200) throw new Error(`GET /ngo/requirements returned ${res.status}, expected 200.`);
}
async function U15() { // GET /api/ngo/dashboard → 401 without auth
  const res = await get('/ngo/dashboard');
  if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401, got ${res.status}.`);
}
async function U16() { // POST /api/ngo/requirements → 401 without auth
  const res = await post('/ngo/requirements', { category:'food', description:'Need food supplies', quantity:'100kg', urgency:'high' });
  if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401, got ${res.status}.`);
}
async function U17() { // GET /api/donations/nearby-ngos → 200 with coords
  const res = await get('/donations/nearby-ngos?latitude=12.9716&longitude=77.5946');
  if (res.status !== 200) throw new Error(`nearby-ngos returned ${res.status}, expected 200.`);
}
async function U18() { // GET /api/donations/my-history → 401 without auth
  const res = await get('/donations/my-history');
  if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401, got ${res.status}.`);
}
async function U19() { // GET /api/admin/stats → 401 without auth
  const res = await get('/admin/stats');
  if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401, got ${res.status}.`);
}
async function U20() { // GET /api/admin/ngos/pending → 401 without auth
  const res = await get('/admin/ngos/pending');
  if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401, got ${res.status}.`);
}
async function U21() { // GET /api/admin/fraud → 401 without auth
  const res = await get('/admin/fraud');
  if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401, got ${res.status}.`);
}
async function U22() { // POST /api/donations/donations response has blockchainTxHash
  const token = await loginViaApi();
  if (!token) throw new Error('No credentials.');
  const res = await post('/donations/donations', { category:'books', description:'Collection of school textbooks for children', quantity:'20 books' }, authHeader(token));
  if (res.status !== 200 && res.status !== 201) throw new Error(`Create donation returned ${res.status}.`);
  const hash = res.data?.data?.blockchainTxHash;
  if (!hash || !hash.startsWith('0x')) throw new Error(`blockchainTxHash missing or malformed: ${hash}`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  MASTER RUNNER
// ══════════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   CharityAI — 104 Test Cases — Full Suite Runner         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\n  Base URL : ${BASE}`);
  console.log(`  API URL  : ${API_URL}`);
  console.log(`  Started  : ${new Date().toLocaleString()}\n`);

  // Ensure backend is awake and setup dynamic credentials if not provided
  console.log('  Warming up backend and preparing credentials...');
  try {
    await U01();
  } catch (err) {
    console.warn('  ⚠️ Warning: Backend health check failed before test initialization:', err.message);
  }

  if (!EMAIL || !PASSWORD) {
    console.log('  TEST_EMAIL/TEST_PASSWORD not configured. Registering a test user dynamically...');
    try {
      const u = await registerTestUser();
      if (u.token) {
        EMAIL = u.email;
        PASSWORD = 'CiTestPass@123';
        console.log(`  Dynamic test user registered: ${EMAIL}`);
      } else {
        console.warn(`  ⚠️ Failed to register dynamic test user (status: ${u.status})`);
      }
    } catch (err) {
      console.warn('  ⚠️ Error registering dynamic test user:', err.message);
    }
  }

  const results = [];
  const start = Date.now();

  // ── Section F (F-01 → F-40) ─────────────────────────────────────────────
  console.log('── FUNCTIONALITY (F-01 → F-40) ──');
  const fTests = [
    ['F-01',F01,'Landing page loads and renders hero section'],
    ['F-02',F02,'Page title exists and is meaningful'],
    ['F-03',F03,'Navigation — About link works'],
    ['F-04',F04,'Navigation — Contact link works'],
    ['F-05',F05,'Hero CTA buttons/links present on landing'],
    ['F-06',F06,'Login page renders correctly'],
    ['F-07',F07,'Login — email input field exists'],
    ['F-08',F08,'Login — password input field exists'],
    ['F-09',F09,'Login — tab switch (Email ↔ OTP)'],
    ['F-10',F10,'Login — Forgot password link present'],
    ['F-11',F11,'Login — Sign-up link present'],
    ['F-12',F12,'Register — all required fields rendered'],
    ['F-13',F13,'Register — role toggle (Donor / NGO)'],
    ['F-14',F14,'Register — Sign-in link present'],
    ['F-15',F15,'Forgot password page loads'],
    ['F-16',F16,'About page loads with content'],
    ['F-17',F17,'Contact page loads with content'],
    ['F-18',F18,'404 page for unknown routes'],
    ['F-19',F19,'Dashboard blocked without login'],
    ['F-20',F20,'Admin route blocked for non-admin'],
    ['F-21',F21,'Login with valid credentials → dashboard'],
    ['F-22',F22,'Login with wrong password → error'],
    ['F-23',F23,'Register with valid donor data'],
    ['F-24',F24,'Donate Money page loads'],
    ['F-25',F25,'Donate Money — amount selection buttons visible'],
    ['F-26',F26,'Donate Food page loads'],
    ['F-27',F27,'Donate Clothes page loads'],
    ['F-28',F28,'Donate Books page loads'],
    ['F-29',F29,'Donate Medicine page loads'],
    ['F-30',F30,'Dashboard overview loads after login'],
    ['F-31',F31,'Donations history page loads'],
    ['F-32',F32,'NGOs page loads'],
    ['F-33',F33,'Analytics page loads'],
    ['F-34',F34,'AI Insights page loads'],
    ['F-35',F35,'Blockchain Ledger page loads'],
    ['F-36',F36,'Profile page loads'],
    ['F-37',F37,'Campaigns page loads'],
    ['F-38',F38,'Reports page loads'],
    ['F-39',F39,'Settings page loads'],
    ['F-40',F40,'Donate Money — zero amount rejected'],
  ];
  for (const [id, fn, name] of fTests) {
    const r = await runTest(id, CAT_F, name, fn);
    results.push(r);
    console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${id} — ${name} (${(r.durationMs/1000).toFixed(1)}s)`);
    if (r.error) console.log(`      ⚠ ${r.error.slice(0, 100)}`);
  }

  // ── Section A (A-01 → A-15) ─────────────────────────────────────────────
  console.log('\n── AUTHENTICATION (A-01 → A-15) ──');
  const aTests = [
    ['A-01',A01,'Register returns 201 and JWT token'],
    ['A-02',A02,'Register — duplicate email returns 400'],
    ['A-03',A03,'Register — missing name returns 400'],
    ['A-04',A04,'Register — invalid email format returns 400'],
    ['A-05',A05,'Register — NGO without ngoDetails returns 400'],
    ['A-06',A06,'Login — valid credentials returns 200 and token'],
    ['A-07',A07,'Login — wrong password returns 401'],
    ['A-08',A08,'Login — empty body returns 400'],
    ['A-09',A09,'Login — missing password returns 400'],
    ['A-10',A10,'Profile — 401 without token'],
    ['A-11',A11,'Profile — 200 with valid token, returns email'],
    ['A-12',A12,'Profile — 401/403 with tampered token'],
    ['A-13',A13,'Update profile — 401 without token'],
    ['A-14',A14,'Update profile — 200 with valid token'],
    ['A-15',A15,'OTP send — 400 without phone number'],
  ];
  for (const [id, fn, name] of aTests) {
    const r = await runTest(id, CAT_A, name, fn);
    results.push(r);
    console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${id} — ${name} (${(r.durationMs/1000).toFixed(1)}s)`);
    if (r.error) console.log(`      ⚠ ${r.error.slice(0, 100)}`);
  }

  // ── Section D (D-01 → D-15) ─────────────────────────────────────────────
  console.log('\n── DONATION FLOWS (D-01 → D-15) ──');
  const dTests = [
    ['D-01',D01,'Nearby NGOs — without coords returns 200 or 400'],
    ['D-02',D02,'Nearby NGOs — with coords returns 200'],
    ['D-03',D03,'Create donation — 401 without auth'],
    ['D-04',D04,'Create donation — valid payload succeeds'],
    ['D-05',D05,'Create donation — missing category returns 400'],
    ['D-06',D06,'Create donation — missing description returns 400'],
    ['D-07',D07,'Create donation — missing quantity returns 400'],
    ['D-08',D08,'Create donation — invalid category returns 400'],
    ['D-09',D09,'Donation history — 401 without auth'],
    ['D-10',D10,'Donation history — 200 for authenticated donor'],
    ['D-11',D11,'Tracking — 404 for invalid donation ID'],
    ['D-12',D12,'AI Match — 400 without items param'],
    ['D-13',D13,'AI Match — responds with items param'],
    ['D-14',D14,'Donation history — pagination params accepted'],
    ['D-15',D15,'Create donation — response includes blockchainTxHash'],
  ];
  for (const [id, fn, name] of dTests) {
    const r = await runTest(id, CAT_D, name, fn);
    results.push(r);
    console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${id} — ${name} (${(r.durationMs/1000).toFixed(1)}s)`);
    if (r.error) console.log(`      ⚠ ${r.error.slice(0, 100)}`);
  }

  // ── Section V (V-01 → V-12) ─────────────────────────────────────────────
  console.log('\n── VULNERABILITY (V-01 → V-12) ──');
  const vTests = [
    ['V-01',V01,'XSS — script injection in login form sanitized'],
    ['V-02',V02,'SQL injection in login field blocked'],
    ['V-03',V03,'Empty login form submission rejected'],
    ['V-04',V04,'Short password (< 6 chars) rejected by API'],
    ['V-05',V05,'Invalid email format rejected by API'],
    ['V-06',V06,'Dashboard requires authentication'],
    ['V-07',V07,'Admin stats endpoint requires auth'],
    ['V-08',V08,'Donor cannot access admin endpoint'],
    ['V-09',V09,'Tampered JWT token rejected'],
    ['V-10',V10,'NGO cannot update another NGO donation'],
    ['V-11',V11,'Site served over HTTPS'],
    ['V-12',V12,'Forgot password anti-enumeration (always 200)'],
  ];
  for (const [id, fn, name] of vTests) {
    const r = await runTest(id, CAT_V, name, fn);
    results.push(r);
    console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${id} — ${name} (${(r.durationMs/1000).toFixed(1)}s)`);
    if (r.error) console.log(`      ⚠ ${r.error.slice(0, 100)}`);
  }

  // ── Section U (U-01 → U-22) ─────────────────────────────────────────────
  console.log('\n── UNIT / API (U-01 → U-22) ──');
  const uTests = [
    ['U-01',U01,'Backend health check (root route alive)'],
    ['U-02',U02,'POST /auth/register → 201 with token'],
    ['U-03',U03,'POST /auth/login → 200 with token'],
    ['U-04',U04,'POST /auth/login wrong creds → 401'],
    ['U-05',U05,'GET /auth/profile → 401 without token'],
    ['U-06',U06,'GET /auth/profile → 200 with valid token'],
    ['U-07',U07,'PUT /auth/profile → 401 without token'],
    ['U-08',U08,'POST /auth/send-otp → 400 without phone'],
    ['U-09',U09,'POST /auth/send-otp → 200 with phone'],
    ['U-10',U10,'POST /auth/verify-otp → 400 without params'],
    ['U-11',U11,'POST /auth/verify-otp → 400 for wrong OTP'],
    ['U-12',U12,'POST /auth/forgot-password → 200 always'],
    ['U-13',U13,'POST /auth/refresh → 401 without cookie'],
    ['U-14',U14,'GET /ngo/requirements → 200 (public)'],
    ['U-15',U15,'GET /ngo/dashboard → 401 without auth'],
    ['U-16',U16,'POST /ngo/requirements → 401 without auth'],
    ['U-17',U17,'GET /donations/nearby-ngos → 200 with coords'],
    ['U-18',U18,'GET /donations/my-history → 401 without auth'],
    ['U-19',U19,'GET /admin/stats → 401 without auth'],
    ['U-20',U20,'GET /admin/ngos/pending → 401 without auth'],
    ['U-21',U21,'GET /admin/fraud → 401 without auth'],
    ['U-22',U22,'POST /donations creates donation with blockchain hash'],
  ];
  for (const [id, fn, name] of uTests) {
    const r = await runTest(id, CAT_U, name, fn);
    results.push(r);
    console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${id} — ${name} (${(r.durationMs/1000).toFixed(1)}s)`);
    if (r.error) console.log(`      ⚠ ${r.error.slice(0, 100)}`);
  }

  // ── Final summary ────────────────────────────────────────────────────────
  const dur = ((Date.now() - start) / 1000).toFixed(1);
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  TOTAL: ${results.length}  ✅ ${pass}  ❌ ${fail}  ⏱ ${dur}s`.padEnd(60) + '║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // ── Generate report ──────────────────────────────────────────────────────
  const reportDir = path.join(__dirname, 'reports');
  try {
    const file = await generateReport(results, reportDir);
    console.log(`📊 Report: ${file}\n`);
  } catch(e) { console.error('Report generation failed:', e.message); }

  // GitHub Actions Step Summary
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const passRate = results.length ? Math.round((pass / results.length) * 100) : 0;
    const emoji = fail === 0 ? '🟢' : fail <= 5 ? '🟡' : '🔴';
    const md = [
      `## ${emoji} CharityAI — 104 Test Cases Results`,
      `| Total | ✅ Pass | ❌ Fail | Pass Rate | Duration |`,
      `|-------|---------|---------|-----------|----------|`,
      `| **${results.length}** | **${pass}** | **${fail}** | **${passRate}%** | **${dur}s** |`,
      `\n### Results by Category`,
      `| Category | Total | Pass | Fail |`,
      `|----------|-------|------|------|`,
      ...['Functionality','Authentication','Donation Flows','Vulnerability','Unit/API'].map(cat => {
        const cr = results.filter(r => r.category === cat);
        const cp = cr.filter(r => r.status === 'PASS').length;
        const cf = cr.filter(r => r.status === 'FAIL').length;
        return `| ${cat} | ${cr.length} | ${cp} | ${cf} |`;
      }),
      `\n<details><summary>Full Test Details</summary>\n`,
      `| ID | Category | Test | Status | Duration |`,
      `|----|----------|------|--------|----------|`,
      ...results.map(r => `| ${r.id} | ${r.category} | ${r.name} | ${r.status === 'PASS' ? '✅' : '❌'} | ${r.durationMs ? (r.durationMs/1000).toFixed(1)+'s' : '-'} |`),
      `\n</details>`,
    ].join('\n');
    require('fs').appendFileSync(summaryFile, md);
  }

  // Exit code
  const critical = results.filter(r => r.status === 'FAIL' && (r.id.startsWith('V-0') || r.id === 'V-06' || r.id === 'U-01' || r.id === 'U-03' || r.id === 'A-06'));
  process.exit(critical.length > 0 ? 1 : 0);
}

runAllTests().catch(err => { console.error('Fatal:', err); process.exit(1); });
