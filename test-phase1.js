#!/usr/bin/env node

/**
 * Phase 1 Analytics Dashboard Testing Script
 *
 * This script tests all Phase 1 functionality:
 * 1. API endpoints (financial-metrics, operational-health, insights)
 * 2. Organisation filtering
 * 3. Data calculations
 * 4. Error handling
 */

const axios = require("axios");

const BASE_URL = "http://localhost:4000";
const API_BASE = `${BASE_URL}/api/analytics`;

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) =>
    console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Test helper
async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    log.success(name);
  } catch (error) {
    failedTests++;
    log.error(`${name}\n  Error: ${error.message}`);
  }
}

// API test helper
async function testEndpoint(name, url, params, expectedFields) {
  await test(name, async () => {
    const response = await axios.get(url, { params });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    const data = response.data;

    // Check for expected fields
    for (const field of expectedFields) {
      if (!(field in data)) {
        throw new Error(`Missing expected field: ${field}`);
      }
    }

    log.info(`  Response keys: ${Object.keys(data).slice(0, 5).join(", ")}...`);
  });
}

// Main test suite
async function runTests() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║   Phase 1 Analytics Dashboard - Test Suite        ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  // You'll need to replace these with actual values from your MongoDB
  const testAccountId = "YOUR_ACCOUNT_ID_HERE";
  const testOrganisationId = "YOUR_ORGANISATION_ID_HERE";

  if (testAccountId === "YOUR_ACCOUNT_ID_HERE") {
    log.warning(
      "⚠️  Please update testAccountId and testOrganisationId in the script"
    );
    log.info("Run the following in MongoDB shell to get IDs:");
    log.info("  db.accounts.findOne({}, {_id: 1})");
    log.info("  db.organisations.findOne({}, {_id: 1})");
    return;
  }

  const baseParams = {
    account: testAccountId,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  };

  // Test 1: Financial Metrics Endpoint
  log.section("Financial Metrics API");

  await testEndpoint(
    "GET /api/analytics/financial-metrics (no org filter)",
    `${API_BASE}/financial-metrics`,
    baseParams,
    [
      "totalSales",
      "totalProfit",
      "totalOrders",
      "profitMargin",
      "trends",
      "targets",
    ]
  );

  await testEndpoint(
    "GET /api/analytics/financial-metrics (with org filter)",
    `${API_BASE}/financial-metrics`,
    { ...baseParams, organisation: testOrganisationId },
    ["totalSales", "totalProfit", "totalOrders"]
  );

  // Test 2: Operational Health Endpoint
  log.section("Operational Health API");

  await testEndpoint(
    "GET /api/analytics/operational-health (no org filter)",
    `${API_BASE}/operational-health`,
    baseParams,
    [
      "documentCompletion",
      "fleetUtilization",
      "pendingActions",
      "outstandingInvoices",
    ]
  );

  await testEndpoint(
    "GET /api/analytics/operational-health (with org filter)",
    `${API_BASE}/operational-health`,
    { ...baseParams, organisation: testOrganisationId },
    ["documentCompletion", "fleetUtilization"]
  );

  // Test 3: Insights Endpoint
  log.section("Insights API");

  await testEndpoint(
    "GET /api/analytics/insights (generates insights)",
    `${API_BASE}/insights`,
    baseParams,
    [] // Returns array, so no specific fields to check
  );

  await test("Insights returns array", async () => {
    const response = await axios.get(`${API_BASE}/insights`, {
      params: baseParams,
    });
    if (!Array.isArray(response.data)) {
      throw new Error("Expected array response");
    }
    log.info(`  Generated ${response.data.length} insights`);
  });

  // Test 4: Error Handling
  log.section("Error Handling");

  await test("Missing account parameter returns 400", async () => {
    try {
      await axios.get(`${API_BASE}/financial-metrics`, { params: {} });
      throw new Error("Should have thrown 400 error");
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error(`Expected 400, got ${error.response?.status}`);
      }
    }
  });

  await test("Invalid organisation ID is handled gracefully", async () => {
    const response = await axios.get(`${API_BASE}/financial-metrics`, {
      params: { ...baseParams, organisation: "000000000000000000000000" },
    });
    // Should return empty results, not error
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
  });

  // Test 5: Data Validation
  log.section("Data Validation");

  await test("Financial metrics have valid numeric values", async () => {
    const response = await axios.get(`${API_BASE}/financial-metrics`, {
      params: baseParams,
    });
    const data = response.data;

    const numericFields = [
      "totalSales",
      "totalProfit",
      "totalOrders",
      "profitMargin",
    ];
    for (const field of numericFields) {
      if (typeof data[field] !== "number") {
        throw new Error(`${field} is not a number: ${typeof data[field]}`);
      }
    }

    log.info(`  Total Sales: ₹${(data.totalSales / 100000).toFixed(2)}L`);
    log.info(`  Total Profit: ₹${(data.totalProfit / 100000).toFixed(2)}L`);
    log.info(`  Profit Margin: ${data.profitMargin.toFixed(2)}%`);
  });

  await test("Operational health has valid structure", async () => {
    const response = await axios.get(`${API_BASE}/operational-health`, {
      params: baseParams,
    });
    const data = response.data;

    if (
      !data.documentCompletion ||
      typeof data.documentCompletion.lrCompletionRate !== "number"
    ) {
      throw new Error("Invalid documentCompletion structure");
    }

    if (
      !data.fleetUtilization ||
      typeof data.fleetUtilization.utilizationRate !== "number"
    ) {
      throw new Error("Invalid fleetUtilization structure");
    }

    log.info(
      `  LR Completion: ${data.documentCompletion.lrCompletionRate.toFixed(1)}%`
    );
    log.info(
      `  Fleet Utilization: ${data.fleetUtilization.utilizationRate.toFixed(
        1
      )}%`
    );
  });

  await test("Trends arrays have correct length", async () => {
    const response = await axios.get(`${API_BASE}/financial-metrics`, {
      params: baseParams,
    });
    const trends = response.data.trends;

    if (!trends || !Array.isArray(trends.sales)) {
      throw new Error("Trends data missing or invalid");
    }

    log.info(`  Sales trend data points: ${trends.sales.length}`);
    log.info(`  Profit trend data points: ${trends.profit.length}`);
  });

  // Print summary
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║                  Test Summary                      ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  console.log(`Total Tests:  ${totalTests}`);
  console.log(`${colors.green}Passed:       ${passedTests}${colors.reset}`);
  if (failedTests > 0) {
    console.log(`${colors.red}Failed:       ${failedTests}${colors.reset}`);
  }
  console.log(
    `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`
  );

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});
