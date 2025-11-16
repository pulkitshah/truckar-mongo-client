# Phase 1 Analytics Dashboard - Manual Testing Checklist

**Date:** November 16, 2025  
**Environment:** localhost:4000  
**Status:** 🔄 In Progress

---

## Pre-Testing Setup

- [ ] MongoDB is running and accessible
- [ ] Dev server is running on localhost:4000
- [ ] You're logged in with a valid account
- [ ] You have test data (Orders, Invoices, LRs, Vehicles)

---

## 1. Dashboard Loading & Layout

### Organization Selector
- [ ] Organization dropdown appears in the top-right
- [ ] Shows "All Organizations" as default
- [ ] Lists all organizations associated with your account
- [ ] Can select individual organization
- [ ] Selected organization persists across page reloads

### Financial Metrics Cards (6 cards)
- [ ] **Total Sales** card displays with:
  - [ ] Current value (₹X.XXL format)
  - [ ] Growth percentage vs previous period
  - [ ] Sparkline chart (30 days)
  - [ ] Up/down arrow indicator
  
- [ ] **Total Profit** card displays with:
  - [ ] Current value
  - [ ] Growth percentage
  - [ ] Sparkline chart
  - [ ] Target indicator (if set)
  
- [ ] **Total Orders** card displays with:
  - [ ] Current count
  - [ ] Growth percentage
  - [ ] Sparkline chart
  
- [ ] **Profit Margin** card displays with:
  - [ ] Percentage value
  - [ ] Change indicator
  - [ ] Sparkline chart
  - [ ] Color coding (green/yellow/red)
  
- [ ] **Average Order Value** card displays with:
  - [ ] AOV value
  - [ ] Growth percentage
  - [ ] Sparkline chart
  
- [ ] **Expense Ratio** card displays with:
  - [ ] Percentage value
  - [ ] Change indicator
  - [ ] Sparkline chart

---

## 2. Operational Health Dashboard

### Document Completion Section
- [ ] LR Completion Rate displays correctly
- [ ] Invoice Completion Rate displays correctly
- [ ] Full Completion Rate displays correctly
- [ ] Progress bars show correct percentages
- [ ] Color coding (green > 80%, yellow 60-80%, red < 60%)
- [ ] Shows count of orders without LR
- [ ] Shows count of orders without invoices

### Fleet Utilization Section
- [ ] Utilization percentage displays
- [ ] Active vehicles count
- [ ] Total vehicles count
- [ ] Idle vehicles count
- [ ] Gauge/progress indicator works
- [ ] Color coding based on threshold

### Driver Activity Section
- [ ] Utilization percentage displays
- [ ] Active drivers count
- [ ] Total drivers count
- [ ] Idle drivers count

### Pending Actions Section
- [ ] Pending LRs section shows:
  - [ ] Total count
  - [ ] Grouped by customer
  - [ ] Each customer's pending count
  - [ ] Alert if threshold exceeded
  
- [ ] Pending Invoices section shows:
  - [ ] Total count
  - [ ] Grouped by customer
  - [ ] Each customer's pending count
  - [ ] Alert if threshold exceeded

### Outstanding Invoices Section
- [ ] Total outstanding amount displays
- [ ] Total invoice count displays
- [ ] Aging breakdown shows:
  - [ ] 0-30 days (count & amount)
  - [ ] 30-60 days (count & amount)
  - [ ] 60-90 days (count & amount)
  - [ ] 90+ days (count & amount)
- [ ] Chart/visualization of aging
- [ ] Click to view details works

---

## 3. Insights Section

- [ ] Insights panel displays at bottom
- [ ] Shows up to 6 insights
- [ ] Insight types display correctly:
  - [ ] ✅ Positive (green)
  - [ ] ⚠️ Warning (yellow)
  - [ ] ❌ Negative (red)
  - [ ] ℹ️ Info (blue)
  - [ ] 📈 Improvement (teal)
- [ ] Each insight shows:
  - [ ] Type icon
  - [ ] Message text
  - [ ] Value/metric
  - [ ] Action suggestion (if applicable)
- [ ] Insights are sorted by priority
- [ ] Auto-refreshes when period changes

---

## 4. Organization Filtering

### Test with "All Organizations"
- [ ] All metrics show combined data
- [ ] Total includes all organizations
- [ ] Operational health includes all vehicles/drivers

### Test with Single Organization Selected
- [ ] Financial metrics filter correctly:
  - [ ] Only orders from selected org
  - [ ] Sales totals match org filter
  - [ ] Profit calculations correct
  
- [ ] Operational health filters correctly:
  - [ ] Only vehicles from selected org
  - [ ] Only drivers from selected org
  - [ ] Document completion for org only
  
- [ ] Insights reflect org-specific data

### Test Hybrid Filtering (Backward Compatibility)
- [ ] Orders WITH `organisation` field filter correctly
- [ ] Orders WITHOUT `organisation` field:
  - [ ] Still appear when "All Organizations" selected
  - [ ] Filter via vehicle.organisation lookup
  - [ ] Appear in correct org when vehicle has org

---

## 5. Date Period Selection

### Today
- [ ] Shows only today's data
- [ ] Compares to yesterday
- [ ] All metrics update

### Week-to-Date (WTD)
- [ ] Shows Monday to today
- [ ] Compares to previous week (same days)
- [ ] All metrics update

### Month-to-Date (MTD)
- [ ] Shows 1st of month to today
- [ ] Compares to previous month (same days)
- [ ] All metrics update

### Quarter-to-Date (QTD)
- [ ] Shows quarter start to today
- [ ] Uses Indian fiscal quarters:
  - [ ] Q1: Apr-Jun
  - [ ] Q2: Jul-Sep
  - [ ] Q3: Oct-Dec
  - [ ] Q4: Jan-Mar
- [ ] Compares to previous quarter
- [ ] All metrics update

### Year-to-Date (YTD)
- [ ] Shows April 1 (fiscal year) to today
- [ ] Compares to previous fiscal year
- [ ] All metrics update

### Custom Date Range
- [ ] Date picker appears
- [ ] Can select start date
- [ ] Can select end date
- [ ] Calculates correct comparison period
- [ ] All metrics update

---

## 6. Error Handling

### Network Errors
- [ ] Shows loading state while fetching
- [ ] Shows error message if API fails
- [ ] Can retry failed requests
- [ ] Doesn't break UI on error

### Invalid Data
- [ ] Handles missing data gracefully
- [ ] Shows 0 or "N/A" for empty metrics
- [ ] Doesn't crash on null/undefined
- [ ] Shows appropriate messages

### Authentication
- [ ] Redirects to login if not authenticated
- [ ] Persists after page refresh
- [ ] Handles token expiration

---

## 7. Performance & UX

### Loading States
- [ ] Skeleton loaders show while loading
- [ ] Smooth transitions when data loads
- [ ] No layout shift/flash of content

### Responsiveness
- [ ] Desktop layout works (1920px+)
- [ ] Laptop layout works (1366px)
- [ ] Tablet layout works (768px)
- [ ] Mobile layout works (375px)
- [ ] Cards stack correctly on small screens
- [ ] Text remains readable

### Interactions
- [ ] Hovering on cards shows tooltips
- [ ] Sparklines respond to hover
- [ ] Clicking metrics shows details
- [ ] All buttons/links work
- [ ] No console errors

---

## 8. Data Accuracy

### Financial Calculations
- [ ] Total Sales = freightAmount + extraCharges - discount
- [ ] Total Cost = purchaseCost + operatingExpenses
- [ ] Total Profit = Total Sales - Total Cost
- [ ] Profit Margin = (Profit / Sales) × 100
- [ ] Average Order Value = Sales / Order Count
- [ ] Expense Ratio = (Cost / Sales) × 100

### Growth Calculations
- [ ] Growth % = ((Current - Previous) / Previous) × 100
- [ ] Negative growth shows with minus sign
- [ ] Stable (< 1% change) shows as 0%

### Comparison Periods
- [ ] Previous period has same number of days
- [ ] Comparisons align correctly (Mon-Wed vs previous Mon-Wed)
- [ ] Fiscal year comparisons correct

### Indian Locale Formatting
- [ ] Currency shows ₹ symbol
- [ ] Large numbers show in Lakhs (₹15.80L)
- [ ] Small numbers show with commas (₹1,58,000)
- [ ] Percentages show with 1-2 decimals

---

## 9. API Endpoint Testing

Open browser DevTools Network tab and verify:

### `/api/analytics/financial-metrics`
- [ ] Returns 200 status
- [ ] Response time < 2 seconds
- [ ] Contains all required fields
- [ ] Data types are correct
- [ ] No errors in console

### `/api/analytics/operational-health`
- [ ] Returns 200 status
- [ ] Response time < 2 seconds
- [ ] Contains all sections
- [ ] Aging breakdown correct
- [ ] No errors in console

### `/api/analytics/insights`
- [ ] Returns 200 status
- [ ] Response time < 1 second
- [ ] Returns array of insights
- [ ] Insights are relevant
- [ ] No errors in console

---

## 10. Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Issues Found

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | | 🔴 High / 🟡 Med / 🟢 Low | Open/Fixed | |
| 2 | | | | |
| 3 | | | | |

---

## Test Results Summary

**Tested By:** _________________  
**Date:** _________________  
**Environment:** _________________  

**Overall Status:** 
- ✅ Pass - All tests passed
- ⚠️ Pass with Issues - Minor issues found
- ❌ Fail - Critical issues found

**Notes:**
_________________________________________
_________________________________________
_________________________________________

---

## Sign-off

**Developer:** _________________ Date: _______  
**QA/Reviewer:** _________________ Date: _______  

**Ready for Phase 2:** [ ] Yes [ ] No

If No, remaining tasks:
- [ ] _____________________________
- [ ] _____________________________
- [ ] _____________________________
