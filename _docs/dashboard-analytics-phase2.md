# Phase 2: Customer & Transporter Intelligence

**Timeline:** Week 3-4  
**Goal:** Build comprehensive customer and transporter analytics with scoring, segmentation, and relationship intelligence  
**Status:** 📋 Planning  
**Prerequisites:** Phase 1 completed

---

## Overview

Phase 2 focuses on understanding and optimizing business relationships through:
1. Customer performance analysis and health scoring
2. RFM (Recency, Frequency, Monetary) segmentation
3. Transporter partnership analytics and reliability scoring
4. Detailed drill-down views for relationship management
5. Actionable insights for customer retention and transporter optimization

---

## 2.1 Customer Analytics Dashboard

### Purpose
Provide comprehensive customer intelligence to:
- Identify high-value customers (Champions)
- Detect at-risk customers early
- Segment customers for targeted strategies
- Track customer lifecycle and trends
- Optimize relationship management

### Component Structure

**File:** `src/components/dashboard/CustomerAnalyticsDashboard.js`

### 2.1.1 Customer Performance Matrix (Scatter Chart)

**Visual Representation:**
```
                High Profit
                     ↑
    Stars ⭐     Champions 👑
    (Focus)      (Nurture)
         ┌───────┼───────┐
         │       │       │
         │   ●   │   ●●  │
         │       │  ●●●  │
    ─────┼───────┼───────┼─────→ High Volume
         │       │   ●   │
         │  ●    │       │
         │       │       │
         └───────┼───────┘
  Risky Business  Potential
  (Evaluate)      (Develop)
                     ↓
                Low Profit
```

**Implementation:**

**Backend Endpoint:** `GET /api/analytics/customer-performance-matrix`

**Query Parameters:**
- `account` (required)
- `organization` (optional)
- `startDate` (required)
- `endDate` (required)

**Response Structure:**
```javascript
{
  customers: [
    {
      customerId: ObjectId,
      customerName: String,
      orderCount: Number,        // X-axis: Frequency
      totalProfit: Number,       // Y-axis: Monetary
      totalSales: Number,
      averageOrderValue: Number, // Bubble size
      profitMargin: Number,      // Color intensity
      lastOrderDate: Date,
      daysSinceLastOrder: Number,
      trend: 'up' | 'down' | 'stable'  // Based on last 3 months
    }
  ],
  summary: {
    totalCustomers: Number,
    avgOrdersPerCustomer: Number,
    avgProfitPerCustomer: Number,
    topCustomerProfit: Number,
    topCustomerOrders: Number
  }
}
```

**API Implementation:**

```javascript
// src/pages/api/analytics/customer-performance-matrix.js

export default async function handler(req, res) {
  const { account, organization, startDate, endDate } = req.query;
  const { db } = await connectToDatabase();
  
  const matchFilter = { account };
  if (organization) {
    matchFilter.$or = [
      { organisation: organization },
      { 'vehicleData.organisation': organization }
    ];
  }
  
  const customerData = await db.collection('orders').aggregate([
    {
      $match: {
        account,
        saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    // Lookup vehicle for org filter
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
          { organisation: organization },
          { 'vehicleData.organisation': organization }
        ]
      } : {}
    },
    // Calculate financials
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
    // Group by customer
    {
      $group: {
        _id: '$customer',
        orderCount: { $sum: 1 },
        totalSales: { $sum: '$financials.totalSales' },
        totalProfit: { $sum: '$financials.totalProfit' },
        lastOrderDate: { $max: '$saleDate' },
        firstOrderDate: { $min: '$saleDate' }
      }
    },
    // Lookup customer details
    {
      $lookup: {
        from: 'parties',
        localField: '_id',
        foreignField: '_id',
        as: 'customerData'
      }
    },
    {
      $unwind: '$customerData'
    },
    // Calculate derived metrics
    {
      $project: {
        customerId: '$_id',
        customerName: '$customerData.name',
        orderCount: 1,
        totalProfit: 1,
        totalSales: 1,
        averageOrderValue: { $divide: ['$totalSales', '$orderCount'] },
        profitMargin: { 
          $multiply: [
            { $divide: ['$totalProfit', '$totalSales'] },
            100
          ]
        },
        lastOrderDate: 1,
        daysSinceLastOrder: {
          $divide: [
            { $subtract: [new Date(), '$lastOrderDate'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $sort: { totalProfit: -1 }
    }
  ]).toArray();
  
  // Calculate summary statistics
  const summary = {
    totalCustomers: customerData.length,
    avgOrdersPerCustomer: customerData.reduce((sum, c) => sum + c.orderCount, 0) / customerData.length,
    avgProfitPerCustomer: customerData.reduce((sum, c) => sum + c.totalProfit, 0) / customerData.length,
    topCustomerProfit: customerData[0]?.totalProfit || 0,
    topCustomerOrders: Math.max(...customerData.map(c => c.orderCount), 0)
  };
  
  return res.status(200).json({
    customers: customerData,
    summary
  });
}
```

**Component Implementation:**

```javascript
import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Chart } from 'components/chart';

const CustomerPerformanceMatrix = () => {
  const { customerMatrix, loading } = useSelector((state) => state.dashboard);
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(fetchCustomerPerformanceMatrix());
  }, []);
  
  const chartSeries = [{
    name: 'Customers',
    data: customerMatrix.customers?.map(customer => ({
      x: customer.orderCount,
      y: customer.totalProfit,
      z: customer.averageOrderValue,
      customerId: customer.customerId,
      customerName: customer.customerName,
      profitMargin: customer.profitMargin
    })) || []
  }];
  
  const chartOptions = {
    chart: {
      type: 'bubble',
      events: {
        dataPointSelection: (event, chartContext, config) => {
          const customer = config.w.config.series[0].data[config.dataPointIndex];
          // Navigate to customer detail view
          handleCustomerClick(customer.customerId);
        }
      }
    },
    xaxis: {
      title: { text: 'Order Count (Frequency)' },
      labels: { formatter: (val) => Math.round(val) }
    },
    yaxis: {
      title: { text: 'Total Profit' },
      labels: { formatter: (val) => formatCurrency(val, false) }
    },
    dataLabels: {
      enabled: false
    },
    fill: {
      opacity: 0.8
    },
    colors: ['#10B981'],
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const customer = w.config.series[seriesIndex].data[dataPointIndex];
        return `
          <div style="padding: 12px; background: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            <div style="font-weight: 600; margin-bottom: 4px;">${customer.customerName}</div>
            <div>Orders: ${customer.x}</div>
            <div>Profit: ${formatCurrency(customer.y)}</div>
            <div>Avg Order: ${formatCurrency(customer.z)}</div>
            <div>Margin: ${customer.profitMargin.toFixed(1)}%</div>
          </div>
        `;
      }
    }
  };
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Customer Performance Matrix
        </Typography>
        <Box sx={{ height: 400 }}>
          <Chart
            type="bubble"
            series={chartSeries}
            options={chartOptions}
            height={400}
          />
        </Box>
        
        {/* Quadrant Labels */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
            <Typography variant="subtitle2">👑 Champions</Typography>
            <Typography variant="caption" color="text.secondary">
              High Volume + High Profit
            </Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
            <Typography variant="subtitle2">⭐ Stars</Typography>
            <Typography variant="caption" color="text.secondary">
              High Profit + Growing Volume
            </Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
            <Typography variant="subtitle2">🌱 Potential</Typography>
            <Typography variant="caption" color="text.secondary">
              Low Profit + Low Volume
            </Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
            <Typography variant="subtitle2">⚠️ Risky</Typography>
            <Typography variant="caption" color="text.secondary">
              High Volume + Low Profit
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
```

---

### 2.1.2 Customer Scoring & Ranking Table

**Purpose:** Provide actionable customer ranking with comprehensive scoring

**Scoring Algorithm:**

#### **Customer Health Score (0-100)**

**Components:**

1. **Order Frequency Score (30% weight)**
   - Percentile rank among all customers
   - Formula: `(CustomerOrderCount / MaxOrderCount) × 30`

2. **Profitability Score (25% weight)**
   - Percentile rank by total profit
   - Formula: `(CustomerProfit / MaxProfit) × 25`

3. **Growth Score (20% weight)**
   - Period-over-period growth
   - Formula: `min(((CurrentOrders - PreviousOrders) / PreviousOrders × 100), 20)`
   - Capped at 20 points

4. **Recency Score (15% weight)**
   - Days since last order (inverse)
   - Formula: `max(15 - (DaysSinceLastOrder / 3), 0)`
   - Recent orders score higher

5. **Payment Behavior Score (10% weight)**
   - Based on outstanding invoices
   - Formula: `10 - min((TotalOutstanding / TotalSales × 100), 10)`
   - Perfect payment = 10 points

**Score Interpretation:**
- **90-100:** 🏆 Champion Customer (VIP treatment)
- **75-89:** ⭐ Valuable Customer (maintain relationship)
- **60-74:** 📈 Growing Customer (nurture potential)
- **40-59:** 👤 Average Customer (standard service)
- **0-39:** ⚠️ At-Risk Customer (intervention needed)

**Backend Endpoint:** `GET /api/analytics/customer-scoring`

**Response Structure:**
```javascript
{
  customers: [
    {
      customerId: ObjectId,
      customerName: String,
      customerCity: String,
      
      // Metrics
      orderCount: Number,
      totalProfit: Number,
      totalSales: Number,
      averageProfitPerOrder: Number,
      profitMargin: Number,
      
      // Scoring components
      healthScore: Number,        // 0-100
      scoreBreakdown: {
        frequencyScore: Number,   // Out of 30
        profitabilityScore: Number, // Out of 25
        growthScore: Number,      // Out of 20
        recencyScore: Number,     // Out of 15
        paymentScore: Number      // Out of 10
      },
      
      // Status indicators
      scoreTier: 'champion' | 'valuable' | 'growing' | 'average' | 'at-risk',
      recencyDays: Number,
      recencyStatus: 'active' | 'recent' | 'dormant',
      
      // Trends
      orderGrowth: Number,        // % change vs previous period
      profitTrend: Array,         // Last 12 weeks
      
      // Payment behavior
      totalOutstanding: Number,
      outstandingInvoiceCount: Number,
      averagePaymentDays: Number,
      
      // Risk flags
      riskFlags: Array<String>    // ['declining_orders', 'late_payments', 'margin_erosion']
    }
  ],
  
  summary: {
    championCount: Number,
    valuableCount: Number,
    growingCount: Number,
    averageCount: Number,
    atRiskCount: Number,
    avgHealthScore: Number
  }
}
```

**API Implementation:**

```javascript
// src/pages/api/analytics/customer-scoring.js

export default async function handler(req, res) {
  const { account, organization, startDate, endDate } = req.query;
  const { db } = await connectToDatabase();
  
  // Calculate previous period for comparison
  const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - periodDays);
  const previousEndDate = new Date(startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  
  // Get current period data
  const currentPeriodData = await getCustomerMetrics(db, account, organization, startDate, endDate);
  
  // Get previous period data for growth calculation
  const previousPeriodData = await getCustomerMetrics(db, account, organization, 
    previousStartDate.toISOString(), previousEndDate.toISOString());
  
  // Get outstanding invoices per customer
  const outstandingData = await db.collection('invoices').aggregate([
    {
      $match: {
        account,
        paymentStatus: { $in: ['unpaid', 'partial'] }
      }
    },
    {
      $group: {
        _id: '$customer',
        totalOutstanding: { $sum: { $subtract: ['$subtotal', '$paidAmount'] } },
        invoiceCount: { $sum: 1 }
      }
    }
  ]).toArray();
  
  const outstandingMap = new Map(
    outstandingData.map(item => [item._id.toString(), item])
  );
  
  // Calculate scores
  const maxOrderCount = Math.max(...currentPeriodData.map(c => c.orderCount), 1);
  const maxProfit = Math.max(...currentPeriodData.map(c => c.totalProfit), 1);
  
  const scoredCustomers = currentPeriodData.map(customer => {
    const previousCustomer = previousPeriodData.find(
      p => p.customerId.toString() === customer.customerId.toString()
    );
    
    const outstanding = outstandingMap.get(customer.customerId.toString()) || {
      totalOutstanding: 0,
      invoiceCount: 0
    };
    
    // Calculate score components
    const frequencyScore = (customer.orderCount / maxOrderCount) * 30;
    const profitabilityScore = (customer.totalProfit / maxProfit) * 25;
    
    const orderGrowth = previousCustomer
      ? ((customer.orderCount - previousCustomer.orderCount) / previousCustomer.orderCount) * 100
      : 0;
    const growthScore = Math.min(Math.max(orderGrowth, 0), 100) / 5; // Cap at 20
    
    const recencyScore = Math.max(15 - (customer.daysSinceLastOrder / 3), 0);
    
    const outstandingRatio = customer.totalSales > 0
      ? (outstanding.totalOutstanding / customer.totalSales) * 100
      : 0;
    const paymentScore = 10 - Math.min(outstandingRatio, 10);
    
    const healthScore = frequencyScore + profitabilityScore + growthScore + recencyScore + paymentScore;
    
    // Determine tier
    let scoreTier;
    if (healthScore >= 90) scoreTier = 'champion';
    else if (healthScore >= 75) scoreTier = 'valuable';
    else if (healthScore >= 60) scoreTier = 'growing';
    else if (healthScore >= 40) scoreTier = 'average';
    else scoreTier = 'at-risk';
    
    // Recency status
    let recencyStatus;
    if (customer.daysSinceLastOrder <= 7) recencyStatus = 'active';
    else if (customer.daysSinceLastOrder <= 30) recencyStatus = 'recent';
    else recencyStatus = 'dormant';
    
    // Risk flags
    const riskFlags = [];
    if (orderGrowth < -20) riskFlags.push('declining_orders');
    if (outstanding.totalOutstanding > customer.totalSales * 0.3) riskFlags.push('late_payments');
    if (customer.profitMargin < 10) riskFlags.push('low_margin');
    if (customer.daysSinceLastOrder > 60) riskFlags.push('inactive');
    
    return {
      ...customer,
      healthScore: Math.round(healthScore),
      scoreBreakdown: {
        frequencyScore: Math.round(frequencyScore),
        profitabilityScore: Math.round(profitabilityScore),
        growthScore: Math.round(growthScore),
        recencyScore: Math.round(recencyScore),
        paymentScore: Math.round(paymentScore)
      },
      scoreTier,
      recencyStatus,
      orderGrowth: Math.round(orderGrowth * 10) / 10,
      totalOutstanding: outstanding.totalOutstanding,
      outstandingInvoiceCount: outstanding.invoiceCount,
      riskFlags
    };
  });
  
  // Sort by health score
  scoredCustomers.sort((a, b) => b.healthScore - a.healthScore);
  
  // Calculate summary
  const summary = {
    championCount: scoredCustomers.filter(c => c.scoreTier === 'champion').length,
    valuableCount: scoredCustomers.filter(c => c.scoreTier === 'valuable').length,
    growingCount: scoredCustomers.filter(c => c.scoreTier === 'growing').length,
    averageCount: scoredCustomers.filter(c => c.scoreTier === 'average').length,
    atRiskCount: scoredCustomers.filter(c => c.scoreTier === 'at-risk').length,
    avgHealthScore: Math.round(
      scoredCustomers.reduce((sum, c) => sum + c.healthScore, 0) / scoredCustomers.length
    )
  };
  
  return res.status(200).json({
    customers: scoredCustomers,
    summary
  });
}

// Helper function
async function getCustomerMetrics(db, account, organization, startDate, endDate) {
  return await db.collection('orders').aggregate([
    {
      $match: {
        account,
        saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    // ... similar aggregation as previous example
  ]).toArray();
}
```

**Component Implementation:**

```javascript
// src/components/dashboard/CustomerScoringTable.js

import { DataGrid } from '@mui/x-data-grid';
import { Box, Chip, Tooltip, IconButton, LinearProgress } from '@mui/material';
import { Info as InfoIcon, TrendingUp, TrendingDown } from '@mui/icons-material';

const CustomerScoringTable = () => {
  const { customerScoring, loading } = useSelector((state) => state.dashboard);
  const dispatch = useDispatch();
  
  const getTierColor = (tier) => {
    const colors = {
      champion: 'success',
      valuable: 'info',
      growing: 'primary',
      average: 'default',
      'at-risk': 'error'
    };
    return colors[tier] || 'default';
  };
  
  const getTierIcon = (tier) => {
    const icons = {
      champion: '🏆',
      valuable: '⭐',
      growing: '📈',
      average: '👤',
      'at-risk': '⚠️'
    };
    return icons[tier] || '';
  };
  
  const columns = [
    {
      field: 'customerName',
      headerName: 'Customer',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.customerCity}
          </Typography>
        </Box>
      )
    },
    {
      field: 'healthScore',
      headerName: 'Health Score',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Typography variant="h6" fontWeight={700}>
            {params.value}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={params.value}
            sx={{ flex: 1, height: 8, borderRadius: 4 }}
            color={params.value >= 75 ? 'success' : params.value >= 40 ? 'warning' : 'error'}
          />
          <Tooltip title={`
            Frequency: ${params.row.scoreBreakdown.frequencyScore}/30
            Profit: ${params.row.scoreBreakdown.profitabilityScore}/25
            Growth: ${params.row.scoreBreakdown.growthScore}/20
            Recency: ${params.row.scoreBreakdown.recencyScore}/15
            Payment: ${params.row.scoreBreakdown.paymentScore}/10
          `}>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    },
    {
      field: 'scoreTier',
      headerName: 'Tier',
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={`${getTierIcon(params.value)} ${params.value}`}
          color={getTierColor(params.value)}
          size="small"
          sx={{ textTransform: 'capitalize' }}
        />
      )
    },
    {
      field: 'orderCount',
      headerName: 'Orders',
      width: 90,
      align: 'right'
    },
    {
      field: 'totalProfit',
      headerName: 'Total Profit',
      width: 120,
      align: 'right',
      renderCell: (params) => formatCurrency(params.value)
    },
    {
      field: 'averageProfitPerOrder',
      headerName: 'Avg Profit',
      width: 110,
      align: 'right',
      renderCell: (params) => formatCurrency(params.value)
    },
    {
      field: 'profitMargin',
      headerName: 'Margin',
      width: 90,
      align: 'right',
      renderCell: (params) => `${params.value.toFixed(1)}%`
    },
    {
      field: 'orderGrowth',
      headerName: 'Growth',
      width: 100,
      align: 'right',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {params.value >= 0 ? (
            <TrendingUp sx={{ color: 'success.main', fontSize: 18 }} />
          ) : (
            <TrendingDown sx={{ color: 'error.main', fontSize: 18 }} />
          )}
          <Typography 
            variant="body2"
            color={params.value >= 0 ? 'success.main' : 'error.main'}
          >
            {params.value >= 0 ? '+' : ''}{params.value}%
          </Typography>
        </Box>
      )
    },
    {
      field: 'recencyDays',
      headerName: 'Last Order',
      width: 110,
      align: 'right',
      renderCell: (params) => (
        <Typography 
          variant="body2"
          color={params.value <= 7 ? 'success.main' : params.value <= 30 ? 'text.primary' : 'error.main'}
        >
          {params.value} days ago
        </Typography>
      )
    },
    {
      field: 'totalOutstanding',
      headerName: 'Outstanding',
      width: 120,
      align: 'right',
      renderCell: (params) => (
        <Tooltip title={`${params.row.outstandingInvoiceCount} unpaid invoices`}>
          <Typography 
            variant="body2"
            color={params.value > 0 ? 'warning.main' : 'text.secondary'}
          >
            {formatCurrency(params.value)}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'riskFlags',
      headerName: 'Alerts',
      width: 100,
      renderCell: (params) => (
        params.value.length > 0 ? (
          <Chip 
            label={`${params.value.length} alerts`}
            size="small"
            color="warning"
          />
        ) : null
      )
    }
  ];
  
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Customer Health & Scoring
          </Typography>
          
          {/* Summary chips */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`🏆 ${customerScoring.summary?.championCount || 0} Champions`} size="small" />
            <Chip label={`⭐ ${customerScoring.summary?.valuableCount || 0} Valuable`} size="small" />
            <Chip label={`⚠️ ${customerScoring.summary?.atRiskCount || 0} At Risk`} size="small" color="error" />
          </Box>
        </Box>
        
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={customerScoring.customers || []}
            columns={columns}
            getRowId={(row) => row.customerId}
            loading={loading}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            onRowClick={(params) => {
              // Navigate to customer detail view
              handleCustomerDetailView(params.row.customerId);
            }}
            sx={{
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default CustomerScoringTable;
```

---

### 2.1.3 RFM Segmentation Analysis

**Purpose:** Segment customers using RFM (Recency, Frequency, Monetary) methodology for targeted strategies

**RFM Scoring Method:**

Each metric scored 1-5:
- **R (Recency):** Days since last order
  - 5: 0-7 days
  - 4: 8-30 days  
  - 3: 31-60 days
  - 2: 61-90 days
  - 1: 90+ days

- **F (Frequency):** Order count in period
  - 5: Top 20% (highest frequency)
  - 4: 20-40%
  - 3: 40-60%
  - 2: 60-80%
  - 1: Bottom 20%

- **M (Monetary):** Total profit in period
  - 5: Top 20% (highest profit)
  - 4: 20-40%
  - 3: 40-60%
  - 2: 60-80%
  - 1: Bottom 20%

**Segment Definitions:**

| Segment | RFM Range | Description | Strategy |
|---------|-----------|-------------|----------|
| **Champions** 🏆 | 5-5-5, 5-5-4, 5-4-5 | Best customers: Recent, frequent, high value | VIP treatment, exclusive offers |
| **Loyal Customers** ⭐ | 4-5-5, 5-5-3, 4-4-5 | Regular customers, reliable revenue | Loyalty rewards, upsell |
| **Big Spenders** 💎 | 5-2-5, 4-2-5 | High value but infrequent | Targeted campaigns, incentives |
| **Promising** 🌱 | 5-3-3, 5-4-3, 4-3-4 | Recent customers, growing potential | Nurture relationship |
| **Need Attention** ⚠️ | 3-3-3, 3-4-3 | Average on all metrics | Re-engagement campaigns |
| **About to Sleep** 😴 | 2-4-4, 2-5-4 | Were valuable, now declining | Win-back campaigns |
| **At Risk** 🚨 | 2-2-3, 1-3-3 | Losing them | Urgent intervention needed |
| **Lost** ❌ | 1-1-1, 1-1-2 | Churned customers | Consider win-back or let go |

**Backend Endpoint:** `GET /api/analytics/rfm-segmentation`

**Response Structure:**
```javascript
{
  segments: [
    {
      segmentName: 'Champions',
      segmentIcon: '🏆',
      customerCount: Number,
      totalProfit: Number,
      avgOrderValue: Number,
      description: String,
      strategy: String,
      customers: [
        {
          customerId: ObjectId,
          customerName: String,
          recencyScore: Number,    // 1-5
          frequencyScore: Number,  // 1-5
          monetaryScore: Number,   // 1-5
          rfmScore: String,        // e.g., "5-5-5"
          metrics: {
            daysSinceLastOrder: Number,
            orderCount: Number,
            totalProfit: Number
          }
        }
      ]
    }
  ],
  
  distribution: {
    champions: Number,
    loyal: Number,
    bigSpenders: Number,
    promising: Number,
    needAttention: Number,
    aboutToSleep: Number,
    atRisk: Number,
    lost: Number
  }
}
```

**Component - Segment Distribution Chart:**

```javascript
const RFMSegmentationChart = () => {
  const { rfmSegmentation } = useSelector((state) => state.dashboard);
  
  const chartSeries = Object.values(rfmSegmentation.distribution || {});
  const chartLabels = [
    '🏆 Champions',
    '⭐ Loyal',
    '💎 Big Spenders',
    '🌱 Promising',
    '⚠️ Need Attention',
    '😴 About to Sleep',
    '🚨 At Risk',
    '❌ Lost'
  ];
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Customer Segmentation (RFM Analysis)
        </Typography>
        
        {/* Donut chart showing distribution */}
        <Box sx={{ height: 300 }}>
          <Chart
            type="donut"
            series={chartSeries}
            options={{
              labels: chartLabels,
              colors: [
                '#10B981', // Champions - green
                '#3B82F6', // Loyal - blue
                '#8B5CF6', // Big Spenders - purple
                '#06B6D4', // Promising - cyan
                '#F59E0B', // Need Attention - amber
                '#EC4899', // About to Sleep - pink
                '#EF4444', // At Risk - red
                '#6B7280'  // Lost - gray
              ],
              legend: {
                position: 'bottom'
              },
              plotOptions: {
                pie: {
                  donut: {
                    labels: {
                      show: true,
                      total: {
                        show: true,
                        label: 'Total Customers'
                      }
                    }
                  }
                }
              }
            }}
          />
        </Box>
        
        {/* Segment action cards */}
        <Box sx={{ mt: 3 }}>
          {rfmSegmentation.segments?.map((segment) => (
            <Accordion key={segment.segmentName}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="h6">{segment.segmentIcon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">{segment.segmentName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {segment.customerCount} customers • {formatCurrency(segment.totalProfit)} profit
                    </Typography>
                  </Box>
                  <Chip label={`${segment.customerCount}`} />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" paragraph>
                    <strong>Description:</strong> {segment.description}
                  </Typography>
                  <Typography variant="body2" color="primary">
                    <strong>Strategy:</strong> {segment.strategy}
                  </Typography>
                </Box>
                
                {/* Customer list in segment */}
                <DataGrid
                  rows={segment.customers}
                  columns={[
                    { field: 'customerName', headerName: 'Customer', width: 200 },
                    { field: 'rfmScore', headerName: 'RFM Score', width: 100 },
                    { 
                      field: 'metrics.orderCount', 
                      headerName: 'Orders', 
                      width: 90,
                      valueGetter: (params) => params.row.metrics.orderCount
                    },
                    {
                      field: 'metrics.totalProfit',
                      headerName: 'Profit',
                      width: 120,
                      valueGetter: (params) => formatCurrency(params.row.metrics.totalProfit)
                    },
                    {
                      field: 'metrics.daysSinceLastOrder',
                      headerName: 'Last Order',
                      width: 110,
                      valueGetter: (params) => `${params.row.metrics.daysSinceLastOrder} days ago`
                    }
                  ]}
                  getRowId={(row) => row.customerId}
                  autoHeight
                  hideFooter
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
```

---

## 2.2 Transporter Analytics Dashboard

### Purpose
Optimize transporter relationships through:
- Partnership quality assessment
- Reliability and consistency scoring
- Cost competitiveness analysis
- Route specialization identification

### 2.2.1 Transporter Scoring Algorithm

#### **Partnership Score (0-100)**

**Components:**

1. **Volume Score (40% weight)**
   - Order count percentile
   - Formula: `(TransporterOrderCount / MaxOrderCount) × 40`

2. **Reliability Score (30% weight)**
   - Combination of:
     - Document completion rate (50%)
     - Cost consistency - inverse of variance (30%)
     - On-time delivery rate (20%) - if tracking data available
   - Formula: `((DocCompletionRate × 0.5) + ((100 - CostVariance) × 0.3) + (OnTimeRate × 0.2)) × 0.3`

3. **Cost Competitiveness (20% weight)**
   - Compare against market average
   - Formula: `(1 - ((TransporterAvgCost - MarketAvgCost) / MarketAvgCost)) × 20`
   - Lower cost = higher score (but not at expense of reliability)

4. **Tenure Score (10% weight)**
   - Months since first order (loyalty bonus)
   - Formula: `min((MonthsActive / 24) × 10, 10)`
   - Capped at 10 points after 2 years

**Score Interpretation:**
- **90-100:** 🤝 Strategic Partner (priority allocation, long-term contracts)
- **75-89:** ✅ Reliable Partner (continued collaboration)
- **60-74:** 📊 Growing Partner (monitor performance)
- **40-59:** ⚠️ Conditional Partner (limited use, issues to address)
- **0-39:** 🚫 At-Risk Partner (consider alternatives)

**Backend Endpoint:** `GET /api/analytics/transporter-scoring`

**Component:** Similar structure to Customer Scoring Table, adapted for transporters

---

## 2.3 Customer/Transporter Detail View

### Purpose
Provide comprehensive drill-down view when clicking on a customer or transporter

**Modal/Page Components:**

1. **Header Section**
   - Name, location, contact info
   - Health/Partnership score with breakdown
   - Quick actions (Create Order, View Invoices, etc.)

2. **Financial Summary Cards**
   - Total orders, sales, profit, margin
   - Growth trends
   - Outstanding amounts

3. **Order History Table**
   - All orders with this party
   - Filterable, sortable, exportable

4. **Route Analysis**
   - Most common routes
   - Profitability by route

5. **Time-Series Chart**
   - Orders and profit over time
   - Identify patterns and trends

6. **Notes & Alerts**
   - Relationship notes
   - Risk flags and recommendations

---

## Redux Integration

### State Structure

```javascript
// src/slices/dashboardSlice.js

{
  customerPerformanceMatrix: {
    data: { customers: [], summary: {} },
    loading: false,
    error: null
  },
  
  customerScoring: {
    data: { customers: [], summary: {} },
    loading: false,
    error: null
  },
  
  rfmSegmentation: {
    data: { segments: [], distribution: {} },
    loading: false,
    error: null
  },
  
  transporterScoring: {
    data: { transporters: [], summary: {} },
    loading: false,
    error: null
  },
  
  partyDetail: {
    data: null,
    loading: false,
    error: null
  }
}
```

### Thunks

```javascript
export const fetchCustomerPerformanceMatrix = createAsyncThunk(/*...*/);
export const fetchCustomerScoring = createAsyncThunk(/*...*/);
export const fetchRFMSegmentation = createAsyncThunk(/*...*/);
export const fetchTransporterScoring = createAsyncThunk(/*...*/);
export const fetchPartyDetail = createAsyncThunk(/*...*/);
```

---

## Database Indexes for Performance

```javascript
// Additional indexes for Phase 2
db.orders.createIndex({ customer: 1, saleDate: -1 });
db.orders.createIndex({ transporter: 1, saleDate: -1 });
db.orders.createIndex({ customer: 1, account: 1 });
db.orders.createIndex({ transporter: 1, account: 1 });

db.invoices.createIndex({ customer: 1, paymentStatus: 1, invoiceDate: -1 });
```

---

## Testing Requirements

### Unit Tests
- [ ] Customer scoring algorithm accuracy
- [ ] RFM calculation correctness
- [ ] Transporter scoring algorithm
- [ ] Score tier assignment logic

### Integration Tests
- [ ] API endpoints return correct data
- [ ] Drill-down navigation works
- [ ] Filters apply correctly across views

### Performance Tests
- [ ] Aggregation queries complete in <1s
- [ ] Component renders in <500ms
- [ ] Table sorting/filtering is smooth

---

## Deployment Checklist - Phase 2

### Backend
- [ ] Create `/api/analytics/customer-performance-matrix` endpoint
- [ ] Create `/api/analytics/customer-scoring` endpoint
- [ ] Create `/api/analytics/rfm-segmentation` endpoint
- [ ] Create `/api/analytics/transporter-scoring` endpoint
- [ ] Create `/api/analytics/party-detail/:id` endpoint
- [ ] Add database indexes
- [ ] Test with production data volumes

### Frontend
- [ ] Build `CustomerPerformanceMatrix` component
- [ ] Build `CustomerScoringTable` component
- [ ] Build `RFMSegmentationChart` component
- [ ] Build `TransporterScoringTable` component
- [ ] Build `PartyDetailView` component
- [ ] Add to dashboard page layout
- [ ] Implement drill-down navigation
- [ ] Add export functionality

### Integration
- [ ] Connect components to Redux
- [ ] Implement thunks for data fetching
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test with organization filter
- [ ] Test with date range changes

---

## End of Phase 2 Documentation

**Status:** ✅ Complete and ready for review

**Next Phase:** Phase 3 - Location & Route Analytics

**Estimated Implementation Time:**
- Customer analytics: 12-15 hours
- Transporter analytics: 8-10 hours
- Detail views: 6-8 hours
- Testing: 6-8 hours
- **Total: 32-41 hours (4-5 working days)**