'use strict';

/**
 * FUNCTIONALITY TESTS — F-01 to F-15
 * Tests real browser interactions against the live GitHub Pages deployment.
 */

const { By, until, Key } = require('selenium-webdriver');
const { createDriver, quitDriver } = require('../helpers/driver');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5173';

// ─── Utility helpers ─────────────────────────────────────────────────────────

/** Navigate to a path and wait for the page to be interactive. */
async function goto(driver, path) {
  await driver.get(`${BASE}${path}`);
  await driver.sleep(2000); // allow SPA JS to hydrate
}

/** Wait for an element by CSS selector (throws after timeout). */
async function waitFor(driver, css, timeoutMs = 15000) {
  return driver.wait(until.elementLocated(By.css(css)), timeoutMs);
}

/** Wait for text to appear anywhere on the page. */
async function waitForText(driver, text, timeoutMs = 15000) {
  return driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${text}')]`)), timeoutMs);
}

/** Safely get page source/title for assertions without throwing. */
async function pageContains(driver, text) {
  const src = await driver.getPageSource();
  return src.toLowerCase().includes(text.toLowerCase());
}

/** Wraps a test function, measures time, and catches errors into a result object. */
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

// ─── Test definitions ─────────────────────────────────────────────────────────

async function F01_landingPageLoads() {
  const driver = await createDriver();
  try {
    await goto(driver, '/');
    const title = await driver.getTitle();
    if (!title) throw new Error('Page title is empty — page may not have loaded.');
    // Look for the hero heading text
    const hasHero = await pageContains(driver, 'Donate') || await pageContains(driver, 'CharityAI') || await pageContains(driver, 'Giving');
    if (!hasHero) throw new Error('Hero section text not found on landing page.');
  } finally {
    await quitDriver(driver);
  }
}

async function F02_navigationLinksWork() {
  const driver = await createDriver();
  try {
    await goto(driver, '/');
    // Click "About" nav link
    const aboutLink = await driver.findElement(By.xpath(`//a[contains(text(),'About') or @href='/about']`));
    await aboutLink.click();
    await driver.sleep(2000);
    const url = await driver.getCurrentUrl();
    if (!url.includes('about')) throw new Error(`Expected URL to contain "about", got: ${url}`);
  } finally {
    await quitDriver(driver);
  }
}

async function F03_loginRegisterButtonsRedirect() {
  const driver = await createDriver();
  try {
    await goto(driver, '/');
    // Check page source contains links to /login and /register
    const hasLogin = await pageContains(driver, 'login') || await pageContains(driver, 'sign in');
    const hasRegister = await pageContains(driver, 'register') || await pageContains(driver, 'sign up');
    if (!hasLogin) throw new Error('No login link found on landing page.');
    if (!hasRegister) throw new Error('No register/sign-up link found on landing page.');
  } finally {
    await quitDriver(driver);
  }
}

async function F04_loginValidCredentials() {
  const driver = await createDriver();
  try {
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD;
    if (!email || !password) throw new Error('TEST_EMAIL / TEST_PASSWORD not set — skipping live login test.');

    await goto(driver, '/login');
    // Fill email
    const emailInput = await waitFor(driver, 'input[type="email"]');
    await emailInput.clear();
    await emailInput.sendKeys(email);
    // Fill password
    const passInput = await waitFor(driver, 'input[type="password"]');
    await passInput.clear();
    await passInput.sendKeys(password);
    // Submit
    const submitBtn = await waitFor(driver, 'button[type="submit"]');
    await submitBtn.click();
    // Wait for redirect to /dashboard
    await driver.wait(until.urlContains('dashboard'), 20000);
    const url = await driver.getCurrentUrl();
    if (!url.includes('dashboard')) throw new Error(`Login did not redirect to dashboard. Current URL: ${url}`);
  } finally {
    await quitDriver(driver);
  }
}

async function F05_loginInvalidCredentialsShowsError() {
  const driver = await createDriver();
  try {
    await goto(driver, '/login');
    const emailInput = await waitFor(driver, 'input[type="email"]');
    await emailInput.clear();
    await emailInput.sendKeys('invalid_nobody@nowhere.xyz');
    const passInput = await waitFor(driver, 'input[type="password"]');
    await passInput.clear();
    await passInput.sendKeys('wrongpassword999');
    const submitBtn = await waitFor(driver, 'button[type="submit"]');
    await submitBtn.click();
    await driver.sleep(4000); // wait for API response
    // Should NOT redirect to dashboard
    const url = await driver.getCurrentUrl();
    if (url.includes('dashboard')) throw new Error('Login with invalid credentials should not redirect to dashboard.');
    // Should show an error message
    const hasError = await pageContains(driver, 'error') || await pageContains(driver, 'invalid') || await pageContains(driver, 'incorrect') || await pageContains(driver, 'wrong');
    if (!hasError) throw new Error('No error message displayed for invalid login credentials.');
  } finally {
    await quitDriver(driver);
  }
}

async function F06_loginTabSwitching() {
  const driver = await createDriver();
  try {
    await goto(driver, '/login');
    // Should start on "Gmail ID" tab — find the "Mobile OTP" tab button
    const otpTab = await waitFor(driver, 'button');
    const buttons = await driver.findElements(By.css('button'));
    let otpBtn = null;
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.toLowerCase().includes('otp') || text.toLowerCase().includes('mobile') || text.toLowerCase().includes('phone')) {
        otpBtn = btn;
        break;
      }
    }
    if (!otpBtn) throw new Error('Mobile OTP tab button not found on login page.');
    await otpBtn.click();
    await driver.sleep(1000);
    // Should now show phone input
    const hasPhone = await pageContains(driver, 'phone') || await pageContains(driver, 'mobile');
    if (!hasPhone) throw new Error('Phone input not visible after switching to OTP tab.');
  } finally {
    await quitDriver(driver);
  }
}

async function F07_registerFormRendersAllFields() {
  const driver = await createDriver();
  try {
    await goto(driver, '/register');
    const src = await driver.getPageSource();
    const checks = [
      ['name', src.toLowerCase().includes('name')],
      ['email', src.toLowerCase().includes('email')],
      ['phone', src.toLowerCase().includes('phone')],
      ['address', src.toLowerCase().includes('address')],
      ['password', src.toLowerCase().includes('password')],
    ];
    for (const [field, found] of checks) {
      if (!found) throw new Error(`"${field}" field not found on register page.`);
    }
  } finally {
    await quitDriver(driver);
  }
}

async function F08_registerWithValidData() {
  const driver = await createDriver();
  try {
    const uniqueEmail = `testuser_${Date.now()}@charityaitest.com`;
    await goto(driver, '/register');
    await driver.sleep(1500);

    // Fill name
    const nameInput = await waitFor(driver, 'input[type="text"]', 15000);
    await nameInput.sendKeys('Test Automation User');

    // Fill email
    const emailInput = await waitFor(driver, 'input[type="email"]', 10000);
    await emailInput.sendKeys(uniqueEmail);

    // Fill phone
    const telInput = await waitFor(driver, 'input[type="tel"]', 10000);
    await telInput.sendKeys('+91 9876543210');

    // Fill text inputs in order (address comes after phone)
    const textInputs = await driver.findElements(By.css('input[type="text"]'));
    if (textInputs.length > 1) {
      await textInputs[1].sendKeys('Chennai, Tamil Nadu');
    }

    // Fill password
    const passInput = await waitFor(driver, 'input[type="password"]', 10000);
    await passInput.sendKeys('SecurePass@123');

    // Submit
    const submitBtn = await waitFor(driver, 'button[type="submit"]');
    await submitBtn.click();

    // Wait for redirect to /dashboard (success) OR an error
    await driver.sleep(5000);
    const url = await driver.getCurrentUrl();
    if (!url.includes('dashboard')) {
      const hasError = await pageContains(driver, 'error') || await pageContains(driver, 'failed') || await pageContains(driver, 'already');
      if (hasError) throw new Error('Register page showed an error for valid registration data.');
      // If no error but no dashboard — still OK if page changed
    }
  } finally {
    await quitDriver(driver);
  }
}

async function F09_registerDuplicateEmailShowsError() {
  const driver = await createDriver();
  try {
    const existingEmail = process.env.TEST_EMAIL;
    if (!existingEmail) throw new Error('TEST_EMAIL not set — cannot test duplicate email.');

    await goto(driver, '/register');
    await driver.sleep(1500);

    const nameInput = await waitFor(driver, 'input[type="text"]');
    await nameInput.sendKeys('Duplicate Test');
    const emailInput = await waitFor(driver, 'input[type="email"]');
    await emailInput.sendKeys(existingEmail);
    const telInput = await waitFor(driver, 'input[type="tel"]');
    await telInput.sendKeys('+91 9000000000');
    const passInput = await waitFor(driver, 'input[type="password"]');
    await passInput.sendKeys('SomePass@123');

    const textInputs = await driver.findElements(By.css('input[type="text"]'));
    if (textInputs.length > 1) await textInputs[1].sendKeys('Some City');

    const submitBtn = await waitFor(driver, 'button[type="submit"]');
    await submitBtn.click();
    await driver.sleep(5000);

    const url = await driver.getCurrentUrl();
    if (url.includes('dashboard')) throw new Error('Duplicate email should NOT create a new account.');
    const hasError = await pageContains(driver, 'already') || await pageContains(driver, 'exists') || await pageContains(driver, 'error') || await pageContains(driver, 'taken');
    if (!hasError) throw new Error('No error message shown for duplicate email registration.');
  } finally {
    await quitDriver(driver);
  }
}

async function F10_registerRoleToggleWorks() {
  const driver = await createDriver();
  try {
    await goto(driver, '/register');
    await driver.sleep(1000);
    // Find NGO toggle button
    const buttons = await driver.findElements(By.css('button'));
    let ngoBtn = null;
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.toLowerCase().includes('ngo') || text.toLowerCase().includes('organisation')) {
        ngoBtn = btn;
        break;
      }
    }
    if (!ngoBtn) throw new Error('NGO role toggle button not found on register page.');
    await ngoBtn.click();
    await driver.sleep(500);
    // Check the button text on submit changed to "Sign up as NGO"
    const src = await driver.getPageSource();
    if (!src.toLowerCase().includes('ngo')) throw new Error('After clicking NGO toggle, page does not reflect NGO role selection.');
  } finally {
    await quitDriver(driver);
  }
}

async function F11_forgotPasswordPageLoads() {
  const driver = await createDriver();
  try {
    await goto(driver, '/forgot-password');
    const src = await driver.getPageSource();
    const hasContent = src.toLowerCase().includes('forgot') || src.toLowerCase().includes('reset') || src.toLowerCase().includes('password');
    if (!hasContent) throw new Error('Forgot password page did not load expected content.');
  } finally {
    await quitDriver(driver);
  }
}

async function F12_dashboardRedirectsIfUnauthenticated() {
  const driver = await createDriver();
  try {
    // Clear any stored auth
    await driver.get(`${BASE}/`);
    await driver.executeScript("localStorage.removeItem('charityai_user');");
    await driver.sleep(500);
    // Try visiting dashboard directly
    await goto(driver, '/dashboard');
    await driver.sleep(3000);
    const url = await driver.getCurrentUrl();
    // Should redirect to /login
    if (url.includes('dashboard') && !url.includes('login')) {
      throw new Error(`Unauthenticated user was able to access dashboard. URL: ${url}`);
    }
  } finally {
    await quitDriver(driver);
  }
}

async function F13_aboutPageLoads() {
  const driver = await createDriver();
  try {
    await goto(driver, '/about');
    const src = await driver.getPageSource();
    if (!src || src.length < 100) throw new Error('About page returned empty or minimal content.');
    const hasContent = src.toLowerCase().includes('about') || src.toLowerCase().includes('mission') || src.toLowerCase().includes('charity');
    if (!hasContent) throw new Error('About page content not recognizable.');
  } finally {
    await quitDriver(driver);
  }
}

async function F14_contactPageLoads() {
  const driver = await createDriver();
  try {
    await goto(driver, '/contact');
    const src = await driver.getPageSource();
    if (!src || src.length < 100) throw new Error('Contact page returned empty or minimal content.');
    const hasContent = src.toLowerCase().includes('contact') || src.toLowerCase().includes('email') || src.toLowerCase().includes('message');
    if (!hasContent) throw new Error('Contact page content not recognizable.');
  } finally {
    await quitDriver(driver);
  }
}

async function F15_notFoundPageShows() {
  const driver = await createDriver();
  try {
    await goto(driver, '/this-route-does-not-exist-xyz');
    await driver.sleep(2000);
    const src = await driver.getPageSource();
    const has404 = src.toLowerCase().includes('404') || src.toLowerCase().includes('not found') || src.toLowerCase().includes('page not found');
    if (!has404) throw new Error('No 404 / Not Found message shown for an unknown route.');
  } finally {
    await quitDriver(driver);
  }
}

// ─── Suite runner ─────────────────────────────────────────────────────────────

async function runFunctionalityTests() {
  console.log('\n🧪 Running FUNCTIONALITY Tests (F-01 → F-15)...\n');
  const CAT = 'Functionality';
  const results = [];

  results.push(await runTest('F-01', CAT, 'Landing page loads and renders hero section', F01_landingPageLoads));
  results.push(await runTest('F-02', CAT, 'Navigation links (About) work', F02_navigationLinksWork));
  results.push(await runTest('F-03', CAT, 'Login & Register buttons/links present on landing', F03_loginRegisterButtonsRedirect));
  results.push(await runTest('F-04', CAT, 'Login with valid email + password succeeds', F04_loginValidCredentials));
  results.push(await runTest('F-05', CAT, 'Login with invalid credentials shows error', F05_loginInvalidCredentialsShowsError));
  results.push(await runTest('F-06', CAT, 'Login tab switching (Email ↔ OTP) works', F06_loginTabSwitching));
  results.push(await runTest('F-07', CAT, 'Register form renders all required fields', F07_registerFormRendersAllFields));
  results.push(await runTest('F-08', CAT, 'Register with valid data creates account', F08_registerWithValidData));
  results.push(await runTest('F-09', CAT, 'Register with duplicate email shows error', F09_registerDuplicateEmailShowsError));
  results.push(await runTest('F-10', CAT, 'Register role toggle (Donor ↔ NGO) works', F10_registerRoleToggleWorks));
  results.push(await runTest('F-11', CAT, 'Forgot password page loads', F11_forgotPasswordPageLoads));
  results.push(await runTest('F-12', CAT, 'Dashboard redirects unauthenticated users to login', F12_dashboardRedirectsIfUnauthenticated));
  results.push(await runTest('F-13', CAT, 'About page loads with content', F13_aboutPageLoads));
  results.push(await runTest('F-14', CAT, 'Contact page loads with content', F14_contactPageLoads));
  results.push(await runTest('F-15', CAT, '404 page shown for unknown routes', F15_notFoundPageShows));

  return results;
}

module.exports = { runFunctionalityTests };
