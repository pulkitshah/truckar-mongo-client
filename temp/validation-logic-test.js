/**
 * Period and View By Validation Logic
 *
 * This test documents the expected behavior of period/groupBy validation
 */

const isPeriodDisabled = (periodValue, groupByValue) => {
  // Day grouping: All periods are valid
  if (groupByValue === "day") return false;

  // Week grouping: Need at least 2 weeks (14 days) of data
  if (groupByValue === "week") {
    return periodValue === "week"; // Disable "Last 7 days"
  }

  // Month grouping: Need at least 2 months (60 days) of data
  if (groupByValue === "month") {
    return periodValue === "week" || periodValue === "month"; // Disable "Last 7 days" and "Last 30 days"
  }

  // Quarter grouping: Need at least 2 quarters (180 days) of data
  if (groupByValue === "quarter") {
    return periodValue !== "year"; // Only "Last year" makes sense
  }

  return false;
};

console.log("=== PERIOD/VIEW BY VALIDATION MATRIX ===\n");

const periods = ["week", "month", "quarter", "year"];
const groupBys = ["day", "week", "month", "quarter"];
const periodLabels = {
  week: "Last 7 days",
  month: "Last 30 days",
  quarter: "Last 90 days",
  year: "Last year",
};

groupBys.forEach((groupBy) => {
  console.log(`View By: ${groupBy.toUpperCase()}`);
  periods.forEach((period) => {
    const disabled = isPeriodDisabled(period, groupBy);
    const status = disabled ? "❌ DISABLED" : "✅ ENABLED ";
    console.log(`  ${periodLabels[period]}: ${status}`);
  });
  console.log("");
});

console.log("=== VALIDATION RULES ===\n");
console.log("1. Day view: All periods valid (7, 30, 90, 365 days)");
console.log("2. Week view: Minimum 30 days needed (2+ weeks)");
console.log("3. Month view: Minimum 90 days needed (3+ months)");
console.log('4. Quarter view: Only "Last year" valid (4 quarters)');
console.log("\n=== AUTO-ADJUSTMENT BEHAVIOR ===\n");
console.log("When switching View By:");
console.log("- Day → any: No change needed");
console.log('- Week (if on "7 days"): Auto-switch to "30 days"');
console.log('- Month (if on "7/30 days"): Auto-switch to "90 days"');
console.log('- Quarter (if not on "year"): Auto-switch to "Last year"');
