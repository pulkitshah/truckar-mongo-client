# Phase 3: Location & Route Analytics

**Timeline:** Week 5-6  
**Goal:** Enable location-based insights and route profitability analysis for operational optimization  
**Status:** 📋 Planning  
**Prerequisites:** Phase 1 & 2 completed

---

## Overview

Phase 3 focuses on geographic and route-based analytics to:
1. Analyze route profitability and efficiency
2. Identify high-value and underperforming routes
3. Provide city-wise performance metrics
4. Enable market concentration analysis
5. Support expansion and optimization decisions

---

## Current Location Data Structure Analysis

### Schema Review

**Order.deliveries[].loading & unloading:**
```javascript
loading: {
  type: Object  // Flexible structure
  // Typically contains: { city: String, state: String, address: String }
}

unloading: {
  type: Object  // Flexible structure
  // Typically contains: { city: String, state: String, address: String }
}
```

**Party.city:**
```javascript
city: {
  type: Object  // Flexible structure from autocomplete
  // May contain: { name: String, state: String, ... }
}
```

### Data Challenges & Solutions

**Challenge 1: Unstructured Location Data**
- Location fields are Object type without defined schema
- City names may have inconsistent formats (capitalization, spelling)
- No standardized location master data

**Solution:**
- Extract city names with normalization (trim, lowercase, title case)
- Build route keys: `${loadingCity} → ${unloadingCity}`
- Create aggregation-time standardization
- Future: Add optional Location collection for master data

**Challenge 2: No Distance Data**
- No km/miles stored for routes
- Cannot calculate per-km rates directly

**Solution:**
- Focus on route profitability (total, not per-km)
- Order count and frequency as volume metrics
- Future: Integrate with distance API (Google Maps, etc.)

**Challenge 3: Location Hierarchy**
- No region/zone grouping
- State information may be inconsistent

**Solution:**
- Analyze at city level (most granular available)
- Optional: Add state-level rollup
- Use city pairs as primary route identifier

---

## 3.1 Route Profitability Dashboard

### Purpose
Analyze routes to identify profitable lanes, optimize pricing, and allocate resources effectively

### 3.1.1 Route Performance Table

**Primary View:** Comprehensive table of all routes with key metrics

**Backend Endpoint:** `GET /api/analytics/route-profitability`

**Query Parameters:**
- `account` (required)
- `organization` (optional)
- `startDate` (required)
- `endDate` (required)
- `minOrders` (optional, default: 1) - Filter routes with minimum order count
- `sortBy` (optional: 'profit', 'orders', 'margin') - Sort criteria
- `sortOrder` (optional: 'asc', 'desc')

**Response Structure:**
```javascript
{
  routes: [
    {
      routeId: String,              // "Mumbai → Delhi"
      loadingCity: String,
      loadingState: String,
      unloadingCity: String,
      unloadingState: String,
      
      // Volume metrics
      orderCount: Number,
      deliveryCount: Number,
      totalQuantity: Number,
      
      // Financial metrics
      totalSales: Number,
      totalPurchase: Number,
      totalProfit: Number,
      profitMargin: Number,
      averageProfitPerOrder: Number,
      averageSalesPerOrder: Number,
      
      // Operational metrics
      documentCompletionRate: Number,  // % with LR & invoice
      averageLRCharges: Number,
      averageInvoiceCharges: Number,
      
      // Customer concentration
      uniqueCustomers: Number,
      topCustomer: {
        customerId: ObjectId,
        name: String,
        orderCount: Number,
        profit: Number
      },
      
      // Transporter analysis
      uniqueTransporters: Number,
      topTransporter: {
        transporterId: ObjectId,
        name: String,
        orderCount: Number,
        avgCost: Number
      },
      
      // Trends
      orderTrend: Array,              // Last 12 weeks: [{week, orders, profit}]
      growthRate: Number,             // % change vs previous period
      
      // Scoring
      routeScore: Number,             // 0-100 composite score
      routeTier: String,              // 'core', 'growth', 'stable', 'marginal', 'unprofitable'
      
      // Insights
      insights: Array<String>         // ["High margin route", "Growing volume", "Single customer dependency"]
    }
  ],
  
  summary: {
    totalRoutes: Number,
    totalOrders: Number,
    avgOrdersPerRoute: Number,
    totalProfit: Number,
    avgProfitPerRoute: Number,
    
    tierDistribution: {
      core: Number,
      growth: Number,
      stable: Number,
      marginal: Number,
      unprofitable: Number
    }
  },
  
  topRoutes: {
    byProfit: Array,      // Top 10 routes by total profit
    byVolume: Array,      // Top 10 routes by order count
    byMargin: Array       // Top 10 routes by profit margin
  }
}
```

**Route Score Calculation (0-100):**

**Components:**

1. **Volume Score (40% weight)**
   - Based on order count percentile
   - Formula: `(RouteOrderCount / MaxOrderCount) × 40`

2. **Profitability Score (30% weight)**
   - Based on total profit percentile
   - Formula: `(RouteProfit / MaxProfit) × 30`

3. **Margin Score (20% weight)**
   - Based on profit margin percentile
   - Formula: `(RouteMargin / MaxMargin) × 20`

4. **Growth Score (10% weight)**
   - Period-over-period growth
   - Formula: `min(max(GrowthRate, -50), 100) / 10`
   - Range: -5 to +10 points

**Route Tier Classification:**
- **Core Route (90-100):** High volume + High profit + Consistent - Strategic focus
- **Growth Route (75-89):** Increasing volume/profit - Investment opportunity
- **Stable Route (60-74):** Steady performance - Maintain efficiency
- **Marginal Route (40-59):** Low volume or profit - Evaluate viability
- **Unprofitable Route (0-39):** Negative/very low profit - Consider discontinuing

**API Implementation:**

```javascript
// src/pages/api/analytics/route-profitability.js

import { connectToDatabase } from 'lib/mongodb';
import { calculateOrderFinancials } from 'helper/orderCalculations';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { 
    account, 
    organization, 
    startDate, 
    endDate,
    minOrders = 1,
    sortBy = 'profit',
    sortOrder = 'desc'
  } = req.query;
  
  const { db } = await connectToDatabase();
  
  // Helper function to normalize city names
  const normalizeCityName = (cityObj) => {
    if (!cityObj) return 'Unknown';
    if (typeof cityObj === 'string') return cityObj.trim();
    if (cityObj.name) return cityObj.name.trim();
    return 'Unknown';
  };
  
  // Calculate previous period for growth comparison
  const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - periodDays);
  const previousEndDate = new Date(startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  
  // Main aggregation pipeline
  const routeData = await db.collection('orders').aggregate([
    {
      $match: {
        account,
        saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    // Lookup vehicle for organization filter
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
    // Unwind deliveries to analyze routes
    {
      $unwind: '$deliveries'
    },
    // Calculate financials per delivery
    {
      $addFields: {
        financials: {
          $function: {
            body: calculateOrderFinancials.toString(),
            args: ['$$ROOT'],
            lang: 'js'
          }
        },
        // Normalize loading city
        loadingCityNormalized: {
          $cond: {
            if: { $eq: [{ $type: '$deliveries.loading.city' }, 'object'] },
            then: { $ifNull: ['$deliveries.loading.city.name', 'Unknown'] },
            else: { $ifNull: ['$deliveries.loading.city', 'Unknown'] }
          }
        },
        // Normalize unloading city
        unloadingCityNormalized: {
          $cond: {
            if: { $eq: [{ $type: '$deliveries.unloading.city' }, 'object'] },
            then: { $ifNull: ['$deliveries.unloading.city.name', 'Unknown'] },
            else: { $ifNull: ['$deliveries.unloading.city', 'Unknown'] }
          }
        },
        loadingState: '$deliveries.loading.state',
        unloadingState: '$deliveries.unloading.state',
        hasLR: { $ne: ['$deliveries.lr', null] },
        lrChargesAmount: {
          $cond: {
            if: { $ne: ['$deliveries.lr.lrCharges', null] },
            then: {
              $reduce: {
                input: { $objectToArray: '$deliveries.lr.lrCharges' },
                initialValue: 0,
                in: { $add: ['$$value', { $toDouble: '$$this.v' }] }
              }
            },
            else: 0
          }
        },
        invoiceChargesAmount: {
          $cond: {
            if: { $isArray: '$deliveries.invoiceCharges' },
            then: {
              $reduce: {
                input: '$deliveries.invoiceCharges',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.amount'] }
              }
            },
            else: 0
          }
        }
      }
    },
    // Create route identifier
    {
      $addFields: {
        routeId: {
          $concat: [
            '$loadingCityNormalized',
            ' → ',
            '$unloadingCityNormalized'
          ]
        }
      }
    },
    // Group by route
    {
      $group: {
        _id: '$routeId',
        loadingCity: { $first: '$loadingCityNormalized' },
        loadingState: { $first: '$loadingState' },
        unloadingCity: { $first: '$unloadingCityNormalized' },
        unloadingState: { $first: '$unloadingState' },
        
        // Volume metrics
        orderCount: { $sum: 1 },
        deliveryCount: { $sum: 1 },
        totalQuantity: { $sum: '$deliveries.billQuantity' },
        
        // Financial metrics
        totalSales: { $sum: '$financials.totalSales' },
        totalPurchase: { $sum: '$financials.totalPurchase' },
        totalProfit: { $sum: '$financials.totalProfit' },
        
        // Additional charges
        totalLRCharges: { $sum: '$lrChargesAmount' },
        totalInvoiceCharges: { $sum: '$invoiceChargesAmount' },
        
        // Document completion
        deliveriesWithLR: { $sum: { $cond: ['$hasLR', 1, 0] } },
        
        // Customer concentration
        uniqueCustomers: { $addToSet: '$customer' },
        customers: {
          $push: {
            customerId: '$customer',
            profit: '$financials.totalProfit'
          }
        },
        
        // Transporter analysis
        uniqueTransporters: { $addToSet: '$transporter' },
        transporters: {
          $push: {
            transporterId: '$transporter',
            purchase: '$financials.totalPurchase'
          }
        },
        
        // Orders for trend analysis
        orders: {
          $push: {
            orderId: '$_id',
            saleDate: '$saleDate',
            profit: '$financials.totalProfit'
          }
        }
      }
    },
    // Filter by minimum orders
    {
      $match: {
        orderCount: { $gte: parseInt(minOrders) }
      }
    },
    // Calculate derived metrics
    {
      $addFields: {
        profitMargin: {
          $cond: {
            if: { $gt: ['$totalSales', 0] },
            then: { $multiply: [{ $divide: ['$totalProfit', '$totalSales'] }, 100] },
            else: 0
          }
        },
        averageProfitPerOrder: { $divide: ['$totalProfit', '$orderCount'] },
        averageSalesPerOrder: { $divide: ['$totalSales', '$orderCount'] },
        documentCompletionRate: {
          $multiply: [
            { $divide: ['$deliveriesWithLR', '$deliveryCount'] },
            100
          ]
        },
        averageLRCharges: { $divide: ['$totalLRCharges', '$deliveryCount'] },
        averageInvoiceCharges: { $divide: ['$totalInvoiceCharges', '$deliveryCount'] },
        uniqueCustomerCount: { $size: '$uniqueCustomers' },
        uniqueTransporterCount: { $size: '$uniqueTransporters' }
      }
    },
    // Sort based on request
    {
      $sort: {
        [sortBy === 'profit' ? 'totalProfit' : sortBy === 'orders' ? 'orderCount' : 'profitMargin']: 
          sortOrder === 'asc' ? 1 : -1
      }
    }
  ]).toArray();
  
  // Get previous period data for growth calculation
  const previousPeriodData = await db.collection('orders').aggregate([
    {
      $match: {
        account,
        saleDate: { $gte: previousStartDate, $lte: previousEndDate }
      }
    },
    // Similar pipeline as above, abbreviated for brevity
    // ... (same grouping logic)
  ]).toArray();
  
  // Create map for previous period lookup
  const previousMap = new Map(
    previousPeriodData.map(route => [route._id, route])
  );
  
  // Calculate max values for scoring
  const maxOrderCount = Math.max(...routeData.map(r => r.orderCount), 1);
  const maxProfit = Math.max(...routeData.map(r => r.totalProfit), 1);
  const maxMargin = Math.max(...routeData.map(r => r.profitMargin), 1);
  
  // Enhance route data with scores and insights
  const enhancedRoutes = routeData.map(route => {
    const previousRoute = previousMap.get(route._id);
    
    // Calculate growth
    const growthRate = previousRoute
      ? ((route.orderCount - previousRoute.orderCount) / previousRoute.orderCount) * 100
      : 0;
    
    // Calculate route score
    const volumeScore = (route.orderCount / maxOrderCount) * 40;
    const profitScore = (route.totalProfit / maxProfit) * 30;
    const marginScore = (route.profitMargin / maxMargin) * 20;
    const growthScore = Math.min(Math.max(growthRate, -50), 100) / 10;
    
    const routeScore = volumeScore + profitScore + marginScore + growthScore;
    
    // Determine tier
    let routeTier;
    if (routeScore >= 90) routeTier = 'core';
    else if (routeScore >= 75) routeTier = 'growth';
    else if (routeScore >= 60) routeTier = 'stable';
    else if (routeScore >= 40) routeTier = 'marginal';
    else routeTier = 'unprofitable';
    
    // Generate insights
    const insights = [];
    if (route.profitMargin > 25) insights.push('High margin route');
    if (growthRate > 20) insights.push('Growing volume');
    if (route.uniqueCustomerCount === 1) insights.push('Single customer dependency');
    if (route.profitMargin < 10) insights.push('Low margin - review pricing');
    if (route.documentCompletionRate < 80) insights.push('Document compliance issue');
    if (route.orderCount < 3) insights.push('Low volume route');
    
    // Find top customer on this route
    const customerProfits = new Map();
    route.customers.forEach(c => {
      const current = customerProfits.get(c.customerId.toString()) || 0;
      customerProfits.set(c.customerId.toString(), current + c.profit);
    });
    const topCustomerEntry = Array.from(customerProfits.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    // Find top transporter on this route
    const transporterCosts = new Map();
    route.transporters.forEach(t => {
      if (t.transporterId) {
        const current = transporterCosts.get(t.transporterId.toString()) || { purchase: 0, count: 0 };
        transporterCosts.set(t.transporterId.toString(), {
          purchase: current.purchase + t.purchase,
          count: current.count + 1
        });
      }
    });
    const topTransporterEntry = Array.from(transporterCosts.entries())
      .sort((a, b) => b[1].count - a[1].count)[0];
    
    return {
      routeId: route._id,
      loadingCity: route.loadingCity,
      loadingState: route.loadingState,
      unloadingCity: route.unloadingCity,
      unloadingState: route.unloadingState,
      
      orderCount: route.orderCount,
      deliveryCount: route.deliveryCount,
      totalQuantity: route.totalQuantity,
      
      totalSales: route.totalSales,
      totalPurchase: route.totalPurchase,
      totalProfit: route.totalProfit,
      profitMargin: route.profitMargin,
      averageProfitPerOrder: route.averageProfitPerOrder,
      averageSalesPerOrder: route.averageSalesPerOrder,
      
      documentCompletionRate: route.documentCompletionRate,
      averageLRCharges: route.averageLRCharges,
      averageInvoiceCharges: route.averageInvoiceCharges,
      
      uniqueCustomers: route.uniqueCustomerCount,
      topCustomer: topCustomerEntry ? {
        customerId: topCustomerEntry[0],
        profit: topCustomerEntry[1],
        orderCount: route.customers.filter(c => c.customerId.toString() === topCustomerEntry[0]).length
      } : null,
      
      uniqueTransporters: route.uniqueTransporterCount,
      topTransporter: topTransporterEntry ? {
        transporterId: topTransporterEntry[0],
        avgCost: topTransporterEntry[1].purchase / topTransporterEntry[1].count,
        orderCount: topTransporterEntry[1].count
      } : null,
      
      growthRate: Math.round(growthRate * 10) / 10,
      routeScore: Math.round(routeScore),
      routeTier,
      insights
    };
  });
  
  // Calculate summary statistics
  const summary = {
    totalRoutes: enhancedRoutes.length,
    totalOrders: enhancedRoutes.reduce((sum, r) => sum + r.orderCount, 0),
    avgOrdersPerRoute: enhancedRoutes.length > 0 
      ? enhancedRoutes.reduce((sum, r) => sum + r.orderCount, 0) / enhancedRoutes.length 
      : 0,
    totalProfit: enhancedRoutes.reduce((sum, r) => sum + r.totalProfit, 0),
    avgProfitPerRoute: enhancedRoutes.length > 0
      ? enhancedRoutes.reduce((sum, r) => sum + r.totalProfit, 0) / enhancedRoutes.length
      : 0,
    tierDistribution: {
      core: enhancedRoutes.filter(r => r.routeTier === 'core').length,
      growth: enhancedRoutes.filter(r => r.routeTier === 'growth').length,
      stable: enhancedRoutes.filter(r => r.routeTier === 'stable').length,
      marginal: enhancedRoutes.filter(r => r.routeTier === 'marginal').length,
      unprofitable: enhancedRoutes.filter(r => r.routeTier === 'unprofitable').length
    }
  };
  
  // Top routes
  const topRoutes = {
    byProfit: [...enhancedRoutes].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 10),
    byVolume: [...enhancedRoutes].sort((a, b) => b.orderCount - a.orderCount).slice(0, 10),
    byMargin: [...enhancedRoutes].sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 10)
  };
  
  return res.status(200).json({
    routes: enhancedRoutes,
    summary,
    topRoutes
  });
}
```

---

### 3.1.2 Route Performance Table Component

**File:** `src/components/dashboard/RouteProfitabilityTable.js`

```javascript
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Button,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  TrendingUp,
  TrendingDown,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { fetchRouteProfitability } from 'slices/dashboardSlice';
import { formatCurrency } from 'utils/formatters';

const RouteProfitabilityTable = () => {
  const dispatch = useDispatch();
  const { routeProfitability, loading } = useSelector((state) => state.dashboard);
  const [sortBy, setSortBy] = useState('profit');
  const [minOrders, setMinOrders] = useState(1);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  
  useEffect(() => {
    dispatch(fetchRouteProfitability({ sortBy, minOrders }));
  }, [dispatch, sortBy, minOrders]);
  
  const getTierColor = (tier) => {
    const colors = {
      core: 'success',
      growth: 'info',
      stable: 'primary',
      marginal: 'warning',
      unprofitable: 'error'
    };
    return colors[tier] || 'default';
  };
  
  const getTierIcon = (tier) => {
    const icons = {
      core: '🎯',
      growth: '📈',
      stable: '✅',
      marginal: '⚠️',
      unprofitable: '🚫'
    };
    return icons[tier] || '';
  };
  
  const columns = [
    {
      field: 'routeId',
      headerName: 'Route',
      width: 250,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {params.row.loadingCity} → {params.row.unloadingCity}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.loadingState && params.row.unloadingState
              ? `${params.row.loadingState} → ${params.row.unloadingState}`
              : ''}
          </Typography>
        </Box>
      )
    },
    {
      field: 'routeScore',
      headerName: 'Score',
      width: 100,
      align: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value >= 75 ? 'success' : params.value >= 40 ? 'warning' : 'error'}
          size="small"
          sx={{ fontWeight: 700 }}
        />
      )
    },
    {
      field: 'routeTier',
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
      align: 'right',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'totalProfit',
      headerName: 'Total Profit',
      width: 130,
      align: 'right',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600} color="success.main">
          {formatCurrency(params.value)}
        </Typography>
      )
    },
    {
      field: 'averageProfitPerOrder',
      headerName: 'Avg Profit',
      width: 120,
      align: 'right',
      renderCell: (params) => formatCurrency(params.value)
    },
    {
      field: 'profitMargin',
      headerName: 'Margin',
      width: 90,
      align: 'right',
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.value >= 20 ? 'success.main' : params.value >= 10 ? 'text.primary' : 'error.main'}
        >
          {params.value.toFixed(1)}%
        </Typography>
      )
    },
    {
      field: 'growthRate',
      headerName: 'Growth',
      width: 110,
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
      field: 'uniqueCustomers',
      headerName: 'Customers',
      width: 100,
      align: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 1 ? 'warning' : 'default'}
        />
      )
    },
    {
      field: 'documentCompletionRate',
      headerName: 'Doc Rate',
      width: 100,
      align: 'right',
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.value >= 90 ? 'success.main' : params.value >= 70 ? 'warning.main' : 'error.main'}
        >
          {params.value.toFixed(0)}%
        </Typography>
      )
    },
    {
      field: 'insights',
      headerName: 'Insights',
      width: 100,
      align: 'center',
      renderCell: (params) => (
        params.value.length > 0 ? (
          <Tooltip title={params.value.join(', ')}>
            <Chip
              label={`${params.value.length} insights`}
              size="small"
              color="info"
              icon={<InfoIcon />}
            />
          </Tooltip>
        ) : null
      )
    }
  ];
  
  const handleExport = () => {
    // Export to CSV logic
    const csv = [
      columns.map(col => col.headerName).join(','),
      ...routeProfitability.routes.map(route =>
        columns.map(col => route[col.field]).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-profitability-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6">Route Profitability Analysis</Typography>
            <Typography variant="body2" color="text.secondary">
              {routeProfitability.summary?.totalRoutes} active routes • 
              {formatCurrency(routeProfitability.summary?.totalProfit)} total profit
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Sort toggle */}
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={(e, value) => value && setSortBy(value)}
              size="small"
            >
              <ToggleButton value="profit">Profit</ToggleButton>
              <ToggleButton value="orders">Volume</ToggleButton>
              <ToggleButton value="margin">Margin</ToggleButton>
            </ToggleButtonGroup>
            
            {/* Filter menu */}
            <IconButton
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              size="small"
            >
              <FilterListIcon />
            </IconButton>
            <Menu
              anchorEl={filterMenuAnchor}
              open={Boolean(filterMenuAnchor)}
              onClose={() => setFilterMenuAnchor(null)}
            >
              <MenuItem onClick={() => { setMinOrders(1); setFilterMenuAnchor(null); }}>
                All routes (1+ orders)
              </MenuItem>
              <MenuItem onClick={() => { setMinOrders(3); setFilterMenuAnchor(null); }}>
                Established routes (3+ orders)
              </MenuItem>
              <MenuItem onClick={() => { setMinOrders(5); setFilterMenuAnchor(null); }}>
                High volume routes (5+ orders)
              </MenuItem>
              <MenuItem onClick={() => { setMinOrders(10); setFilterMenuAnchor(null); }}>
                Major routes (10+ orders)
              </MenuItem>
            </Menu>
            
            {/* Export button */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Box>
        </Box>
        
        {/* Tier summary chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Chip
            label={`🎯 ${routeProfitability.summary?.tierDistribution.core || 0} Core`}
            color="success"
            size="small"
          />
          <Chip
            label={`📈 ${routeProfitability.summary?.tierDistribution.growth || 0} Growth`}
            color="info"
            size="small"
          />
          <Chip
            label={`✅ ${routeProfitability.summary?.tierDistribution.stable || 0} Stable`}
            color="primary"
            size="small"
          />
          <Chip
            label={`⚠️ ${routeProfitability.summary?.tierDistribution.marginal || 0} Marginal`}
            color="warning"
            size="small"
          />
          <Chip
            label={`🚫 ${routeProfitability.summary?.tierDistribution.unprofitable || 0} Unprofitable`}
            color="error"
            size="small"
          />
        </Box>
        
        {/* Data table */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={routeProfitability.routes || []}
            columns={columns}
            getRowId={(row) => row.routeId}
            loading={loading}
            pageSize={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
            disableSelectionOnClick
            onRowClick={(params) => {
              // Navigate to route detail view
              handleRouteDetailView(params.row.routeId);
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

export default RouteProfitabilityTable;
```

---

## 3.2 Route Profitability Heatmap

### Purpose
Provide visual matrix showing profitability across loading/unloading city combinations

**Alternative to Map Visualization:**
- Easier to compare routes at a glance
- No geolocation API needed
- Better for dense route networks
- Supports drill-down to specific route details

### Component Structure

**File:** `src/components/dashboard/RouteProfitabilityHeatmap.js`

```javascript
import { Box, Card, CardContent, Typography, Tooltip } from '@mui/material';
import { useSelector } from 'react-redux';
import { formatCurrency } from 'utils/formatters';

const RouteProfitabilityHeatmap = () => {
  const { routeProfitability } = useSelector((state) => state.dashboard);
  
  // Extract unique cities
  const loadingCities = [...new Set(routeProfitability.routes?.map(r => r.loadingCity))].slice(0, 15);
  const unloadingCities = [...new Set(routeProfitability.routes?.map(r => r.unloadingCity))].slice(0, 15);
  
  // Create matrix
  const matrix = loadingCities.map(loadingCity => {
    return unloadingCities.map(unloadingCity => {
      const route = routeProfitability.routes?.find(
        r => r.loadingCity === loadingCity && r.unloadingCity === unloadingCity
      );
      return route || null;
    });
  });
  
  // Calculate color based on profit
  const getColor = (route) => {
    if (!route) return '#f3f4f6';
    const maxProfit = Math.max(...(routeProfitability.routes?.map(r => r.totalProfit) || [1]));
    const intensity = route.totalProfit / maxProfit;
    
    if (route.totalProfit < 0) return '#fee2e2'; // Light red for losses
    
    // Green gradient based on profit
    const greenShades = [
      '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', 
      '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534'
    ];
    const index = Math.min(Math.floor(intensity * greenShades.length), greenShades.length - 1);
    return greenShades[index];
  };
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Route Profitability Matrix
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Hover over cells to see details. Darker green = higher profit.
        </Typography>
        
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'inline-block', minWidth: 'max-content' }}>
            {/* Header row */}
            <Box sx={{ display: 'flex' }}>
              <Box sx={{ width: 120, p: 1 }} /> {/* Empty corner */}
              {unloadingCities.map(city => (
                <Box
                  key={city}
                  sx={{
                    width: 80,
                    p: 1,
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                >
                  <Box sx={{ transform: 'rotate(-45deg)', transformOrigin: 'center' }}>
                    {city}
                  </Box>
                </Box>
              ))}
            </Box>
            
            {/* Data rows */}
            {matrix.map((row, i) => (
              <Box key={loadingCities[i]} sx={{ display: 'flex' }}>
                {/* Row header */}
                <Box
                  sx={{
                    width: 120,
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                >
                  {loadingCities[i]}
                </Box>
                
                {/* Data cells */}
                {row.map((route, j) => (
                  <Tooltip
                    key={`${i}-${j}`}
                    title={
                      route ? (
                        <Box>
                          <Typography variant="subtitle2">
                            {route.loadingCity} → {route.unloadingCity}
                          </Typography>
                          <Typography variant="caption">
                            Orders: {route.orderCount}
                          </Typography>
                          <br />
                          <Typography variant="caption">
                            Profit: {formatCurrency(route.totalProfit)}
                          </Typography>
                          <br />
                          <Typography variant="caption">
                            Margin: {route.profitMargin.toFixed(1)}%
                          </Typography>
                        </Box>
                      ) : 'No orders on this route'
                    }
                  >
                    <Box
                      sx={{
                        width: 80,
                        height: 60,
                        backgroundColor: getColor(route),
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: route ? 'pointer' : 'default',
                        '&:hover': route ? {
                          boxShadow: 2,
                          zIndex: 1
                        } : {}
                      }}
                      onClick={() => route && handleRouteClick(route.routeId)}
                    >
                      {route && (
                        <>
                          <Typography variant="caption" fontWeight={600}>
                            {route.orderCount}
                          </Typography>
                          <Typography variant="caption" fontSize="0.65rem">
                            {formatCurrency(route.totalProfit, false)}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* Legend */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
          <Typography variant="caption">Profit:</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 20, height: 20, backgroundColor: '#f0fdf4' }} />
            <Typography variant="caption">Low</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 20, height: 20, backgroundColor: '#22c55e' }} />
            <Typography variant="caption">Medium</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 20, height: 20, backgroundColor: '#166534' }} />
            <Typography variant="caption">High</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 20, height: 20, backgroundColor: '#fee2e2' }} />
            <Typography variant="caption">Loss</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RouteProfitabilityHeatmap;
```

---

## 3.3 City-wise Performance Analysis

### Purpose
Analyze performance by origin and destination cities separately

### 3.3.1 City Performance Dashboard

**Backend Endpoint:** `GET /api/analytics/city-performance`

**Query Parameters:**
- `account`, `organization`, `startDate`, `endDate`
- `type` - 'origin' | 'destination' | 'both'

**Response Structure:**
```javascript
{
  originCities: [
    {
      cityName: String,
      stateName: String,
      orderCount: Number,
      routeCount: Number,        // Number of unique destinations from this city
      totalProfit: Number,
      totalSales: Number,
      profitMargin: Number,
      uniqueCustomers: Number,
      topDestination: {
        cityName: String,
        orderCount: Number
      }
    }
  ],
  
  destinationCities: [
    {
      cityName: String,
      stateName: String,
      orderCount: Number,
      routeCount: Number,        // Number of unique origins to this city
      totalProfit: Number,
      totalSales: Number,
      profitMargin: Number,
      uniqueCustomers: Number,
      topOrigin: {
        cityName: String,
        orderCount: Number
      }
    }
  ]
}
```

### 3.3.2 Top Cities Bar Chart

**Component:** Horizontal bar chart showing top 10 cities by profit (origin and destination separate)

```javascript
const CityPerformanceCharts = () => {
  const { cityPerformance } = useSelector((state) => state.dashboard);
  
  // Origin cities chart
  const originSeries = [{
    name: 'Profit',
    data: cityPerformance.originCities?.slice(0, 10).map(city => ({
      x: city.cityName,
      y: city.totalProfit,
      meta: city
    })) || []
  }];
  
  // Destination cities chart
  const destinationSeries = [{
    name: 'Profit',
    data: cityPerformance.destinationCities?.slice(0, 10).map(city => ({
      x: city.cityName,
      y: city.totalProfit,
      meta: city
    })) || []
  }];
  
  const chartOptions = {
    chart: {
      type: 'bar'
    },
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: {
          position: 'top'
        }
      }
    },
    colors: ['#10B981'],
    xaxis: {
      labels: {
        formatter: (val) => formatCurrency(val, false)
      }
    },
    tooltip: {
      custom: ({ dataPointIndex, w }) => {
        const city = w.config.series[0].data[dataPointIndex].meta;
        return `
          <div style="padding: 12px">
            <div style="font-weight: 600">${city.cityName}</div>
            <div>Orders: ${city.orderCount}</div>
            <div>Profit: ${formatCurrency(city.totalProfit)}</div>
            <div>Margin: ${city.profitMargin.toFixed(1)}%</div>
            <div>Routes: ${city.routeCount}</div>
          </div>
        `;
      }
    }
  };
  
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Top Origin Cities (Loading)
          </Typography>
          <Box sx={{ height: 400 }}>
            <Chart
              type="bar"
              series={originSeries}
              options={chartOptions}
              height={400}
            />
          </Box>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Top Destination Cities (Unloading)
          </Typography>
          <Box sx={{ height: 400 }}>
            <Chart
              type="bar"
              series={destinationSeries}
              options={chartOptions}
              height={400}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
```

---

## 3.4 Market Concentration Analysis

### Purpose
Identify geographic concentration and diversification opportunities

### Components

**1. Geographic Distribution Pie Chart**
- Sales by top 10 cities (origin)
- Identify over-reliance on specific markets

**2. Concentration Risk Metrics**
- Herfindahl-Hirschman Index (HHI) for market concentration
- % of business from top 3/5/10 cities
- Diversification score

**3. Expansion Opportunities**
- Cities with few orders but high profit per order
- Underserved routes with potential

---

## 3.5 Route Detail View

### Purpose
Comprehensive drill-down when clicking on a route

**Modal/Page Components:**

1. **Route Header**
   - Loading City → Unloading City
   - Route score and tier
   - Quick metrics (orders, profit, margin)

2. **Financial Summary**
   - Revenue breakdown
   - Cost analysis
   - Profit trend chart

3. **Order History Table**
   - All orders on this route
   - Customer breakdown
   - Transporter usage

4. **Customer Analysis**
   - Which customers use this route most
   - Customer-specific profitability on route

5. **Transporter Analysis**
   - Transporter comparison on this route
   - Cost trends over time

6. **Recommendations**
   - Pricing optimization suggestions
   - Volume increase opportunities
   - Risk mitigation (if single customer/transporter)

---

## Redux Integration

### State Structure

```javascript
// Add to dashboardSlice.js
{
  routeProfitability: {
    data: { routes: [], summary: {}, topRoutes: {} },
    loading: false,
    error: null
  },
  
  cityPerformance: {
    data: { originCities: [], destinationCities: [] },
    loading: false,
    error: null
  },
  
  routeDetail: {
    data: null,
    loading: false,
    error: null
  }
}
```

### Thunks

```javascript
export const fetchRouteProfitability = createAsyncThunk(
  'dashboard/fetchRouteProfitability',
  async ({ sortBy, minOrders }, { getState, rejectWithValue }) => {
    const { selectedOrganization, dateRange } = getState().dashboard;
    const { currentAccount } = getState().auth;
    
    try {
      const response = await analyticsApi.getRouteProfitability({
        account: currentAccount,
        organization: selectedOrganization,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        sortBy,
        minOrders
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCityPerformance = createAsyncThunk(/*...*/);
export const fetchRouteDetail = createAsyncThunk(/*...*/);
```

---

## Database Indexes for Phase 3

```javascript
// Optimize route queries
db.orders.createIndex({ 
  'deliveries.loading.city': 1, 
  'deliveries.unloading.city': 1,
  account: 1,
  saleDate: -1
});

// Compound index for organization filter
db.orders.createIndex({
  account: 1,
  organisation: 1,
  'deliveries.loading.city': 1,
  'deliveries.unloading.city': 1
});
```

---

## Future Enhancements (Post Phase 3)

### Geographic Map Visualization
**When to implement:** After Phase 3 proven valuable

**Requirements:**
- Integrate Google Maps API or Mapbox
- Geocode city names to lat/long
- Draw routes with color-coded lines
- Interactive markers for cities

**Benefits:**
- Visual appeal
- Geographic patterns easier to spot
- Better for presentations

**Complexity:** Medium-High (requires external API integration)

### Distance-based Analysis
**When to implement:** If distance data becomes available

**Features:**
- Per-km profitability
- Optimal route suggestions
- Fuel efficiency tracking
- Return trip optimization

**Requirements:**
- Distance API integration (Google Distance Matrix)
- Store distance for each route
- Historical distance tracking

---

## Testing Requirements

### Unit Tests
- [ ] City name normalization function
- [ ] Route score calculation accuracy
- [ ] Route tier classification logic
- [ ] Heatmap color calculation

### Integration Tests
- [ ] Route profitability API with various filters
- [ ] City performance API
- [ ] Handle missing location data gracefully
- [ ] Organization filter works correctly

### Performance Tests
- [ ] Route aggregation completes in <2s
- [ ] Heatmap renders smoothly with 100+ routes
- [ ] Table sorting/filtering is instant

### Data Quality Tests
- [ ] Handle null/undefined city names
- [ ] Handle routes with same loading/unloading city
- [ ] Validate route metrics calculations
- [ ] Test with production data variations

---

## Deployment Checklist - Phase 3

### Backend
- [ ] Create `/api/analytics/route-profitability` endpoint
- [ ] Create `/api/analytics/city-performance` endpoint
- [ ] Create `/api/analytics/route-detail/:routeId` endpoint
- [ ] Implement city name normalization helper
- [ ] Add database indexes for route queries
- [ ] Test with real production data
- [ ] Optimize aggregation pipeline performance

### Frontend
- [ ] Build `RouteProfitabilityTable` component
- [ ] Build `RouteProfitabilityHeatmap` component
- [ ] Build `CityPerformanceCharts` component
- [ ] Build `RouteDetailView` component
- [ ] Add to dashboard page layout
- [ ] Implement drill-down navigation
- [ ] Add export functionality
- [ ] Test responsive design

### Data Quality
- [ ] Audit location data consistency
- [ ] Document city name standardization
- [ ] Create data cleanup utilities
- [ ] Add validation for new orders

### Integration
- [ ] Connect components to Redux
- [ ] Implement thunks for data fetching
- [ ] Add loading states and error handling
- [ ] Test with organization filter
- [ ] Test with date range changes
- [ ] Verify calculations match expected results

---

## End of Phase 3 Documentation

**Status:** ✅ Complete and ready for review

**Next Phase:** Phase 4 - Time-Series & Trend Analysis

**Estimated Implementation Time:**
- Route profitability backend: 8-10 hours
- Route profitability frontend: 8-10 hours
- City performance analysis: 4-6 hours
- Heatmap visualization: 4-6 hours
- Route detail view: 4-6 hours
- Testing & optimization: 6-8 hours
- **Total: 34-46 hours (4-6 working days)**

**Key Success Metrics:**
- Identify top 10 routes contributing 80% of profit
- Detect unprofitable routes for discontinuation
- Reduce single-customer route dependency by 30%
- Increase route utilization by 15% through insights