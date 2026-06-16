'use strict';

/**
 * CharityAI — Master E2E Test Runner
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   node run_tests.js                    # Run all suites
 *   node run_tests.js --suite=functionality
 *   node run_tests.js --suite=vulnerability
 *   node run_tests.js --suite=unit
 *
 * Output:
 *   - Console summary table
 *   - reports/test-report-<timestamp>.xlsx   (downloadable artifact in CI)
 */

// Load .env if present (local runs)
try {
  require('fs').accessSync('.env');
  const { config } = require('dotenv' + ''); // optional peer
  if (config) config();
} catch (_) {
  // No .env file — rely on environment variables already set (CI)
}

const path   = require('path');
const fs     = require('fs');

const { runFunctionalityTests } = require('./tests/01_functionality.test');
const { runVulnerabilityTests } = require('./tests/02_vulnerability.test');
const { runUnitApiTests       } = require('./tests/03_unit_api.test');
const { generateReport         } = require('./helpers/reporter');

// ─── Parse CLI flags ──────────────────────────────────────────────────────────
const args  = process.argv.slice(2);
const suite = (args.find(a => a.startsWith('--suite=')) || '').replace('--suite=', '') || 'all';

// ─── Print header ─────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║     CharityAI — Selenium E2E Test Suite Runner      ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log(`\n  Base URL : ${process.env.TEST_BASE_URL || 'http://localhost:5173'}`);
console.log(`  API  URL : ${process.env.TEST_API_URL  || 'https://charityai-backend.onrender.com/api'}`);
console.log(`  Suite    : ${suite}`);
console.log(`  Started  : ${new Date().toLocaleString()}`);
console.log('');

// ─── Run suites ───────────────────────────────────────────────────────────────
async function main() {
  const allResults = [];
  const startTime  = Date.now();

  try {
    if (suite === 'all' || suite === 'unit') {
      const results = await runUnitApiTests();
      allResults.push(...results);
    }

    if (suite === 'all' || suite === 'vulnerability') {
      const results = await runVulnerabilityTests();
      allResults.push(...results);
    }

    if (suite === 'all' || suite === 'functionality') {
      const results = await runFunctionalityTests();
      allResults.push(...results);
    }
  } catch (fatalErr) {
    console.error('\n❌ FATAL ERROR during test execution:', fatalErr.message);
  }

  // ─── Console summary ──────────────────────────────────────────────────────
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  const pass  = allResults.filter(r => r.status === 'PASS').length;
  const fail  = allResults.filter(r => r.status === 'FAIL').length;
  const skip  = allResults.filter(r => r.status === 'SKIP').length;
  const total = allResults.length;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                   TEST RESULTS                      ║');
  console.log('╠══════════════════════════════════════════════════════╣');

  // Per-test lines
  const statusIcon = { PASS: '✅', FAIL: '❌', SKIP: '⏭' };
  allResults.forEach(r => {
    const icon = statusIcon[r.status] || '?';
    const dur  = r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '';
    const err  = r.error ? ` → ${r.error.slice(0, 80)}` : '';
    console.log(`║  ${icon} [${r.id.padEnd(5)}] ${r.name.slice(0, 35).padEnd(35)} ${dur.padStart(6)}  ║`);
    if (r.error) {
      console.log(`║       ⚠ ${err.slice(0, 50).padEnd(50)}  ║`);
    }
  });

  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Total: ${total}  ✅ ${pass}  ❌ ${fail}  ⏭ ${skip}   ⏱ ${totalDuration}s`.padEnd(55) + '║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ─── Generate .xlsx report ────────────────────────────────────────────────
  const reportDir = path.join(process.cwd(), 'reports');
  let reportPath = null;

  try {
    reportPath = await generateReport(allResults, reportDir);
    console.log(`\n📊 Report generated: ${reportPath}`);
    console.log('   → Download this file from GitHub Actions → Artifacts section.\n');
  } catch (reportErr) {
    console.error('⚠️  Failed to generate .xlsx report:', reportErr.message);
  }

  // ─── GitHub Actions Step Summary ─────────────────────────────────────────
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const passRate = total ? Math.round((pass / total) * 100) : 0;
    const emoji    = fail === 0 ? '🟢' : fail <= 3 ? '🟡' : '🔴';
    const md = [
      `## ${emoji} CharityAI E2E Test Results`,
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Tests | **${total}** |`,
      `| ✅ Passed | **${pass}** |`,
      `| ❌ Failed | **${fail}** |`,
      `| ⏭ Skipped | **${skip}** |`,
      `| Pass Rate | **${passRate}%** |`,
      `| Duration | **${totalDuration}s** |`,
      '',
      '### Detailed Results',
      '',
      '| Test ID | Category | Test Name | Status | Duration |',
      '|---------|----------|-----------|--------|----------|',
      ...allResults.map(r => {
        const s = r.status === 'PASS' ? '✅ PASS' : r.status === 'FAIL' ? '❌ FAIL' : '⏭ SKIP';
        const d = r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '—';
        return `| ${r.id} | ${r.category} | ${r.name} | ${s} | ${d} |`;
      }),
      '',
      fail > 0 ? '### ❌ Failed Tests' : '',
      fail > 0 ? '' : '',
      ...allResults.filter(r => r.status === 'FAIL').map(r =>
        `- **${r.id}** — ${r.name}\n  > ${r.error || 'No error details'}`
      ),
    ].join('\n');

    try {
      fs.appendFileSync(summaryFile, md);
      console.log('📝 GitHub Step Summary written.');
    } catch (e) {
      console.warn('Could not write GitHub Step Summary:', e.message);
    }
  }

  // ─── Exit code ────────────────────────────────────────────────────────────
  // Exit with 1 if critical tests failed (allow skip)
  // Only Unit/API and critical vulnerability tests cause a non-zero exit.
  const criticalFails = allResults.filter(r =>
    r.status === 'FAIL' &&
    (r.id.startsWith('U-') || r.id === 'V-06' || r.id === 'V-01' || r.id === 'F-04' || r.id === 'F-05')
  );

  if (criticalFails.length > 0) {
    console.error(`\n🚨 ${criticalFails.length} CRITICAL test(s) failed. CI pipeline will be marked as failed.\n`);
    process.exit(1);
  } else if (fail > 0) {
    console.warn(`\n⚠️  ${fail} non-critical test(s) failed. Review the report.\n`);
    process.exit(0); // Don't block CI for non-critical failures
  } else {
    console.log(`\n✅ All tests passed!\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
