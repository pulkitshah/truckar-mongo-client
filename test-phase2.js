#!/usr/bin/env node

/**
 * Phase 2 Analytics Dashboard Testing Script
 *
 * This script tests all Phase 2 functionality:
 * 1. Customer Performance Matrix API
 * 2. Customer Scoring API
 * 3. Transporter Scoring API
 * 4. Organisation filtering for all endpoints
 * 5. Data structure validation
 */

const axios = require("axios");

const BASE_URL = "http://localhost:4000";
const API_BASE = `${BASE_URL}/api/analytics`;

// ANSI color codes
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

async function testEndpoint(name, url, params, expectedFields) {
  await test(name, async () => {
    const response = await axios.get(url, { params });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    const data = response.data;

    for (const field of expectedFields) {
      if (!(field in data)) {
        throw new Error(`Missing expected field: ${field}`);
      }
    }

    log.info(`  Response keys: ${Object.keys(data).join(", ")}`);
  });
}

async function runTests() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║   Phase 2 Analytics Dashboard - Test Suite        ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  // Replace with actual values
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

  // Test 1: Customer Performance Matrix
  log.section("Customer Performance Matrix API");

  await testEndpoint(
    "GET /api/analytics/customer-performance-matrix (no org filter)",
    `${API_BASE}/customer-performance-matrix`,
    baseParams,
    ["customers", "summary"]
  );

  await test("Customer Performance Matrix returns valid data", async () => {
    const response = await axios.get(
      `${API_BASE}/customer-performance-matrix`,
      { params: baseParams }
    );
    const { customers, summary } = response.data;

    if (!Array.isArray(customers)) {
      throw new Error("customers should be an array");
    }

    if (customers.length > 0) {
      const customer = customers[0];
      const requiredFields = [
        "customerId",
        "customerName",
        "orderCount",
        "totalProfit",
        "totalSales",
        "averageOrderValue",
        "profitMargin",
        "daysSinceLastOrder",
      ];

      for (const field of requiredFields) {
        if (!(field in customer)) {
          throw new Error(`Customer missing field: ${field}`);
        }
      }

      log.info(`  Found ${customers.length} customers`);
      log.info(`  Top customer: ${customer.customerName}`);
      log.info(`  Orders: ${customer.orderCount}`);
    }
  });

  await testEndpoint(
    "GET /api/analytics/customer-performance-matrix (with org filter)",
    `${API_BASE}/customer-performance-matrix`,
    { ...baseParams, organisation: testOrganisationId },
    ["customers", "summary"]
  );

  // Test 2: Customer Scoring
  log.section("Customer Scoring API");

  await testEndpoint(
    "GET /api/analytics/customer-scoring (no org filter)",
    `${API_BASE}/customer-scoring`,
    baseParams,
    ["customers", "summary"]
  );

  await test("Customer Scoring calculates health scores correctly", async () => {
    const response = await axios.get(`${API_BASE}/customer-scoring`, {
      params: baseParams,
    });
    const { customers, summary } = response.data;

    if (!Array.isArray(customers)) {
      throw new Error("customers should be an array");
    }

    if (customers.length > 0) {
      const customer = customers[0];
      const requiredFields = [
        "healthScore",
        "scoreTier",
        "scoreBreakdown",
        "recencyStatus",
        "orderGrowth",
        "riskFlags",
      ];

      for (const field of requiredFields) {
        if (!(field in customer)) {
          throw new Error(`Customer missing field: ${field}`);
        }
      }

      // Validate health score range
      if (customer.healthScore < 0 || customer.healthScore > 100) {
        throw new Error(
          `Health score out of range: ${customer.healthScore}`
        );
      }

      // Validate score breakdown adds up correctly
      const breakdown = customer.scoreBreakdown;
      const total =
        breakdown.frequencyScore +
        breakdown.profitabilityScore +
        breakdown.growthScore +
        breakdown.recencyScore +
        breakdown.paymentScore;

      // Allow 1 point difference due to rounding
      if (Math.abs(total - customer.healthScore) > 1) {
        throw new Error(
          `Score breakdown (${total}) doesn't match health score (${customer.healthScore})`
        );
      }

      log.info(`  Found ${customers.length} scored customers`);
      log.info(`  Top customer: ${customer.customerName}`);
      log.info(`  Health Score: ${customer.healthScore}`);
      log.info(`  Tier: ${customer.scoreTier}`);
      log.info(
        `  Champions: ${summary.championCount}, At Risk: ${summary.atRiskCount}`
      );
    }
  });

  // Test 3: Transporter Scoring
  log.section("Transporter Scoring API");

  await testEndpoint(
    "GET /api/analytics/transporter-scoring (no org filter)",
    `${API_BASE}/transporter-scoring`,
    baseParams,
    ["transporters", "summary"]
  );

  await test("Transporter Scoring calculates partnership scores", async () => {
    const response = await axios.get(`${API_BASE}/transporter-scoring`, {
      params: baseParams,
    });
    const { transporters, summary } = response.data;

    if (!Array.isArray(transporters)) {
      throw new Error("transporters should be an array");
    }

    if (transporters.length > 0) {
      const transporter = transporters[0];
      const requiredFields = [
        "partnershipScore",
        "partnershipTier",
        "scoreBreakdown",
        "docCompletionRate",
        "costConsistency",
        "riskFlags",
      ];

      for (const field of requiredFields) {
        if (!(field in transporter)) {
          throw new Error(`Transporter missing field: ${field}`);
        }
      }

      if (transporter.partnershipScore < 0 || transporter.partnershipScore > 100) {
        throw new Error(
          `Partnership score out of range: ${transporter.partnershipScore}`
        );
      }

      log.info(`  Found ${transporters.length} scored transporters`);
      log.info(`  Top transporter: ${transporter.transporterName}`);
      log.info(`  Partnership Score: ${transporter.partnershipScore}`);
      log.info(`  Tier: ${transporter.partnershipTier}`);
      log.info(
        `  Strategic: ${summary.strategicCount}, At Risk: ${summary.atRiskCount}`
      );
    }
  });

  await testEndpoint(
    "GET /api/analytics/transporter-scoring (with org filter)",
    `${API_BASE}/transporter-scoring`,
    { ...baseParams, organisation: testOrganisationId },
    ["transporters", "summary"]
  );

  // Test 4: Error Handling
  log.section("Error Handling");

  await test("Missing account parameter returns 400", async () => {
    try {
      await axios.get(`${API_BASE}/customer-performance-matrix`, {
        params: {},
      });
      throw new Error("Should have thrown 400 error");
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error(`Expected 400, got ${error.response?.status}`);
      }
    }
  });

  await test("Invalid organisation ID is handled gracefully", async () => {
    const response = await axios.get(`${API_BASE}/customer-scoring`, {
      params: { ...baseParams, organisation: "000000000000000000000000" },
    });
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
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

runTests().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});
