'use strict';

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

/**
 * Creates a configured headless Chrome WebDriver instance.
 * Flags are tuned for GitHub Actions (no sandbox, shared memory fixes).
 */
async function createDriver() {
  const options = new chrome.Options();

  const headed = process.env.HEADED === 'true';

  if (!headed) {
    options.addArguments('--headless=new');
  }

  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1280,900',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--disable-infobars',
    '--ignore-certificate-errors',
    '--allow-running-insecure-content',
    '--disable-web-security',        // needed for cross-origin fetch checks
    '--log-level=3',                 // suppress Chrome console noise
    '--silent'
  );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  const timeout = parseInt(process.env.SELENIUM_TIMEOUT || '30000', 10);
  await driver.manage().setTimeouts({
    implicit: timeout,
    pageLoad: timeout,
    script: timeout,
  });

  return driver;
}

/**
 * Safely quit a driver (ignores errors during teardown).
 */
async function quitDriver(driver) {
  try {
    if (driver) await driver.quit();
  } catch (_) {
    // ignore teardown errors
  }
}

module.exports = { createDriver, quitDriver };
