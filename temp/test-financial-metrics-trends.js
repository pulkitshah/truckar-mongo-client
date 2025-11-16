/**
 * Test script to verify financial-metrics API returns trend data for sparklines
 * Run: node temp/test-financial-metrics-trends.js
 */

const moment = require("moment");

// Test parameters
const accountId = "5f9e3e1a5a5a5a5a5a5a5a5a"; // Replace with actual account ID
const endDate = new Date();
const startDate = moment(endDate).subtract(30, "days").toDate();

console.log("Testing financial-metrics API for trends data...\n");
console.log(
  "Date Range:",
  startDate.toISOString().split("T")[0],
  "to",
  endDate.toISOString().split("T")[0]
);

// Make API call
fetch(
  `http://localhost:4000/api/analytics/financial-metrics?account=${accountId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
)
  .then((res) => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  })
  .then((data) => {
    console.log("\n✅ API Response received\n");

    // Check trends structure
    console.log("Trends Structure:");
    console.log("- Sales trend length:", data.trends?.sales?.length || 0);
    console.log("- Profit trend length:", data.trends?.profit?.length || 0);
    console.log("- Orders trend length:", data.trends?.orders?.length || 0);
    console.log("- Margin trend length:", data.trends?.margin?.length || 0);
    console.log("- AOV trend length:", data.trends?.aov?.length || 0);
    console.log(
      "- Expense ratio trend length:",
      data.trends?.expenseRatio?.length || 0
    );

    if (data.trends?.sales?.length > 0) {
      console.log("\n✅ Trend data is populated!");
      console.log("\nSample Sales Trend (first 5 days):");
      console.log(data.trends.sales.slice(0, 5));
      console.log("\nSample Profit Trend (first 5 days):");
      console.log(data.trends.profit.slice(0, 5));
    } else {
      console.log("\n❌ Trend data is EMPTY or MISSING");
      console.log("Full response:", JSON.stringify(data, null, 2));
    }
  })
  .catch((err) => {
    console.error("\n❌ Error:", err.message);
  });
