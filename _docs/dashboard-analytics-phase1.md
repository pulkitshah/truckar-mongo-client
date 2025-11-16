# Phase 1: Foundation - Enhanced Metrics & Core Dashboards

**Timeline:** Week 1-2  
**Goal:** Establish comprehensive KPI framework and improve existing dashboard components  
**Status:** 📋 Planning

---

## Overview

Phase 1 focuses on building the foundation for the analytics dashboard by implementing:
1. Multi-organization context switching
2. Enhanced financial metrics with detailed breakdowns
3. Operational health monitoring
4. Document compliance tracking
5. Outstanding invoice management

---

## 1.1 Multi-Organization Context Switcher

### Purpose
Allow users with multiple organizations to:
- View data for individual organizations
- Compare data across all organizations (combined view)
- Seamlessly switch between organizational contexts

### Current State Analysis

**User Data Structure** (from `src/contexts/jwt-context.js`):
```javascript
user: {
  _id: ObjectId,
  email: String,
  name: String,
  accounts: [
    {
      account: ObjectId,  // Reference to Account collection
      role: String        // "admin" | "user"
    }
  ]
}
```

**Current Account Selection:**
```javascript
// Currently uses first account by default
const currentAccount = user?.accounts?.[0]?.account
```

**Data Isolation:**
- All API queries filter by `account` field
- Organizations belong to accounts via `organisation.account`
- No UI currently exists to switch between accounts

### Implementation Requirements

#### 1.1.1 Frontend Components

**A. Organization Selector Component**
- **File:** `src/components/dashboard/OrganizationSelector.js`
- **Location:** Dashboard page header (top-right, before Reports button)

**Component Structure:**
```javascript
import { useState } from 'react';
import { Box, Tabs, Tab, Menu, MenuItem, Button, Chip } from '@mui/material';
import { ChevronDown as ChevronDownIcon } from 'icons/chevron-down';

const OrganizationSelector = ({ 
  organizations,      // Array of user's organizations
  selectedOrgId,      // Current selected org ID (null for "All")
  onSelectOrg         // Callback when org changes
}) => {
  // Implementation details below
};
```

**Features:**
- Dropdown/Menu showing all user organizations
- "All Organizations" option at top (default)
- Display organization name and icon
- Show active selection with highlighted state
- Mobile-responsive (collapse to icon on small screens)

**Visual Design:**
```
┌─────────────────────────────────┐
│ 🏢 All Organizations ▼          │
├─────────────────────────────────┤
│ ✓ All Organizations             │
│   Truckar Logistics Pvt Ltd     │
│   ABC Transport Co              │
│   XYZ Freight Services          │
└─────────────────────────────────┘
```

**State Management:**
```javascript
// Add to src/slices/dashboardSlice.js
{
  selectedOrganization: null,  // null = all orgs, ObjectId = specific org
  organizations: [],            // List of user's organizations
  organizationFilter: {
    account: String,
    organization: String | null
  }
}
```

**Redux Actions:**
```javascript
// src/slices/dashboardSlice.js
setSelectedOrganization(state, action) {
  state.selectedOrganization = action.payload; // null or org._id
}

setOrganizations(state, action) {
  state.organizations = action.payload;
}

// Thunk to fetch organizations
export const fetchUserOrganizations = createAsyncThunk(
  'dashboard/fetchUserOrganizations',
  async (accountId, { rejectWithValue }) => {
    try {
      const response = await organisationApi.getOrganisations({ account: accountId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

**Integration with Dashboard:**
```javascript
// src/pages/dashboard/index.js
import OrganizationSelector from 'components/dashboard/OrganizationSelector';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { selectedOrganization, organizations } = useSelector((state) => state.dashboard);
  
  useEffect(() => {
    // Fetch organizations on mount
    dispatch(fetchUserOrganizations(currentAccount));
  }, [currentAccount]);
  
  const handleOrgChange = (orgId) => {
    dispatch(setSelectedOrganization(orgId));
    // Trigger refresh of all dashboard data
    dispatch(fetchAllDashboardData());
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <OrganizationSelector 
            organizations={organizations}
            selectedOrgId={selectedOrganization}
            onSelectOrg={handleOrgChange}
          />
          <Button>Refresh</Button>
          <Button>Reports</Button>
        </Box>
      </Box>
      {/* Dashboard content */}
    </Box>
  );
};
```

#### 1.1.2 Backend API Enhancement

**Update All Analytics Endpoints:**

**Current Signature:**
```javascript
// Example: /api/analytics/financial-metrics
GET /api/analytics/financial-metrics?account=<accountId>&startDate=<date>&endDate=<date>
```

**Enhanced Signature:**
```javascript
// Add optional organization filter
GET /api/analytics/financial-metrics?account=<accountId>&organization=<orgId>&startDate=<date>&endDate=<date>

// If organization is null/undefined, return combined data across all orgs
// If organization is provided, filter by that specific org
```

**MongoDB Query Modification:**

**Before:**
```javascript
const matchStage = {
  $match: {
    account: req.query.account,
    saleDate: { $gte: startDate, $lte: endDate }
  }
};
```

**After:**
```javascript
const matchStage = {
  $match: {
    account: req.query.account,
    saleDate: { $gte: startDate, $lte: endDate }
  }
};

// Add organization filter if provided
if (req.query.organization) {
  // Orders don't directly have organization field
  // Need to join through delivery.lr.organisation
  // OR filter vehicles/drivers by organisation
  
  // Approach 1: Add organisation field to Order model (recommended)
  matchStage.$match.organisation = req.query.organization;
  
  // Approach 2: Use $lookup to join and filter (performance impact)
  // Implemented in aggregation pipeline
}
```

**Files to Update:**
- `src/api/analytics-api.js` (add organization param to all API calls)
- `src/pages/api/analytics/financial-metrics.js`
- `src/pages/api/analytics/top-customers.js`
- `src/pages/api/analytics/top-transporters.js`
- `src/pages/api/analytics/revenue-trend.js`
- `src/pages/api/analytics/operational-metrics.js`
- `src/pages/api/analytics/pending-actions.js`
- All other analytics endpoints

#### 1.1.3 Data Model Consideration

**Challenge:** Order model doesn't have direct `organisation` reference

**Current Relationships:**
```
Order → Vehicle → Organisation
Order → Driver → Organisation
Order → Delivery → LR → Organisation
```

**Solution Options:**

**Option A: Add organisation field to Order (Recommended)**
```javascript
// In Order model
organisation: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Organisation'
}

// Populate on order creation from vehicle.organisation or driver.organisation
```

**Option B: Derive organisation in queries**
```javascript
// Use aggregation pipeline
[
  {
    $lookup: {
      from: 'vehicles',
      localField: 'vehicle',
      foreignField: '_id',
      as: 'vehicleData'
    }
  },
  {
    $match: {
      'vehicleData.organisation': req.query.organization
    }
  }
]
```

**Recommendation:** Implement Option A for better performance. Add migration script to populate organisation field for existing orders.

#### 1.1.4 Migration Script

**File:** `src/scripts/add-organisation-to-orders.js`

```javascript
// Script to add organisation field to existing orders
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');

async function migrateOrders() {
  const orders = await Order.find({ organisation: { $exists: false } })
    .populate('vehicle');
  
  for (const order of orders) {
    if (order.vehicle && order.vehicle.organisation) {
      order.organisation = order.vehicle.organisation;
      await order.save();
    }
  }
  
  console.log(`Migrated ${orders.length} orders`);
}
```

---

## 1.2 Enhanced Financial Metrics Dashboard

### Purpose
Provide comprehensive financial KPIs with detailed breakdowns, trends, and comparisons

### Current State Analysis

**Existing Component:** `src/components/dashboard/FinancialMetricsCardsEnhanced.js`

**Current Metrics Displayed:**
1. Total Sales (with trend indicator)
2. Active Orders (with trend)
3. Total Profit (with trend)
4. Profit Margin % (with trend)

**Current Data Source:**
```javascript
// src/pages/api/analytics/financial-metrics.js
GET /api/analytics/financial-metrics
Returns: {
  totalSales: Number,
  totalProfit: Number,
  profitMargin: Number,
  activeOrders: Number,
  previousTotalSales: Number,
  previousTotalProfit: Number,
  previousProfitMargin: Number,
  previousActiveOrders: Number,
  trend: Array // 30-day sparkline data
}
```

**Gaps Identified:**
- No breakdown of sales components (base + LR + invoice charges)
- No expense visibility
- No profit per order average
- No expense ratio tracking
- Limited previous period comparison
- No target tracking implementation

### Implementation Requirements

#### 1.2.1 Enhanced Metric Cards

**New Metrics to Add:**

**Card 1: Total Sales (Enhanced)**
```javascript
{
  label: "Total Sales",
  value: "₹33.23L",
  change: "-9.51%",
  trend: "down",
  previousPeriod: "₹36.7L last period",
  sparklineData: [...],  // 30-day trend
  target: {
    value: "₹40L",
    progress: 83,  // percentage
    label: "Monthly Target"
  },
  breakdown: {
    baseSales: "₹28.5L (85.7%)",
    lrCharges: "₹3.2L (9.6%)",
    invoiceCharges: "₹1.53L (4.6%)"
  }
}
```

**Card 2: Total Profit (Enhanced)**
```javascript
{
  label: "Total Profit",
  value: "₹7.24L",
  change: "+6.02%",
  trend: "up",
  previousPeriod: "₹6.83L last period",
  sparklineData: [...],
  target: {
    value: "₹8L",
    progress: 90.5,
    label: "Monthly Target"
  },
  breakdown: {
    profitPerOrder: "₹9,050",
    profitPerDelivery: "₹8,420",
    marginTrend: "21.8% → 21.8% (stable)"
  }
}
```

**Card 3: Active Orders (Enhanced)**
```javascript
{
  label: "Active Orders",
  value: "80",
  change: "-10.11%",
  trend: "down",
  previousPeriod: "89 last period",
  sparklineData: [...],
  target: {
    value: "104",
    progress: 77,
    label: "Target"
  },
  breakdown: {
    pending: "12 (15%)",
    inTransit: "45 (56%)",
    delivered: "23 (29%)"
  }
}
```

**Card 4: Profit Margin (Existing - No Change)**
```javascript
{
  label: "Profit Margin",
  value: "21.8%",
  change: "+1.08%",
  trend: "up",
  previousPeriod: "20.7% last period",
  sparklineData: [...]
}
```

**Card 5: Average Order Value (New)**
```javascript
{
  label: "Average Order Value",
  value: "₹41,537",
  change: "+2.5%",
  trend: "up",
  previousPeriod: "₹40,525 last period",
  sparklineData: [...],
  breakdown: {
    byQuantity: "₹2,850 per unit avg",
    byCustomerType: "Enterprise: ₹65K, SMB: ₹28K"
  }
}
```

**Card 6: Expense Ratio (New)**
```javascript
{
  label: "Expense Ratio",
  value: "12.5%",
  change: "-1.2%",
  trend: "down",  // Lower is better
  previousPeriod: "13.7% last period",
  sparklineData: [...],
  target: {
    value: "15%",
    progress: 83,  // % below target (good)
    label: "Max Threshold"
  },
  breakdown: {
    totalExpenses: "₹4.15L",
    expensePerOrder: "₹5,187",
    vsRevenue: "12.5% of sales"
  }
}
```

#### 1.2.2 Backend API Enhancement

**Endpoint:** `GET /api/analytics/financial-metrics`

**Enhanced Response Structure:**
```javascript
{
  // Existing fields
  totalSales: Number,
  totalProfit: Number,
  profitMargin: Number,
  activeOrders: Number,
  previousTotalSales: Number,
  previousTotalProfit: Number,
  previousProfitMargin: Number,
  previousActiveOrders: Number,
  
  // New fields
  totalExpenses: Number,
  expenseRatio: Number,  // expenses / sales * 100
  previousExpenseRatio: Number,
  
  averageOrderValue: Number,
  previousAverageOrderValue: Number,
  
  profitPerOrder: Number,
  profitPerDelivery: Number,
  
  // Sales breakdown
  salesBreakdown: {
    baseSales: Number,
    baseSalesPercentage: Number,
    lrCharges: Number,
    lrChargesPercentage: Number,
    invoiceCharges: Number,
    invoiceChargesPercentage: Number
  },
  
  // Order status breakdown
  orderStatusBreakdown: {
    pending: Number,
    inTransit: Number,
    delivered: Number,
    total: Number
  },
  
  // Trend data (30-day sparklines)
  trends: {
    sales: Array,      // Daily sales for last 30 days
    profit: Array,     // Daily profit
    orders: Array,     // Daily order count
    margin: Array,     // Daily margin %
    expenses: Array    // Daily expenses
  },
  
  // Targets (placeholder - to be implemented in settings)
  targets: {
    monthlySales: Number || null,
    monthlyProfit: Number || null,
    monthlyOrders: Number || null,
    maxExpenseRatio: Number || null
  }
}
```

**Implementation Logic:**

**File:** `src/pages/api/analytics/financial-metrics.js`

```javascript
import { connectToDatabase } from 'lib/mongodb';
import { calculateOrderFinancials } from 'helper/orderCalculations';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { account, organization, startDate, endDate } = req.query;
  
  // Calculate previous period dates
  const currentPeriodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - currentPeriodDays);
  const previousEndDate = new Date(startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  
  const { db } = await connectToDatabase();
  
  // Build match filter
  const matchFilter = { account };
  if (organization) matchFilter.organisation = organization;
  
  // Current period aggregation
  const currentMetrics = await db.collection('orders').aggregate([
    {
      $match: {
        ...matchFilter,
        saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $addFields: {
        financials: {
          $function: {
            body: calculateOrderFinancials.toString(),
            args: ['$$ROOT'],
            lang: 'js'
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$financials.totalSales' },
        totalPurchase: { $sum: '$financials.totalPurchase' },
        totalExpenses: { $sum: '$financials.totalExpenses' },
        totalProfit: { $sum: '$financials.totalProfit' },
        baseSales: { $sum: '$financials.baseSales' },
        lrCharges: { $sum: '$financials.lrCharges' },
        invoiceCharges: { $sum: '$financials.invoiceCharges' },
        orderCount: { $sum: 1 },
        deliveryCount: { $sum: { $size: '$deliveries' } }
      }
    }
  ]).toArray();
  
  // Previous period aggregation (same logic with different date range)
  const previousMetrics = await db.collection('orders').aggregate([
    // Same pipeline with previousStartDate/previousEndDate
  ]).toArray();
  
  // Order status breakdown (requires status field - use placeholder if not available)
  const orderStatusBreakdown = await db.collection('orders').aggregate([
    {
      $match: {
        ...matchFilter,
        saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: '$status',  // Assumes status field exists
        count: { $sum: 1 }
      }
    }
  ]).toArray();
  
  // Trend data (30-day daily aggregation)
  const trendData = await db.collection('orders').aggregate([
    {
      $match: {
        ...matchFilter,
        saleDate: { 
          $gte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() - 30)),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $addFields: {
        financials: { /* same as above */ }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
        sales: { $sum: '$financials.totalSales' },
        profit: { $sum: '$financials.totalProfit' },
        expenses: { $sum: '$financials.totalExpenses' },
        orders: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]).toArray();
  
  // Calculate derived metrics
  const current = currentMetrics[0] || {};
  const previous = previousMetrics[0] || {};
  
  const response = {
    totalSales: current.totalSales || 0,
    totalProfit: current.totalProfit || 0,
    profitMargin: current.totalSales ? (current.totalProfit / current.totalSales * 100) : 0,
    activeOrders: current.orderCount || 0,
    totalExpenses: current.totalExpenses || 0,
    expenseRatio: current.totalSales ? (current.totalExpenses / current.totalSales * 100) : 0,
    averageOrderValue: current.orderCount ? (current.totalSales / current.orderCount) : 0,
    profitPerOrder: current.orderCount ? (current.totalProfit / current.orderCount) : 0,
    profitPerDelivery: current.deliveryCount ? (current.totalProfit / current.deliveryCount) : 0,
    
    // Previous period
    previousTotalSales: previous.totalSales || 0,
    previousTotalProfit: previous.totalProfit || 0,
    previousProfitMargin: previous.totalSales ? (previous.totalProfit / previous.totalSales * 100) : 0,
    previousActiveOrders: previous.orderCount || 0,
    previousExpenseRatio: previous.totalSales ? (previous.totalExpenses / previous.totalSales * 100) : 0,
    previousAverageOrderValue: previous.orderCount ? (previous.totalSales / previous.orderCount) : 0,
    
    // Breakdown
    salesBreakdown: {
      baseSales: current.baseSales || 0,
      baseSalesPercentage: current.totalSales ? (current.baseSales / current.totalSales * 100) : 0,
      lrCharges: current.lrCharges || 0,
      lrChargesPercentage: current.totalSales ? (current.lrCharges / current.totalSales * 100) : 0,
      invoiceCharges: current.invoiceCharges || 0,
      invoiceChargesPercentage: current.totalSales ? (current.invoiceCharges / current.totalSales * 100) : 0
    },
    
    orderStatusBreakdown: {
      pending: orderStatusBreakdown.find(s => s._id === 'pending')?.count || 0,
      inTransit: orderStatusBreakdown.find(s => s._id === 'in-transit')?.count || 0,
      delivered: orderStatusBreakdown.find(s => s._id === 'delivered')?.count || 0,
      total: current.orderCount || 0
    },
    
    trends: {
      sales: trendData.map(d => ({ date: d._id, value: d.sales })),
      profit: trendData.map(d => ({ date: d._id, value: d.profit })),
      orders: trendData.map(d => ({ date: d._id, value: d.orders })),
      margin: trendData.map(d => ({ 
        date: d._id, 
        value: d.sales ? (d.profit / d.sales * 100) : 0 
      })),
      expenses: trendData.map(d => ({ date: d._id, value: d.expenses }))
    },
    
    // Targets - fetch from settings (to be implemented)
    targets: {
      monthlySales: null,
      monthlyProfit: null,
      monthlyOrders: null,
      maxExpenseRatio: 15  // Default threshold
    }
  };
  
  return res.status(200).json(response);
}
```

#### 1.2.3 Component Enhancement

**File:** `src/components/dashboard/FinancialMetricsCardsEnhanced.js`

**Key Changes:**
1. Update to display 6 cards instead of 4
2. Add breakdown display (expandable section or tooltip)
3. Update target progress bars to use actual target data
4. Add color coding for expense ratio (green if below target)
5. Improve responsive layout (2x3 grid on desktop, 1 column on mobile)

**Component Structure:**
```javascript
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import { TrendingUp, TrendingDown, InfoOutlined } from '@mui/icons-material';
import { Chart } from 'components/chart';

const MetricCard = ({ 
  label, 
  value, 
  change, 
  trend, 
  previousPeriod,
  sparklineData,
  target,
  breakdown,
  showBreakdown = false
}) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card>
      <CardContent>
        {/* Metric header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
          {breakdown && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              <InfoOutlined fontSize="small" />
            </IconButton>
          )}
        </Box>
        
        {/* Main value */}
        <Typography variant="h4" sx={{ mb: 1 }}>
          {value}
        </Typography>
        
        {/* Trend indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {trend === 'up' ? (
            <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
          ) : (
            <TrendingDown sx={{ color: 'error.main', mr: 0.5 }} />
          )}
          <Typography 
            variant="body2" 
            color={trend === 'up' ? 'success.main' : 'error.main'}
          >
            {change}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {previousPeriod}
          </Typography>
        </Box>
        
        {/* Sparkline chart */}
        {sparklineData && (
          <Box sx={{ height: 60, mb: 2 }}>
            <Chart
              type="area"
              series={[{ data: sparklineData }]}
              options={{
                chart: { sparkline: { enabled: true } },
                stroke: { width: 2 },
                fill: { opacity: 0.2 }
              }}
            />
          </Box>
        )}
        
        {/* Target progress */}
        {target && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {target.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {target.progress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={target.progress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
        
        {/* Breakdown (collapsible) */}
        {breakdown && (
          <Collapse in={expanded}>
            <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
              {Object.entries(breakdown).map(([key, value]) => (
                <Box 
                  key={key} 
                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                  <Typography variant="caption">
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
};

const FinancialMetricsCardsEnhanced = () => {
  const { financialMetrics, loading } = useSelector((state) => state.dashboard);
  
  const metrics = [
    {
      label: 'Total Sales',
      value: formatCurrency(financialMetrics.totalSales),
      change: calculateChange(financialMetrics.totalSales, financialMetrics.previousTotalSales),
      trend: getTrend(financialMetrics.totalSales, financialMetrics.previousTotalSales),
      previousPeriod: `${formatCurrency(financialMetrics.previousTotalSales)} last period`,
      sparklineData: financialMetrics.trends?.sales.map(d => d.value),
      target: financialMetrics.targets?.monthlySales ? {
        value: formatCurrency(financialMetrics.targets.monthlySales),
        progress: (financialMetrics.totalSales / financialMetrics.targets.monthlySales * 100).toFixed(1),
        label: 'Monthly Target'
      } : null,
      breakdown: {
        'Base Sales': `${formatCurrency(financialMetrics.salesBreakdown?.baseSales)} (${financialMetrics.salesBreakdown?.baseSalesPercentage.toFixed(1)}%)`,
        'LR Charges': `${formatCurrency(financialMetrics.salesBreakdown?.lrCharges)} (${financialMetrics.salesBreakdown?.lrChargesPercentage.toFixed(1)}%)`,
        'Invoice Charges': `${formatCurrency(financialMetrics.salesBreakdown?.invoiceCharges)} (${financialMetrics.salesBreakdown?.invoiceChargesPercentage.toFixed(1)}%)`
      }
    },
    // ... other metrics
  ];
  
  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
      gap: 3,
      mb: 4
    }}>
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </Box>
  );
};
```

**Helper Functions:**
```javascript
// src/utils/formatters.js

export const formatCurrency = (amount, inLakhs = true) => {
  if (!amount) return '₹0';
  
  if (inLakhs && amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const calculateChange = (current, previous) => {
  if (!previous) return '+0%';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

export const getTrend = (current, previous) => {
  return current >= previous ? 'up' : 'down';
};
```

---

## 1.3 Operational Health Dashboard

### Purpose
Monitor day-to-day operational metrics to identify issues and inefficiencies

### Implementation Requirements

#### 1.3.1 Component Structure

**File:** `src/components/dashboard/OperationalHealthDashboard.js`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Operational Health                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Doc Complete │  │ Fleet        │  │ Driver       │      │
│  │ Rate         │  │ Utilization  │  │ Activity     │      │
│  │              │  │              │  │              │      │
│  │   85%        │  │   72%        │  │   45         │      │
│  │   ▼ -3%      │  │   ▲ +5%      │  │ Active       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│ ⚠ Pending Actions (3 issues require attention)              │
├─────────────────────────────────────────────────────────────┤
│ 📋 5 Orders Pending LR Generation                           │
│    • ABC Corp - 2 orders (8 days pending)                   │
│    • XYZ Ltd - 3 orders (5 days pending)                    │
│    [View All →]                                             │
├─────────────────────────────────────────────────────────────┤
│ 📄 12 LRs Pending Invoice Generation                        │
│    • ABC Corp - ₹2.5L (15 days)                             │
│    • DEF Inc - ₹1.8L (10 days)                              │
│    [View All →]                                             │
├─────────────────────────────────────────────────────────────┤
│ 💰 Outstanding Invoices: ₹15.8L                             │
│    • 0-30 days: ₹8.2L (52%)                                 │
│    • 30-60 days: ₹4.5L (28%)                                │
│    • 60-90 days: ₹2.1L (13%)                                │
│    • 90+ days: ₹1.0L (6%) ⚠                                 │
│    [View Details →]                                         │
└─────────────────────────────────────────────────────────────┘
```

#### 1.3.2 Backend API Endpoint

**Endpoint:** `GET /api/analytics/operational-health`

**Response Structure:**
```javascript
{
  documentCompletion: {
    lrGenerationRate: 85,  // % of orders with LRs
    invoiceGenerationRate: 78,  // % of LRs with invoices
    previousLrRate: 88,
    previousInvoiceRate: 75
  },
  
  fleetUtilization: {
    totalVehicles: 50,
    activeVehicles: 36,  // Vehicles with orders in period
    utilizationRate: 72,  // %
    previousUtilizationRate: 67
  },
  
  driverActivity: {
    totalDrivers: 60,
    activeDrivers: 45,  // Drivers with orders in period
    averageDeliveriesPerDriver: 12,
    previousActiveDrivers: 42
  },
  
  pendingActions: {
    pendingLRs: {
      count: 5,
      orders: [
        {
          orderId: 'ORD-123',
          orderNumber: 'TL/2024/123',
          customer: { _id, name },
          deliveryDate: '2024-11-08',
          daysPending: 8,
          billQuantity: 150,
          vehicle: { registrationNumber }
        }
      ],
      byCustomer: [
        { customer: { _id, name }, count: 2, oldestDays: 8 },
        { customer: { _id, name }, count: 3, oldestDays: 5 }
      ]
    },
    
    pendingInvoices: {
      count: 12,
      lrs: [
        {
          orderId: 'ORD-124',
          lrNumber: 'LR-456',
          lrDate: '2024-10-30',
          daysPending: 15,
          customer: { _id, name },
          amount: 250000
        }
      ],
      byCustomer: [
        { customer: { _id, name }, count: 5, totalAmount: 250000, oldestDays: 15 },
        { customer: { _id, name }, count: 7, totalAmount: 180000, oldestDays: 10 }
      ]
    },
    
    outstandingInvoices: {
      totalAmount: 1580000,
      aging: {
        '0-30': { amount: 820000, percentage: 52 },
        '30-60': { amount: 450000, percentage: 28 },
        '60-90': { amount: 210000, percentage: 13 },
        '90+': { amount: 100000, percentage: 6 }
      },
      byCustomer: [
        {
          customer: { _id, name },
          totalOutstanding: 350000,
          invoiceCount: 5,
          oldestInvoiceAge: 45
        }
      ]
    }
  }
}
```

**Implementation:**

**File:** `src/pages/api/analytics/operational-health.js`

```javascript
export default async function handler(req, res) {
  const { account, organization, startDate, endDate } = req.query;
  const { db } = await connectToDatabase();
  
  const matchFilter = { account };
  if (organization) matchFilter.organisation = organization;
  
  // 1. Document Completion Rates
  const documentCompletion = await db.collection('orders').aggregate([
    {
      $match: {
        ...matchFilter,
        saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $project: {
        hasLR: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$deliveries',
                  as: 'delivery',
                  cond: { $ne: ['$$delivery.lr', null] }
                }
              }
            },
            0
          ]
        },
        deliveryCount: { $size: '$deliveries' },
        deliveriesWithLR: {
          $size: {
            $filter: {
              input: '$deliveries',
              as: 'delivery',
              cond: { $ne: ['$$delivery.lr', null] }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        ordersWithLR: { $sum: { $cond: ['$hasLR', 1, 0] } },
        totalDeliveries: { $sum: '$deliveryCount' },
        deliveriesWithLR: { $sum: '$deliveriesWithLR' }
      }
    }
  ]).toArray();
  
  // 2. Pending LRs
  const pendingLRs = await db.collection('orders').aggregate([
    {
      $match: {
        ...matchFilter,
        saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $unwind: '$deliveries'
    },
    {
      $match: {
        'deliveries.lr': null  // No LR generated
      }
    },
    {
      $lookup: {
        from: 'parties',
        localField: 'party',
        foreignField: '_id',
        as: 'customerData'
      }
    },
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicle',
        foreignField: '_id',
        as: 'vehicleData'
      }
    },
    {
      $project: {
        orderId: '$_id',
        orderNumber: '$orderNo',
        customer: { $arrayElemAt: ['$customerData', 0] },
        deliveryDate: '$deliveries.unloading.date',
        billQuantity: '$deliveries.billQuantity',
        vehicle: { $arrayElemAt: ['$vehicleData', 0] },
        daysPending: {
          $divide: [
            { $subtract: [new Date(), '$deliveries.unloading.date'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $sort: { daysPending: -1 }
    }
  ]).toArray();
  
  // Group pending LRs by customer
  const pendingLRsByCustomer = await db.collection('orders').aggregate([
    // Similar to above but grouped by customer
  ]).toArray();
  
  // 3. Fleet Utilization
  const fleetStats = await db.collection('vehicles').aggregate([
    {
      $match: {
        account,
        ...(organization && { organisation: organization })
      }
    },
    {
      $lookup: {
        from: 'orders',
        let: { vehicleId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$vehicle', '$$vehicleId'] },
              saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }
          }
        ],
        as: 'orders'
      }
    },
    {
      $group: {
        _id: null,
        totalVehicles: { $sum: 1 },
        activeVehicles: {
          $sum: {
            $cond: [{ $gt: [{ $size: '$orders' }, 0] }, 1, 0]
          }
        }
      }
    }
  ]).toArray();
  
  // 4. Driver Activity (similar pattern)
  // 5. Pending Invoices (similar to pending LRs)
  // 6. Outstanding Invoices (requires invoice collection query)
  
  // Combine all results
  const response = {
    documentCompletion: {
      lrGenerationRate: documentCompletion[0] 
        ? (documentCompletion[0].ordersWithLR / documentCompletion[0].totalOrders * 100) 
        : 0,
      // ... other fields
    },
    fleetUtilization: {
      totalVehicles: fleetStats[0]?.totalVehicles || 0,
      activeVehicles: fleetStats[0]?.activeVehicles || 0,
      utilizationRate: fleetStats[0]
        ? (fleetStats[0].activeVehicles / fleetStats[0].totalVehicles * 100)
        : 0
    },
    pendingActions: {
      pendingLRs: {
        count: pendingLRs.length,
        orders: pendingLRs.slice(0, 10),  // Top 10
        byCustomer: pendingLRsByCustomer
      },
      // ... other pending actions
    }
  };
  
  return res.status(200).json(response);
}
```

#### 1.3.3 Component Implementation

**File:** `src/components/dashboard/OperationalHealthDashboard.js`

```javascript
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Alert,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Collapse,
  IconButton
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const OperationalHealthDashboard = () => {
  const dispatch = useDispatch();
  const { operationalHealth, loading } = useSelector((state) => state.dashboard);
  const [expandedSection, setExpandedSection] = useState(null);
  
  useEffect(() => {
    dispatch(fetchOperationalHealth());
  }, []);
  
  const handleViewDetails = (section) => {
    // Navigate to detailed view or expand inline
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  return (
    <Box>
      {/* KPI Cards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3
      }}>
        {/* Document Completion Rate Card */}
        <Card>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Document Completion Rate
            </Typography>
            <Typography variant="h3" sx={{ my: 2 }}>
              {operationalHealth.documentCompletion?.lrGenerationRate.toFixed(0)}%
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {operationalHealth.documentCompletion?.lrGenerationRate >= 80 ? (
                <CheckCircleIcon sx={{ color: 'success.main' }} />
              ) : (
                <WarningIcon sx={{ color: 'warning.main' }} />
              )}
              <Typography variant="body2" color="text.secondary">
                LR Generation Rate
              </Typography>
            </Box>
          </CardContent>
        </Card>
        
        {/* Fleet Utilization Card */}
        <Card>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Fleet Utilization
            </Typography>
            <Typography variant="h3" sx={{ my: 2 }}>
              {operationalHealth.fleetUtilization?.utilizationRate.toFixed(0)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {operationalHealth.fleetUtilization?.activeVehicles} of {operationalHealth.fleetUtilization?.totalVehicles} vehicles active
            </Typography>
          </CardContent>
        </Card>
        
        {/* Driver Activity Card */}
        <Card>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Active Drivers
            </Typography>
            <Typography variant="h3" sx={{ my: 2 }}>
              {operationalHealth.driverActivity?.activeDrivers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg {operationalHealth.driverActivity?.averageDeliveriesPerDriver.toFixed(1)} deliveries/driver
            </Typography>
          </CardContent>
        </Card>
      </Box>
      
      {/* Pending Actions Alert */}
      {(operationalHealth.pendingActions?.pendingLRs.count > 0 || 
        operationalHealth.pendingActions?.pendingInvoices.count > 0) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            {operationalHealth.pendingActions.pendingLRs.count + 
             operationalHealth.pendingActions.pendingInvoices.count} pending actions require attention
          </Typography>
        </Alert>
      )}
      
      {/* Pending LRs Section */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                📋 {operationalHealth.pendingActions?.pendingLRs.count} Orders Pending LR Generation
              </Typography>
              {operationalHealth.pendingActions?.pendingLRs.count > 0 && (
                <Chip 
                  label="Action Required" 
                  color="error" 
                  size="small" 
                />
              )}
            </Box>
            <IconButton onClick={() => handleViewDetails('pendingLRs')}>
              <ExpandMoreIcon 
                sx={{
                  transform: expandedSection === 'pendingLRs' ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.3s'
                }}
              />
            </IconButton>
          </Box>
          
          <Collapse in={expandedSection === 'pendingLRs'}>
            <Box sx={{ mt: 2 }}>
              {/* Group by customer */}
              {operationalHealth.pendingActions?.pendingLRs.byCustomer.map((item) => (
                <Box key={item.customer._id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    {item.customer.name} - {item.count} orders ({item.oldestDays} days)
                  </Typography>
                </Box>
              ))}
              
              <Button 
                variant="contained" 
                size="small"
                onClick={() => {/* Navigate to LR generation page */}}
              >
                Generate LRs
              </Button>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
      
      {/* Pending Invoices Section */}
      {/* Similar structure to Pending LRs */}
      
      {/* Outstanding Invoices Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            💰 Outstanding Invoices: {formatCurrency(operationalHealth.pendingActions?.outstandingInvoices.totalAmount)}
          </Typography>
          
          {/* Aging breakdown */}
          <Box sx={{ mb: 2 }}>
            {Object.entries(operationalHealth.pendingActions?.outstandingInvoices.aging || {}).map(([bucket, data]) => (
              <Box key={bucket} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {bucket} days:
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(data.amount)} ({data.percentage}%)
                </Typography>
              </Box>
            ))}
          </Box>
          
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => {/* Navigate to invoice details */}}
          >
            View Details
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OperationalHealthDashboard;
```

---

## Testing & Validation

### 1.4.1 Unit Tests

**Files to create:**
- `src/components/dashboard/__tests__/OrganizationSelector.test.js`
- `src/components/dashboard/__tests__/FinancialMetricsCardsEnhanced.test.js`
- `src/components/dashboard/__tests__/OperationalHealthDashboard.test.js`

### 1.4.2 Integration Tests

**Test scenarios:**
1. Organization switching updates all dashboard data
2. Date range changes refresh metrics correctly
3. Drill-down navigation works from pending actions
4. API responses handle empty data gracefully
5. Loading states display correctly

### 1.4.3 Performance Tests

**Metrics to monitor:**
- API response time for financial-metrics endpoint (<500ms)
- API response time for operational-health endpoint (<1s)
- Dashboard page load time (<3s)
- Organization switch latency (<1s)

---

## Deployment Checklist

### Phase 1 Deliverables

- [ ] Multi-organization context switcher implemented
- [ ] Organization selector added to dashboard header
- [ ] Redux state management for organization filter
- [ ] All analytics APIs support organization parameter
- [ ] Migration script for adding organisation field to orders
- [ ] Enhanced financial metrics API endpoint
- [ ] 6 metric cards displayed with trends and breakdowns
- [ ] Operational health dashboard component
- [ ] Pending LRs tracking and display
- [ ] Pending invoices tracking and display
- [ ] Outstanding invoices aging analysis
- [ ] Fleet utilization metrics
- [ ] Driver activity metrics
- [ ] Unit tests for all new components
- [ ] Integration tests for API endpoints
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Code reviewed and approved

---

## Next Steps

After Phase 1 completion and approval:
1. **Phase 2:** Customer & Transporter Intelligence (Customer scoring, segmentation, transporter analytics)
2. **Phase 3:** Location & Route Analytics (Route profitability, geographic distribution)
3. **Phase 4:** Time-Series & Trend Analysis (Enhanced charts, forecasting)

---

## Schema Analysis & Decisions

Based on examination of the current production schema, here are the confirmed decisions:

### 1. **Order Status Field** ✅ EXISTS
**Current Schema:** Order has `status` field (String, default: "pending")
**Decision:** Use existing field. Standardize values to: "pending", "in-transit", "delivered", "completed"
**Implementation:** No schema change needed. Add validation/enum in future updates (backward compatible)

### 2. **Organisation Reference in Orders** ⚠️ MISSING
**Current Schema:** 
- Order has: `customer`, `vehicle`, `driver`, `account`, `createdBy`
- Vehicle has: `organisation` reference
- Delivery.lr has: `organisation` reference (nested)

**Decision:** Add optional `organisation` field to Order schema (backward compatible)
```javascript
organisation: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "organisation",
  // Optional - will be null for existing orders
}
```
**Migration Strategy:** 
- New orders will populate `organisation` from `vehicle.organisation` on creation
- Existing orders: Derive from vehicle lookup in queries (no data update needed)
- Phase 2: Optional migration script to backfill for performance

### 3. **Target Values Storage** 📊 NEW FEATURE
**Current Schema:** Account has `orderExpensesSettings`, `lrSettings`, `taxOptions`
**Decision:** Add `analyticsSettings` to Account model (backward compatible)
```javascript
analyticsSettings: {
  type: Object,
  default: {
    monthlyTargets: {
      sales: null,
      profit: null,
      orders: null,
      profitMargin: null
    },
    thresholds: {
      maxExpenseRatio: 15,
      minDocumentCompletionRate: 80,
      minFleetUtilization: 70
    },
    alertSettings: {
      outstandingDaysThreshold: 30,
      pendingLRDaysThreshold: 7,
      pendingInvoiceDaysThreshold: 15
    }
  }
}
```

### 4. **Invoice Payment Tracking** ❌ NOT IMPLEMENTED
**Current Schema:** Invoice has: `invoiceNo`, `invoiceDate`, `customer`, `organisation`, `deliveries`, `subtotal`, `taxes`
**Missing:** `paidDate`, `paymentStatus`, `paidAmount`, `outstandingAmount`

**Decision:** Add payment tracking fields to Invoice schema (backward compatible)
```javascript
paymentStatus: {
  type: String,
  enum: ['unpaid', 'partial', 'paid'],
  default: 'unpaid'
},
paidAmount: {
  type: Number,
  default: 0
},
paidDate: {
  type: Date,
  // null for unpaid invoices
},
outstandingAmount: {
  type: Number,
  // Calculated: subtotal - paidAmount
}
```
**Migration:** All existing invoices default to `unpaid`, `paidAmount: 0`

### 5. **Expense Categories** 📝 PARTIALLY IMPLEMENTED
**Current Schema:** `orderExpenses` is Array (no structure defined)
**Account Schema:** Has `orderExpensesSettings` array (likely contains categories)

**Decision:** Enhance orderExpenses array structure (backward compatible)
```javascript
orderExpenses: [
  {
    expenseName: String,
    amount: Number,
    category: {
      type: String,
      enum: ['fuel', 'toll', 'loading', 'unloading', 'detention', 'maintenance', 'permits', 'other'],
      default: 'other'  // For existing records
    },
    date: Date,
    remarks: String
  }
]
```
**Migration:** Existing expenses get `category: 'other'` by default

### 6. **Delivery Status Tracking** ⚠️ PARTIAL
**Current Schema:** Delivery has `status` field (String) - already exists!
**Decision:** Standardize status values: "pending", "loaded", "in-transit", "delivered"
**Implementation:** Use existing field, add validation

### 7. **LR Charges Structure** ✅ EXISTS
**Current Schema:** `delivery.lr.lrCharges` is Object (flexible structure)
**Decision:** Keep as Object for flexibility. Document expected structure in Account.lrSettings

### 8. **Invoice Charges Structure** ✅ EXISTS  
**Current Schema:** `delivery.invoiceCharges` is Array (in both Order.deliveries and Invoice.deliveries)
**Decision:** Keep existing structure. Already supports detailed breakdown.

---

## Implementation Approach Summary

### Backward Compatibility Strategy

**All schema changes are designed to be backward compatible:**

1. **New fields are optional** - Existing documents continue to work without them
2. **Default values provided** - New fields have sensible defaults
3. **Graceful degradation** - Queries handle missing fields gracefully
4. **No data migration required** - Existing data remains untouched
5. **Progressive enhancement** - Features work with partial data

### Schema Changes Required

**File: `src/models/Order.js`**
```javascript
// Add after line 145 (after status field):
organisation: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "organisation",
  // Will be populated from vehicle.organisation for new orders
  // Existing orders will have null - derived in queries
}
```

**File: `src/models/Invoice.js`**
```javascript
// Add after line 45 (after taxes field):
paymentStatus: {
  type: String,
  enum: ['unpaid', 'partial', 'paid'],
  default: 'unpaid'
},
paidAmount: {
  type: Number,
  default: 0
},
paidDate: {
  type: Date
},
dueDate: {
  type: Date
  // Can be calculated as invoiceDate + payment terms
}
```

**File: `src/models/Account.js`**
```javascript
// Add after line 20 (after invoiceFormat field):
analyticsSettings: {
  type: Object,
  default: {
    monthlyTargets: {
      sales: null,
      profit: null,
      orders: null
    },
    thresholds: {
      maxExpenseRatio: 15,
      minDocumentCompletionRate: 80,
      minFleetUtilization: 70,
      outstandingDaysThreshold: 30
    }
  }
}
```

### Query Strategy for Organisation Filter

**For new orders (with organisation field):**
```javascript
const matchFilter = {
  account: accountId,
  saleDate: { $gte: startDate, $lte: endDate }
};

if (organization) {
  matchFilter.organisation = organization;
}
```

**For existing orders (derive from vehicle):**
```javascript
// Use aggregation pipeline
[
  {
    $match: {
      account: accountId,
      saleDate: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $lookup: {
      from: 'vehicles',
      localField: 'vehicle',
      foreignField: '_id',
      as: 'vehicleData'
    }
  },
  {
    $match: organization ? {
      $or: [
        { organisation: organization },  // Direct match for new orders
        { 'vehicleData.organisation': organization }  // Derived for old orders
      ]
    } : {}
  }
]
```

### Population Hook for New Orders

**Add to order creation logic:**
```javascript
// In order creation API/form handler
if (orderData.vehicle && !orderData.organisation) {
  const vehicle = await Vehicle.findById(orderData.vehicle);
  if (vehicle && vehicle.organisation) {
    orderData.organisation = vehicle.organisation;
  }
}
```

---

## Updated Deployment Checklist

### Phase 1 Deliverables

#### Schema Updates
- [ ] Add `organisation` field to Order model (optional)
- [ ] Add `paymentStatus`, `paidAmount`, `paidDate`, `dueDate` to Invoice model
- [ ] Add `analyticsSettings` to Account model
- [ ] Test backward compatibility with existing data
- [ ] Deploy schema changes to production

#### Multi-Organization Features
- [ ] Create `OrganizationSelector` component
- [ ] Add organization state to Redux `dashboardSlice`
- [ ] Implement `fetchUserOrganizations` thunk
- [ ] Update dashboard header with organization selector
- [ ] Test organization switching functionality

#### API Enhancements
- [ ] Add organization parameter to all analytics endpoints
- [ ] Implement hybrid query strategy (direct + derived organisation)
- [ ] Update `financial-metrics` endpoint with enhanced response
- [ ] Create `operational-health` endpoint
- [ ] Add organization filter support to existing endpoints
- [ ] Test API responses with and without organization filter

#### Enhanced Financial Metrics
- [ ] Update `FinancialMetricsCardsEnhanced` component (6 cards)
- [ ] Implement metric card with expandable breakdown
- [ ] Add target progress bars
- [ ] Integrate sales breakdown display
- [ ] Add expense ratio tracking
- [ ] Test with mock data and production data

#### Operational Health Dashboard
- [ ] Create `OperationalHealthDashboard` component
- [ ] Implement document completion rate cards
- [ ] Add fleet utilization metrics
- [ ] Build pending actions alert panel
- [ ] Create collapsible sections for pending LRs/invoices
- [ ] Add outstanding invoices aging display
- [ ] Implement drill-down navigation

#### Frontend Utilities
- [ ] Create `formatCurrency` helper function
- [ ] Create `calculateChange` helper function
- [ ] Create `getTrend` helper function
- [ ] Add date range calculation utilities
- [ ] Test formatters with various inputs

#### Integration & Testing
- [ ] Unit tests for new components
- [ ] Integration tests for API endpoints
- [ ] Test organization filter across all dashboards
- [ ] Test with missing/null organisation values
- [ ] Performance test aggregation queries
- [ ] Test responsive layouts (mobile/tablet/desktop)
- [ ] Cross-browser testing

#### Documentation & Code Quality
- [ ] Update API documentation
- [ ] Add inline code comments
- [ ] Update README with new features
- [ ] Code review and approval
- [ ] Merge to dev branch
- [ ] Deploy to staging environment
- [ ] User acceptance testing
- [ ] Deploy to production

---

## Performance Considerations

### Database Indexes Needed

```javascript
// Order collection
db.orders.createIndex({ account: 1, organisation: 1, saleDate: -1 });
db.orders.createIndex({ account: 1, saleDate: -1 });
db.orders.createIndex({ vehicle: 1 });
db.orders.createIndex({ status: 1, account: 1 });

// Invoice collection
db.invoices.createIndex({ account: 1, paymentStatus: 1 });
db.invoices.createIndex({ invoiceDate: -1, account: 1 });
db.invoices.createIndex({ customer: 1, paymentStatus: 1 });

// Vehicle collection (already has these likely)
db.vehicles.createIndex({ organisation: 1 });
db.vehicles.createIndex({ account: 1 });
```

### Caching Strategy

**Redis cache keys:**
- `dashboard:financial-metrics:{account}:{org}:{dateRange}` - TTL: 5 minutes
- `dashboard:operational-health:{account}:{org}:{dateRange}` - TTL: 5 minutes
- `dashboard:organizations:{account}` - TTL: 1 hour

**Cache invalidation:**
- Clear on new order creation
- Clear on order update
- Clear on invoice payment
- Clear on organization change by user

---

## End of Phase 1 Documentation

**Status:** ✅ Complete and ready for implementation

**Next Steps:**
1. Review and approve Phase 1 documentation
2. Proceed with Phase 2 documentation (Customer & Transporter Intelligence)
3. Begin implementation after all phase documentation is complete

**Estimated Implementation Time:**
- Schema updates: 2-3 hours
- Multi-org selector: 4-6 hours
- Enhanced financial metrics: 8-10 hours
- Operational health dashboard: 8-10 hours
- API enhancements: 6-8 hours
- Testing & bug fixes: 8-10 hours
- **Total: 36-47 hours (5-6 working days)**