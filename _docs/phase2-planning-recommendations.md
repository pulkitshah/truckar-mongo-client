# Phase 2 Planning - Analytics Dashboard Enhancement

**Based on:** Phase 1 completion  
**Status:** 📋 Planning  
**Priority:** Medium-High

---

## Phase 1 Completion Summary ✅

### What We Built:
- ✅ Multi-organization selector with hybrid filtering
- ✅ 6 financial metrics with sparklines (Sales, Profit, Orders, Margin, AOV, Expense Ratio)
- ✅ Operational health dashboard (Document completion, Fleet utilization, Pending actions)
- ✅ Outstanding invoices with aging analysis (0-30, 30-60, 60-90, 90+ days)
- ✅ Auto-generated insights system (6 insight types)
- ✅ Period comparison (Today, WTD, MTD, QTD, YTD, Custom)
- ✅ Indian fiscal year and locale support
- ✅ Backward compatible organisation filtering

### Technical Debt from Phase 1:
- High cognitive complexity in insights.js (36) and financial-metrics.js (18)
- ESLint false positives for async/await (can ignore)
- No caching layer (all API calls hit DB)
- No MongoDB indexes (will slow down as data grows)
- No error tracking/monitoring
- Markdown linting issues in docs (non-critical)

---

## Phase 2 Objectives

### Primary Goals:
1. **Customer Analytics** - Deep dive into customer behavior and profitability
2. **Vehicle Analytics** - Fleet performance, utilization patterns, maintenance tracking
3. **Driver Analytics** - Performance metrics, trip analysis, efficiency scores
4. **Route Analytics** - Route optimization, distance analysis, delivery patterns
5. **Performance Optimizations** - Caching, indexes, query optimization

### Secondary Goals:
- Export functionality (PDF reports, Excel exports)
- Custom dashboard widgets (drag-and-drop)
- Email alerts for key metrics
- Comparative analysis (YoY, MoM)
- Predictive analytics (trend forecasting)

---

## Feature 1: Customer Analytics Dashboard

### Overview:
Deep analysis of customer relationships, profitability, and behavior patterns.

### Components:

#### 1.1 Customer Profitability Analysis
- **Top Customers by Revenue** (bar chart, last 12 months)
- **Top Customers by Profit Margin** (who gives best margins)
- **Customer Growth Rate** (% change in order volume)
- **Customer Lifetime Value** (CLV) calculation
- **Customer Churn Analysis** (inactive customers)

#### 1.2 Customer Behavior Metrics
- **Order Frequency** (orders per month per customer)
- **Average Order Value by Customer**
- **Payment Behavior** (average days to pay, % on-time)
- **Order Cancellation Rate by Customer**
- **Preferred Routes/Destinations** per customer

#### 1.3 Customer Segmentation
- **ABC Analysis** (A: top 20%, B: middle 30%, C: bottom 50%)
- **RFM Segmentation** (Recency, Frequency, Monetary)
  - Champions (recent, frequent, high value)
  - Loyal Customers (frequent, good value)
  - At-Risk (was frequent, now declining)
  - Lost Customers (inactive > 90 days)

#### 1.4 Customer Detail View
- Click any customer → Detailed modal with:
  - Full order history (table with filters)
  - Revenue & profit trend chart (12 months)
  - Payment history and aging
  - Top routes used
  - Associated contacts
  - Notes/comments section

### API Endpoints Needed:
```
GET /api/analytics/customers/profitability
GET /api/analytics/customers/behavior
GET /api/analytics/customers/segmentation
GET /api/analytics/customers/:id/details
GET /api/analytics/customers/:id/orders
GET /api/analytics/customers/:id/payment-history
```

### Database Changes:
```javascript
// Add to Order schema
customerSegment: { type: String, enum: ['A', 'B', 'C'] },
rfmScore: { 
  recency: Number,
  frequency: Number, 
  monetary: Number,
  segment: String
},

// Add to Party (customer) schema
analytics: {
  lifetimeValue: Number,
  averageOrderValue: Number,
  totalOrders: Number,
  lastOrderDate: Date,
  paymentScore: Number, // 0-100 based on payment behavior
  churnRisk: { type: String, enum: ['low', 'medium', 'high'] }
}
```

---

## Feature 2: Vehicle Analytics Dashboard

### Overview:
Track fleet performance, utilization, maintenance, and profitability per vehicle.

### Components:

#### 2.1 Fleet Overview Metrics
- **Total Fleet Size** (by type: owned/leased/market)
- **Active vs Idle Vehicles** (real-time status)
- **Average Utilization Rate** (% of days active)
- **Revenue per Vehicle** (which vehicles earn most)
- **Profit per Vehicle** (after deducting costs)
- **Cost per KM** (operating expenses)

#### 2.2 Vehicle Performance Ranking
- **Top Performers** (by revenue, profit, utilization)
- **Underperformers** (low utilization, high costs)
- **Maintenance Due** (vehicles needing service)
- **Age Analysis** (performance vs vehicle age)

#### 2.3 Utilization Patterns
- **Heatmap** (which vehicles used which days)
- **Peak Utilization Days** (demand patterns)
- **Idle Time Analysis** (when and why vehicles sit idle)
- **Multi-trip Efficiency** (vehicles doing >1 trip/day)

#### 2.4 Vehicle Detail View
- Click any vehicle → Detailed modal with:
  - Trip history (all orders)
  - Revenue & profit trend
  - Utilization chart (30-day calendar)
  - Maintenance history
  - Associated drivers
  - Cost breakdown (fuel, maintenance, etc.)

### API Endpoints Needed:
```
GET /api/analytics/fleet/overview
GET /api/analytics/fleet/performance
GET /api/analytics/fleet/utilization
GET /api/analytics/fleet/:id/details
GET /api/analytics/fleet/:id/trips
GET /api/analytics/fleet/:id/costs
```

### Database Changes:
```javascript
// Add to Vehicle schema
analytics: {
  totalTrips: Number,
  totalRevenue: Number,
  totalProfit: Number,
  utilizationRate: Number,
  averageRevenuePerTrip: Number,
  costPerKm: Number,
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  maintenanceCost: Number
}
```

---

## Feature 3: Driver Analytics Dashboard

### Overview:
Measure driver performance, efficiency, and behavior.

### Components:

#### 3.1 Driver Performance Metrics
- **Total Active Drivers**
- **Average Trips per Driver per Month**
- **Revenue per Driver**
- **Efficiency Score** (on-time delivery, no issues)
- **Driver Utilization Rate** (% of working days)

#### 3.2 Driver Rankings
- **Top Performers** (by trips, revenue, efficiency)
- **Most Reliable** (fewest issues, on-time %)
- **Most Utilized** (most trips)
- **Needs Training** (high issue rate)

#### 3.3 Driver Behavior Analysis
- **On-Time Delivery Rate** (%)
- **Issue Rate** (accidents, delays, complaints)
- **Preferred Routes** (which routes does each driver do)
- **Vehicle Preference** (which vehicles does driver use)

#### 3.4 Driver Detail View
- Click any driver → Detailed modal with:
  - Trip history
  - Revenue generated
  - Utilization calendar
  - Performance trend
  - Associated vehicles
  - Issues/complaints log

### API Endpoints Needed:
```
GET /api/analytics/drivers/overview
GET /api/analytics/drivers/performance
GET /api/analytics/drivers/rankings
GET /api/analytics/drivers/:id/details
GET /api/analytics/drivers/:id/trips
```

### Database Changes:
```javascript
// Add to Driver schema
analytics: {
  totalTrips: Number,
  totalRevenue: Number,
  utilizationRate: Number,
  onTimeRate: Number,
  issueRate: Number,
  efficiencyScore: Number,
  preferredRoutes: [String],
  preferredVehicles: [ObjectId]
}
```

---

## Feature 4: Route Analytics Dashboard

### Overview:
Analyze route performance, profitability, and optimization opportunities.

### Components:

#### 4.1 Route Profitability
- **Top Routes by Revenue**
- **Top Routes by Profit Margin**
- **Top Routes by Frequency**
- **Route Utilization Heatmap** (which routes used when)

#### 4.2 Distance & Time Analysis
- **Average Distance per Route**
- **Average Time per Route**
- **Speed Analysis** (actual vs expected)
- **Toll & Fuel Costs per Route**

#### 4.3 Route Optimization Opportunities
- **Underutilized Routes** (low frequency, should we drop?)
- **High-Cost Routes** (expensive to operate)
- **Backhaul Opportunities** (return trips without load)
- **Route Consolidation** (combine similar routes)

#### 4.4 Route Detail View
- Click any route → Detailed modal with:
  - All trips on this route
  - Revenue & profit trend
  - Distance & time stats
  - Vehicles & drivers used
  - Customer patterns
  - Cost breakdown

### API Endpoints Needed:
```
GET /api/analytics/routes/profitability
GET /api/analytics/routes/performance
GET /api/analytics/routes/optimization
GET /api/analytics/routes/:id/details
```

### Database Changes:
```javascript
// Add Route collection (if not exists)
const RouteSchema = new mongoose.Schema({
  origin: String,
  destination: String,
  distance: Number,
  estimatedTime: Number,
  tollCosts: Number,
  analytics: {
    totalTrips: Number,
    totalRevenue: Number,
    totalProfit: Number,
    averageRevenue: Number,
    utilizationRate: Number,
    topCustomers: [ObjectId],
    topVehicles: [ObjectId]
  }
});
```

---

## Feature 5: Performance Optimizations

### 5.1 MongoDB Indexes
**Priority:** HIGH - Do this IMMEDIATELY

```javascript
// Orders
db.orders.createIndex({ account: 1, saleDate: -1 });
db.orders.createIndex({ account: 1, organisation: 1 });
db.orders.createIndex({ account: 1, vehicle: 1 });
db.orders.createIndex({ account: 1, customer: 1 });
db.orders.createIndex({ account: 1, driver: 1 });
db.orders.createIndex({ account: 1, status: 1, saleDate: -1 });

// Invoices
db.invoices.createIndex({ account: 1, paymentStatus: 1 });
db.invoices.createIndex({ account: 1, customer: 1 });
db.invoices.createIndex({ account: 1, dueDate: 1 });

// Vehicles
db.vehicles.createIndex({ account: 1, organisation: 1 });
db.vehicles.createIndex({ account: 1, status: 1 });

// Drivers
db.drivers.createIndex({ account: 1, status: 1 });
```

### 5.2 Redis Caching Layer
**Priority:** MEDIUM

Implement caching for:
- Dashboard metrics (cache for 5 minutes)
- Organisation list (cache for 1 hour)
- Account settings (cache for 1 hour)
- Customer/vehicle/driver lists (cache for 15 minutes)

```javascript
// Example implementation
const redis = require('redis');
const client = redis.createClient();

async function getCachedMetrics(account, period) {
  const cacheKey = `metrics:${account}:${period}`;
  const cached = await client.get(cacheKey);
  
  if (cached) return JSON.parse(cached);
  
  const metrics = await calculateMetrics(account, period);
  await client.setex(cacheKey, 300, JSON.stringify(metrics)); // 5 min TTL
  
  return metrics;
}
```

### 5.3 Background Jobs
**Priority:** MEDIUM

Use a job queue (Bull/Agenda) for:
- Daily aggregation of analytics data
- Nightly calculation of customer segments
- Weekly generation of summary reports
- Monthly trend analysis

### 5.4 Materialized Views
**Priority:** LOW (but high impact)

Create pre-aggregated collections:
```javascript
// daily_metrics collection
{
  account: ObjectId,
  date: Date,
  organisation: ObjectId,
  totalSales: Number,
  totalProfit: Number,
  totalOrders: Number,
  // ... other metrics
}

// customer_analytics collection  
{
  account: ObjectId,
  customer: ObjectId,
  month: Date,
  totalOrders: Number,
  totalRevenue: Number,
  totalProfit: Number,
  rfmScore: { r: Number, f: Number, m: Number }
}
```

Update these via:
- Nightly cron job
- Trigger on order completion
- Manual refresh button

---

## Feature 6: Export & Reporting

### 6.1 PDF Reports
- Monthly summary report
- Customer profitability report
- Fleet performance report
- Custom date range reports

### 6.2 Excel Exports
- All dashboard data exportable
- Detailed transaction logs
- Customer/vehicle/driver master data

### 6.3 Scheduled Reports
- Email weekly summary to stakeholders
- Monthly board reports
- Daily operations snapshot

---

## Implementation Roadmap

### Phase 2A (Week 1-2): Customer Analytics
- [ ] Customer profitability API endpoint
- [ ] Customer behavior API endpoint
- [ ] Customer segmentation (ABC, RFM)
- [ ] Customer analytics dashboard UI
- [ ] Customer detail modal

### Phase 2B (Week 3-4): Fleet & Driver Analytics
- [ ] Fleet overview API endpoints
- [ ] Vehicle performance rankings
- [ ] Driver performance API endpoints
- [ ] Fleet analytics dashboard UI
- [ ] Driver analytics dashboard UI
- [ ] Vehicle & driver detail modals

### Phase 2C (Week 5): Route Analytics
- [ ] Route profitability API endpoint
- [ ] Route optimization analysis
- [ ] Route analytics dashboard UI
- [ ] Route detail modal

### Phase 2D (Week 6): Optimizations
- [ ] Add MongoDB indexes (Day 1!)
- [ ] Implement Redis caching
- [ ] Set up background jobs
- [ ] Create materialized views
- [ ] Query optimization

### Phase 2E (Week 7): Export & Reporting
- [ ] PDF report generation
- [ ] Excel export functionality
- [ ] Scheduled reports
- [ ] Email delivery

---

## Technical Stack Additions

### New Dependencies:
```json
{
  "redis": "^4.6.0",           // Caching layer
  "bull": "^4.12.0",           // Job queue
  "puppeteer": "^21.0.0",      // PDF generation
  "exceljs": "^4.3.0",         // Excel exports
  "nodemailer": "^6.9.0",      // Email delivery
  "date-fns": "^2.30.0"        // Better date handling (optional)
}
```

### Infrastructure:
- Redis instance (for caching)
- Scheduled task runner (cron jobs or AWS EventBridge)
- Email service (SendGrid/AWS SES)
- PDF storage (S3 or local filesystem)

---

## Success Metrics

### Phase 2 Completion Criteria:
- ✅ All 4 analytics dashboards functional
- ✅ API response time < 1 second (with caching)
- ✅ MongoDB indexes deployed
- ✅ Caching layer operational
- ✅ Export functionality working
- ✅ 90% test coverage on new APIs
- ✅ No critical bugs
- ✅ Performance improved by 50%+

### User Adoption Metrics:
- % of users accessing new dashboards
- Average time spent on analytics pages
- Export feature usage rate
- Report request satisfaction score

---

## Risks & Mitigation

### Risk 1: Performance Degradation
**Risk:** New features may slow down existing functionality  
**Mitigation:**
- Implement caching from day 1
- Add indexes before building new features
- Use pagination for large datasets
- Load test with realistic data volumes

### Risk 2: Data Accuracy
**Risk:** Complex analytics calculations may have bugs  
**Mitigation:**
- Extensive unit tests for calculations
- Manual verification with sample data
- A/B testing (compare old vs new calculations)
- Gradual rollout with monitoring

### Risk 3: Scope Creep
**Risk:** Customers may request many custom analytics  
**Mitigation:**
- Clear feature list and boundaries
- Custom analytics as Phase 3
- Template-based reporting system
- Self-service query builder (future)

---

## Questions to Resolve Before Phase 2

1. **Priority:** Which feature should we build first?
   - Customer analytics? (most requested)
   - Fleet analytics? (high impact)
   - Optimizations? (technical debt)

2. **Data Volume:** How many records do we expect?
   - Orders per month: __________
   - Vehicles in fleet: __________
   - Active customers: __________
   - This affects optimization strategy

3. **Reporting Requirements:** Who needs reports?
   - Management? (PDF summaries)
   - Operations? (Excel raw data)
   - Finance? (Accounting integration)

4. **Budget:** Do we have budget for:
   - Redis instance? ($ XX/month)
   - SendGrid/SES? ($ XX/month)
   - Developer time? (X weeks)

---

## Recommended Phase 2 Start

**Immediate Actions (Do Now):**
1. Add MongoDB indexes (15 minutes, HIGH IMPACT)
2. Review Phase 1 in production with real users
3. Gather feedback on what analytics are most valuable
4. Prioritize Phase 2 features based on user feedback

**Before Starting Phase 2:**
1. Ensure Phase 1 is stable in production
2. Document any issues found in production
3. Get stakeholder sign-off on Phase 2 scope
4. Allocate team resources

**Suggested Start Date:** 2-4 weeks after Phase 1 production deployment

---

## Conclusion

Phase 1 provided a solid foundation. Phase 2 will deliver deep insights that drive business decisions. Focus on customer and fleet analytics first (highest ROI), then optimize performance, then add reporting capabilities.

**Estimated Timeline:** 7 weeks  
**Estimated Effort:** 280-350 hours (1-2 developers)  
**Business Value:** High - actionable insights, better decision-making, increased efficiency
