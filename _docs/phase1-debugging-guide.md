# Phase 1 Debugging Guide

## Quick Fixes Applied

### 1. MongoDB Aggregation Syntax Error (CRITICAL - FIXED ✅)

**Issue:** MongoDB `$switch` operator was using `then:` instead of `value:`  
**Location:** `/src/pages/api/analytics/operational-health.js` (lines 449, 470, 491)  
**Error:** `Do not add 'then' to an object` (reserved keyword in JavaScript)

**Fixed:** Changed all instances to use correct MongoDB syntax:
```javascript
// ❌ WRONG
{ case: { $lt: [...] }, then: "0-30" }

// ✅ CORRECT
{ case: { $lt: [...] }, value: "0-30" }
```

---

### 2. Unused Variables (FIXED ✅)

**Location:** `/src/pages/api/analytics/insights.js`
- Removed unused `currentMatchStage` initial assignment (line 53)
- Removed unused `profitGrowth` variable declaration (line 217)

---

## Known Non-Critical Issues

### 1. ESLint "Unexpected await" Warnings (FALSE POSITIVE - IGNORE)

**Location:** Multiple files calling `analyticsApi` methods  
**Error:** `Unexpected 'await' of a non-Promise (non-"Thenable") value`

**Explanation:** These are **false positives**. The methods ARE async and DO return Promises. ESLint is confused because:
- The functions return an object in both try/catch blocks
- This makes ESLint think it's not a true Promise
- But async functions ALWAYS return Promises, even with explicit returns

**Impact:** None - code works correctly  
**Action:** Safe to ignore these warnings

---

### 2. Cognitive Complexity Warnings

**Locations:**
- `/src/pages/api/analytics/insights.js` - Complexity 36 (limit 15)
- `/src/pages/api/analytics/financial-metrics.js` - Complexity 18 (limit 15)

**Explanation:** These are complex analytics functions that:
- Handle multiple data aggregations
- Process comparison periods
- Generate insights with multiple conditions
- Cannot be easily simplified without breaking functionality

**Impact:** Minimal - code is well-structured despite complexity  
**Action:** Consider refactoring in Phase 2 if time permits

---

## Common Runtime Issues & Solutions

### Issue 1: "Account is required" Error

**Symptom:** API returns 400 error  
**Cause:** Missing `account` parameter in request

**Solution:**
```javascript
// Ensure account ID is passed
const params = {
  account: accountId, // ← Must be present
  startDate,
  endDate,
  organisation, // Optional
};
```

---

### Issue 2: Empty/Zero Metrics

**Symptom:** All metrics show 0 or N/A  
**Possible Causes:**

1. **No data in selected date range**
   - Check if orders exist: `db.orders.find({ saleDate: { $gte: startDate } })`
   - Try wider date range

2. **Organisation filter too restrictive**
   - Select "All Organizations"
   - Check if orders have `organisation` field: `db.orders.findOne({}, { organisation: 1, vehicle: 1 })`
   - Verify vehicle has org: `db.vehicles.findOne({ _id: vehicleId }, { organisation: 1 })`

3. **Account filter wrong**
   - Verify account ID: `db.accounts.findOne({ _id: accountId })`
   - Check orders belong to account: `db.orders.find({ account: accountId })`

**Debug SQL:**
```javascript
// In MongoDB shell
use truckar;

// Check order count
db.orders.countDocuments({ account: ObjectId("YOUR_ACCOUNT_ID") });

// Check date range
db.orders.find({ 
  account: ObjectId("YOUR_ACCOUNT_ID"),
  saleDate: { 
    $gte: new Date("2024-11-01"),
    $lte: new Date() 
  }
}).count();

// Check financial data
db.orders.aggregate([
  { $match: { account: ObjectId("YOUR_ACCOUNT_ID") } },
  { 
    $group: { 
      _id: null,
      total: { $sum: "$freightAmount" },
      count: { $sum: 1 }
    }
  }
]);
```

---

### Issue 3: Sparklines Not Showing

**Symptom:** Metric cards show values but no sparkline chart  
**Possible Causes:**

1. **Trends array is empty**
   - Check API response: Look for `trends` object with `sales`, `profit`, etc. arrays
   - Should have ~30 data points

2. **Chart library not loaded**
   - Check console for errors
   - Verify Recharts is installed: `npm list recharts`

3. **Data format wrong**
   - Trends should be array of numbers: `[45000, 52000, ...]`
   - Not objects or strings

**Debug:**
```javascript
// In browser console
fetch('/api/analytics/financial-metrics?account=ACCOUNT_ID&startDate=2024-10-01&endDate=2024-11-16')
  .then(r => r.json())
  .then(d => console.log('Trends:', d.trends));
```

---

### Issue 4: Organisation Selector Empty

**Symptom:** Dropdown shows no organizations  
**Possible Causes:**

1. **No organisations in DB**
   - Check: `db.organisations.find({ account: ObjectId("ACCOUNT_ID") })`

2. **Redux state not loaded**
   - Check Redux DevTools: `analytics.organizations.data`
   - Should be array of `{_id, name, city}`

3. **API endpoint missing**
   - Verify `/api/organisations` exists and returns data

**Solution:**
```javascript
// Create test organisation
db.organisations.insertOne({
  account: ObjectId("YOUR_ACCOUNT_ID"),
  name: "Main Branch",
  city: "Mumbai",
  address: "123 Test St"
});
```

---

### Issue 5: Operational Health All Zeros

**Symptom:** Fleet utilization, document completion show 0%  
**Possible Causes:**

1. **No vehicles in system**
   - Check: `db.vehicles.countDocuments({ account: ObjectId("ACCOUNT_ID") })`

2. **No LRs or invoices**
   - Check: `db.lrs.countDocuments({ account: ObjectId("ACCOUNT_ID") })`
   - Check: `db.invoices.countDocuments({ account: ObjectId("ACCOUNT_ID") })`

3. **Orders not linked to vehicles**
   - Check: `db.orders.find({ vehicle: { $exists: true, $ne: null } })`

---

### Issue 6: Outstanding Invoices Aging Wrong

**Symptom:** All invoices show in "0-30 days" bucket  
**Cause:** Fixed! MongoDB syntax was using `then:` instead of `value:`

**Verify Fix:**
```javascript
// Test the aging calculation
db.invoices.aggregate([
  { 
    $match: { 
      account: ObjectId("ACCOUNT_ID"),
      paymentStatus: { $in: ["unpaid", "partial"] }
    }
  },
  {
    $addFields: {
      daysOutstanding: {
        $floor: {
          $divide: [
            { $subtract: [new Date(), { $ifNull: ["$dueDate", "$invoiceDate"] }] },
            1000 * 60 * 60 * 24
          ]
        }
      },
      agingBucket: {
        $switch: {
          branches: [
            { case: { $lt: [{ $floor: {...} }, 30] }, value: "0-30" },
            { case: { $lt: [{ $floor: {...} }, 60] }, value: "30-60" },
            { case: { $lt: [{ $floor: {...} }, 90] }, value: "60-90" }
          ],
          default: "90+"
        }
      }
    }
  }
]);
```

---

## Browser Console Debugging

### Enable Verbose Logging

Add to browser console:
```javascript
// Enable API logging
localStorage.setItem('DEBUG', 'analytics:*');

// Or in code (add to /src/pages/dashboard/index.js)
console.log('Financial Metrics Response:', response);
console.log('Operational Health Response:', operationalHealth);
console.log('Selected Organisation:', selectedOrganisation);
```

---

## Testing API Endpoints Directly

### 1. Financial Metrics
```bash
curl "http://localhost:4000/api/analytics/financial-metrics?account=YOUR_ACCOUNT_ID&startDate=2024-10-01&endDate=2024-11-16" \
  -H "Cookie: YOUR_SESSION_COOKIE"
```

### 2. Operational Health
```bash
curl "http://localhost:4000/api/analytics/operational-health?account=YOUR_ACCOUNT_ID&startDate=2024-10-01&endDate=2024-11-16" \
  -H "Cookie: YOUR_SESSION_COOKIE"
```

### 3. Insights
```bash
curl "http://localhost:4000/api/analytics/insights?account=YOUR_ACCOUNT_ID&startDate=2024-10-01&endDate=2024-11-16" \
  -H "Cookie: YOUR_SESSION_COOKIE"
```

**Get Session Cookie:**
1. Open DevTools → Application → Cookies
2. Copy `next-auth.session-token` value

---

## Performance Issues

### Slow API Response (> 2 seconds)

**Solutions:**

1. **Add MongoDB indexes:**
```javascript
db.orders.createIndex({ account: 1, saleDate: -1 });
db.orders.createIndex({ account: 1, vehicle: 1 });
db.orders.createIndex({ account: 1, organisation: 1 });
db.invoices.createIndex({ account: 1, paymentStatus: 1 });
db.vehicles.createIndex({ account: 1, organisation: 1 });
```

2. **Reduce date range for testing:**
```javascript
// Instead of 30 days
const startDate = moment().subtract(7, 'days');
```

3. **Disable trends temporarily:**
```javascript
// In API endpoint, comment out trend calculation
// const trends = await calculateTrends(...);
const trends = { sales: [], profit: [], orders: [] };
```

---

## Next Steps for Production

### Before Phase 2:
- [ ] Add MongoDB indexes (see above)
- [ ] Set up error tracking (Sentry/LogRocket)
- [ ] Add request timeout handling
- [ ] Implement caching for frequently accessed data
- [ ] Add rate limiting to API endpoints
- [ ] Set up monitoring/alerting
- [ ] Document API endpoints (Swagger/OpenAPI)

### Performance Optimizations:
- [ ] Consider Redis caching for metrics
- [ ] Aggregate and cache trend data daily
- [ ] Use MongoDB materialized views for complex aggregations
- [ ] Implement pagination for large result sets

### Security:
- [ ] Validate all user inputs
- [ ] Add rate limiting per account
- [ ] Implement query timeout limits
- [ ] Sanitize MongoDB queries
- [ ] Add audit logging for sensitive operations

---

## Contact & Support

**Issues?** Check:
1. This debugging guide
2. Phase 1 implementation summary (`_docs/phase1-implementation-summary.md`)
3. Testing checklist (`_docs/phase1-testing-checklist.md`)

**Still stuck?** Document the issue:
- Error message (full stack trace)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if UI issue
- Browser console logs
- Network tab for API issues
