# Phase 5: Operational Efficiency Analytics

**Timeline:** Week 9-10  
**Goal:** Optimize resource utilization and operational costs through detailed efficiency metrics  
**Status:** 📋 Planning  
**Prerequisites:** Phase 1-4 completed

---

## Overview

Phase 5 focuses on operational efficiency and resource optimization to:
1. Maximize fleet utilization and minimize idle time
2. Analyze expense patterns and identify cost-saving opportunities
3. Monitor driver performance and workload distribution
4. Track document processing efficiency
5. Identify bottlenecks in operational workflows
6. Enable data-driven resource allocation decisions

---

## 5.1 Fleet Utilization Dashboard

### Purpose
Comprehensive analysis of vehicle usage, efficiency, and profitability

### 5.1.1 Fleet Overview Metrics

**Backend Endpoint:** `GET /api/analytics/fleet-utilization`

**Query Parameters:**
- `account` (required)
- `organization` (optional)
- `startDate` (required)
- `endDate` (required)
- `vehicleId` (optional) - Filter specific vehicle

**Response Structure:**
```javascript
{
  fleetSummary: {
    totalVehicles: Number,
    activeVehicles: Number,        // Vehicles with at least 1 order
    idleVehicles: Number,          // Vehicles with 0 orders
    utilizationRate: Number,       // % of vehicles actively used
    avgOrdersPerVehicle: Number,
    totalRevenue: Number,
    avgRevenuePerVehicle: Number
  },
  
  vehicles: [
    {
      vehicleId: ObjectId,
      vehicleNumber: String,
      make: String,
      model: String,
      condition: String,
      yearOfPurchase: Number,
      
      // Usage metrics
      orderCount: Number,
      deliveryCount: Number,
      totalQuantity: Number,         // Total tons/units transported
      activeDays: Number,            // Days with at least 1 order
      totalDaysInPeriod: Number,
      utilizationRate: Number,       // activeDays / totalDaysInPeriod
      
      // Financial metrics
      totalRevenue: Number,          // Purchase cost (what you pay transporter)
      totalExpenses: Number,         // Vehicle-related expenses
      netCost: Number,               // Revenue + Expenses
      avgCostPerOrder: Number,
      avgCostPerDay: Number,
      
      // Efficiency metrics
      avgOrdersPerActiveDay: Number,
      avgQuantityPerOrder: Number,
      avgDistancePerDay: Number,     // If distance tracking added
      
      // Route analysis
      uniqueRoutes: Number,
      topRoute: {
        routeId: String,
        orderCount: Number,
        revenue: Number
      },
      
      // Driver analysis
      uniqueDrivers: Number,
      primaryDriver: {
        driverId: ObjectId,
        name: String,
        orderCount: Number
      },
      
      // Performance trends
      utilizationTrend: Array,       // Weekly utilization %
      revenueTrend: Array,           // Weekly revenue
      
      // Scoring
      efficiencyScore: Number,       // 0-100 composite score
      performanceTier: String,       // 'excellent', 'good', 'average', 'poor'
      
      // Insights
      insights: Array<String>,       // ["Underutilized", "High cost per order", etc.]
      recommendations: Array<String> // ["Increase workload", "Optimize routes", etc.]
    }
  ],
  
  utilizationDistribution: {
    excellent: Number,    // 80-100% utilization
    good: Number,         // 60-79%
    average: Number,      // 40-59%
    poor: Number,         // 20-39%
    critical: Number      // 0-19%
  },
  
  idleVehiclesList: [
    {
      vehicleId: ObjectId,
      vehicleNumber: String,
      lastUsedDate: Date,
      daysSinceLastUse: Number,
      condition: String
    }
  ],
  
  topPerformers: {
    byUtilization: Array,    // Top 5 most utilized vehicles
    byRevenue: Array,        // Top 5 highest revenue vehicles
    byEfficiency: Array      // Top 5 by efficiency score
  }
}
```

**Vehicle Efficiency Score Calculation (0-100):**

**Components:**

1. **Utilization Score (35% weight)**
   - Formula: `(activeDays / totalDaysInPeriod) × 35`
   - Measures how frequently vehicle is used

2. **Order Volume Score (25% weight)**
   - Formula: `min(orderCount / 30, 1) × 25`
   - Based on order count (normalized to 30 orders = 100%)

3. **Cost Efficiency Score (25% weight)**
   - Formula: `(1 - (avgCostPerOrder / maxCostPerOrder)) × 25`
   - Lower cost per order = higher score

4. **Route Diversity Score (10% weight)**
   - Formula: `min(uniqueRoutes / 10, 1) × 10`
   - More routes = more flexibility

5. **Consistency Score (5% weight)**
   - Formula: `(1 - coefficientOfVariation) × 5`
   - Less day-to-day variation = more predictable

**Performance Tier Classification:**
- **Excellent (80-100):** High utilization, low cost, consistent performance
- **Good (60-79):** Above average utilization and efficiency
- **Average (40-59):** Meets basic requirements, room for improvement
- **Poor (20-39):** Underutilized or high cost
- **Critical (0-19):** Rarely used or very inefficient

**API Implementation:**

```javascript
// src/pages/api/analytics/fleet-utilization.js

import { connectToDatabase } from 'lib/mongodb';
import { calculateOrderFinancials } from 'helper/orderCalculations';
import moment from 'moment';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const {
    account,
    organization,
    startDate,
    endDate,
    vehicleId
  } = req.query;
  
  const { db } = await connectToDatabase();
  
  const periodDays = moment(endDate).diff(moment(startDate), 'days') + 1;
  
  // Get all vehicles in organization
  const vehicleQuery = { account };
  if (organization) {
    vehicleQuery.organisation = organization;
  }
  if (vehicleId) {
    vehicleQuery._id = vehicleId;
  }
  
  const allVehicles = await db.collection('vehicles')
    .find(vehicleQuery)
    .project({ 
      _id: 1, 
      vehicleNumber: 1, 
      make: 1, 
      model: 1, 
      condition: 1,
      yearOfPurchase: 1 
    })
    .toArray();
  
  // Aggregate vehicle usage
  const vehicleUsagePipeline = [
    {
      $match: {
        account,
        saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        vehicle: { $exists: true, $ne: null }
      }
    },
    // Lookup vehicle details
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicle',
        foreignField: '_id',
        as: 'vehicleData'
      }
    },
    {
      $unwind: '$vehicleData'
    }
  ];
  
  // Add organization filter if specified
  if (organization) {
    vehicleUsagePipeline.push({
      $match: {
        $or: [
          { organisation: organization },
          { 'vehicleData.organisation': organization }
        ]
      }
    });
  }
  
  vehicleUsagePipeline.push(
    // Calculate financials
    {
      $addFields: {
        financials: {
          $function: {
            body: calculateOrderFinancials.toString(),
            args: ['$$ROOT'],
            lang: 'js'
          }
        },
        deliveryCount: { $size: { $ifNull: ['$deliveries', []] } },
        totalQuantity: {
          $reduce: {
            input: { $ifNull: ['$deliveries', []] },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.billQuantity', 0] }] }
          }
        },
        // Vehicle expenses (subset of orderExpenses tagged to vehicle)
        vehicleExpenses: {
          $reduce: {
            input: { 
              $filter: {
                input: { $ifNull: ['$orderExpenses', []] },
                as: 'expense',
                cond: { 
                  $or: [
                    { $regexMatch: { input: '$$expense.expenseType', regex: /fuel|maintenance|toll|parking/i } }
                  ]
                }
              }
            },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] }
          }
        },
        // Create route identifier
        routeId: {
          $concat: [
            { $ifNull: ['$deliveries.0.loading.city', 'Unknown'] },
            ' → ',
            { $ifNull: ['$deliveries.0.unloading.city', 'Unknown'] }
          ]
        },
        // Extract date for active days calculation
        orderDate: {
          $dateToString: { format: '%Y-%m-%d', date: '$saleDate' }
        }
      }
    },
    // Group by vehicle
    {
      $group: {
        _id: '$vehicle',
        vehicleNumber: { $first: '$vehicleData.vehicleNumber' },
        make: { $first: '$vehicleData.make' },
        model: { $first: '$vehicleData.model' },
        condition: { $first: '$vehicleData.condition' },
        yearOfPurchase: { $first: '$vehicleData.yearOfPurchase' },
        
        // Usage metrics
        orderCount: { $sum: 1 },
        deliveryCount: { $sum: '$deliveryCount' },
        totalQuantity: { $sum: '$totalQuantity' },
        activeDates: { $addToSet: '$orderDate' },
        
        // Financial metrics
        totalRevenue: { $sum: '$financials.totalPurchase' },
        totalExpenses: { $sum: '$vehicleExpenses' },
        revenues: { $push: '$financials.totalPurchase' },
        
        // Route analysis
        uniqueRoutes: { $addToSet: '$routeId' },
        routes: {
          $push: {
            routeId: '$routeId',
            revenue: '$financials.totalPurchase'
          }
        },
        
        // Driver analysis
        uniqueDrivers: { $addToSet: '$driver' },
        drivers: {
          $push: {
            driverId: '$driver',
            orderCount: 1
          }
        },
        
        // For trend calculation
        orders: {
          $push: {
            date: '$saleDate',
            revenue: '$financials.totalPurchase'
          }
        }
      }
    },
    // Calculate derived metrics
    {
      $addFields: {
        activeDays: { $size: '$activeDates' },
        totalDaysInPeriod: periodDays,
        utilizationRate: {
          $multiply: [
            { $divide: [{ $size: '$activeDates' }, periodDays] },
            100
          ]
        },
        netCost: { $add: ['$totalRevenue', '$totalExpenses'] },
        avgCostPerOrder: { $divide: ['$totalRevenue', '$orderCount'] },
        avgCostPerDay: { $divide: ['$totalRevenue', { $size: '$activeDates' }] },
        avgOrdersPerActiveDay: { $divide: ['$orderCount', { $size: '$activeDates' }] },
        avgQuantityPerOrder: { $divide: ['$totalQuantity', '$orderCount'] },
        uniqueRouteCount: { $size: '$uniqueRoutes' },
        uniqueDriverCount: { $size: '$uniqueDrivers' }
      }
    },
    {
      $sort: { utilizationRate: -1 }
    }
  );
  
  const activeVehicles = await db.collection('orders')
    .aggregate(vehicleUsagePipeline)
    .toArray();
  
  // Calculate max cost for normalization
  const maxCostPerOrder = Math.max(
    ...activeVehicles.map(v => v.avgCostPerOrder),
    1
  );
  
  // Enhance vehicle data with scores and insights
  const enhancedVehicles = activeVehicles.map(vehicle => {
    // Calculate efficiency score
    const utilizationScore = (vehicle.activeDays / periodDays) * 35;
    const volumeScore = Math.min(vehicle.orderCount / 30, 1) * 25;
    const costEfficiencyScore = (1 - (vehicle.avgCostPerOrder / maxCostPerOrder)) * 25;
    const routeDiversityScore = Math.min(vehicle.uniqueRouteCount / 10, 1) * 10;
    
    // Calculate consistency (coefficient of variation)
    const avgRevenue = vehicle.totalRevenue / vehicle.orderCount;
    const variance = vehicle.revenues.reduce((sum, r) => 
      sum + Math.pow(r - avgRevenue, 2), 0
    ) / vehicle.revenues.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avgRevenue;
    const consistencyScore = (1 - Math.min(cv, 1)) * 5;
    
    const efficiencyScore = Math.round(
      utilizationScore + volumeScore + costEfficiencyScore + 
      routeDiversityScore + consistencyScore
    );
    
    // Determine performance tier
    let performanceTier;
    if (efficiencyScore >= 80) performanceTier = 'excellent';
    else if (efficiencyScore >= 60) performanceTier = 'good';
    else if (efficiencyScore >= 40) performanceTier = 'average';
    else if (efficiencyScore >= 20) performanceTier = 'poor';
    else performanceTier = 'critical';
    
    // Generate insights
    const insights = [];
    const recommendations = [];
    
    if (vehicle.utilizationRate < 40) {
      insights.push('Underutilized vehicle');
      recommendations.push('Increase workload or consider fleet reduction');
    }
    if (vehicle.utilizationRate > 85) {
      insights.push('High utilization - potential overwork');
      recommendations.push('Monitor for maintenance needs');
    }
    if (vehicle.avgCostPerOrder > avgRevenue * 1.2) {
      insights.push('High cost per order');
      recommendations.push('Review pricing or route optimization');
    }
    if (vehicle.uniqueRouteCount === 1) {
      insights.push('Limited to single route');
      recommendations.push('Explore route diversification');
    }
    if (vehicle.uniqueDriverCount > 5) {
      insights.push('Multiple drivers assigned');
      recommendations.push('Consider primary driver assignment');
    }
    if (vehicle.condition === 'poor') {
      insights.push('Vehicle in poor condition');
      recommendations.push('Schedule maintenance or replacement');
    }
    
    // Find top route
    const routeRevenues = vehicle.routes.reduce((acc, r) => {
      acc[r.routeId] = (acc[r.routeId] || 0) + r.revenue;
      return acc;
    }, {});
    const topRouteEntry = Object.entries(routeRevenues)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Find primary driver
    const driverCounts = vehicle.drivers.reduce((acc, d) => {
      if (d.driverId) {
        acc[d.driverId.toString()] = (acc[d.driverId.toString()] || 0) + 1;
      }
      return acc;
    }, {});
    const primaryDriverEntry = Object.entries(driverCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Calculate weekly utilization trend (simplified)
    const weeks = Math.ceil(periodDays / 7);
    const utilizationTrend = Array(weeks).fill(0);
    vehicle.orders.forEach(order => {
      const weekIndex = Math.floor(
        moment(order.date).diff(moment(startDate), 'days') / 7
      );
      if (weekIndex >= 0 && weekIndex < weeks) {
        utilizationTrend[weekIndex]++;
      }
    });
    
    // Calculate weekly revenue trend
    const revenueTrend = Array(weeks).fill(0);
    vehicle.orders.forEach(order => {
      const weekIndex = Math.floor(
        moment(order.date).diff(moment(startDate), 'days') / 7
      );
      if (weekIndex >= 0 && weekIndex < weeks) {
        revenueTrend[weekIndex] += order.revenue;
      }
    });
    
    return {
      vehicleId: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber,
      make: vehicle.make,
      model: vehicle.model,
      condition: vehicle.condition,
      yearOfPurchase: vehicle.yearOfPurchase,
      
      orderCount: vehicle.orderCount,
      deliveryCount: vehicle.deliveryCount,
      totalQuantity: vehicle.totalQuantity,
      activeDays: vehicle.activeDays,
      totalDaysInPeriod: periodDays,
      utilizationRate: Math.round(vehicle.utilizationRate * 10) / 10,
      
      totalRevenue: vehicle.totalRevenue,
      totalExpenses: vehicle.totalExpenses,
      netCost: vehicle.netCost,
      avgCostPerOrder: vehicle.avgCostPerOrder,
      avgCostPerDay: vehicle.avgCostPerDay,
      
      avgOrdersPerActiveDay: Math.round(vehicle.avgOrdersPerActiveDay * 10) / 10,
      avgQuantityPerOrder: Math.round(vehicle.avgQuantityPerOrder * 10) / 10,
      
      uniqueRoutes: vehicle.uniqueRouteCount,
      topRoute: topRouteEntry ? {
        routeId: topRouteEntry[0],
        orderCount: vehicle.routes.filter(r => r.routeId === topRouteEntry[0]).length,
        revenue: topRouteEntry[1]
      } : null,
      
      uniqueDrivers: vehicle.uniqueDriverCount,
      primaryDriver: primaryDriverEntry ? {
        driverId: primaryDriverEntry[0],
        orderCount: primaryDriverEntry[1]
      } : null,
      
      utilizationTrend,
      revenueTrend,
      
      efficiencyScore,
      performanceTier,
      insights,
      recommendations
    };
  });
  
  // Identify idle vehicles (not in activeVehicles)
  const activeVehicleIds = new Set(activeVehicles.map(v => v._id.toString()));
  const idleVehicles = allVehicles
    .filter(v => !activeVehicleIds.has(v._id.toString()))
    .map(v => ({
      vehicleId: v._id,
      vehicleNumber: v.vehicleNumber,
      condition: v.condition,
      lastUsedDate: null,  // Would need to query historical data
      daysSinceLastUse: null
    }));
  
  // Calculate fleet summary
  const fleetSummary = {
    totalVehicles: allVehicles.length,
    activeVehicles: activeVehicles.length,
    idleVehicles: idleVehicles.length,
    utilizationRate: allVehicles.length > 0 
      ? (activeVehicles.length / allVehicles.length) * 100 
      : 0,
    avgOrdersPerVehicle: activeVehicles.length > 0
      ? activeVehicles.reduce((sum, v) => sum + v.orderCount, 0) / activeVehicles.length
      : 0,
    totalRevenue: activeVehicles.reduce((sum, v) => sum + v.totalRevenue, 0),
    avgRevenuePerVehicle: activeVehicles.length > 0
      ? activeVehicles.reduce((sum, v) => sum + v.totalRevenue, 0) / activeVehicles.length
      : 0
  };
  
  // Utilization distribution
  const utilizationDistribution = {
    excellent: enhancedVehicles.filter(v => v.utilizationRate >= 80).length,
    good: enhancedVehicles.filter(v => v.utilizationRate >= 60 && v.utilizationRate < 80).length,
    average: enhancedVehicles.filter(v => v.utilizationRate >= 40 && v.utilizationRate < 60).length,
    poor: enhancedVehicles.filter(v => v.utilizationRate >= 20 && v.utilizationRate < 40).length,
    critical: enhancedVehicles.filter(v => v.utilizationRate < 20).length
  };
  
  // Top performers
  const topPerformers = {
    byUtilization: [...enhancedVehicles]
      .sort((a, b) => b.utilizationRate - a.utilizationRate)
      .slice(0, 5),
    byRevenue: [...enhancedVehicles]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5),
    byEfficiency: [...enhancedVehicles]
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
      .slice(0, 5)
  };
  
  return res.status(200).json({
    fleetSummary,
    vehicles: enhancedVehicles,
    utilizationDistribution,
    idleVehiclesList: idleVehicles,
    topPerformers
  });
}
```

---

### 5.1.2 Fleet Utilization Components

**File:** `src/components/dashboard/FleetUtilizationDashboard.js`

```javascript
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  DirectionsCar,
  TrendingUp,
  Warning,
  CheckCircle,
  Info as InfoIcon
} from '@mui/icons-material';
import Chart from 'react-apexcharts';
import { fetchFleetUtilization } from 'slices/dashboardSlice';
import { formatCurrency } from 'utils/formatters';

const FleetUtilizationDashboard = () => {
  const dispatch = useDispatch();
  const { fleetUtilization, loading } = useSelector((state) => state.dashboard);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  useEffect(() => {
    dispatch(fetchFleetUtilization());
  }, [dispatch]);
  
  if (!fleetUtilization.data) return null;
  
  const { fleetSummary, vehicles, utilizationDistribution, idleVehiclesList, topPerformers } = 
    fleetUtilization.data;
  
  const getTierColor = (tier) => {
    const colors = {
      excellent: 'success',
      good: 'info',
      average: 'primary',
      poor: 'warning',
      critical: 'error'
    };
    return colors[tier] || 'default';
  };
  
  const getUtilizationColor = (rate) => {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'info';
    if (rate >= 40) return 'primary';
    if (rate >= 20) return 'warning';
    return 'error';
  };
  
  // Fleet summary cards
  const summaryCards = [
    {
      title: 'Total Vehicles',
      value: fleetSummary.totalVehicles,
      subtitle: `${fleetSummary.activeVehicles} active • ${fleetSummary.idleVehicles} idle`,
      icon: <DirectionsCar />,
      color: 'primary'
    },
    {
      title: 'Fleet Utilization',
      value: `${fleetSummary.utilizationRate.toFixed(1)}%`,
      subtitle: `${fleetSummary.activeVehicles} of ${fleetSummary.totalVehicles} vehicles`,
      icon: <TrendingUp />,
      color: getUtilizationColor(fleetSummary.utilizationRate)
    },
    {
      title: 'Avg Orders/Vehicle',
      value: fleetSummary.avgOrdersPerVehicle.toFixed(1),
      subtitle: 'Active vehicles only',
      icon: <CheckCircle />,
      color: 'info'
    },
    {
      title: 'Total Fleet Cost',
      value: formatCurrency(fleetSummary.totalRevenue, false),
      subtitle: `${formatCurrency(fleetSummary.avgRevenuePerVehicle, false)} per vehicle`,
      icon: <DirectionsCar />,
      color: 'success'
    }
  ];
  
  // Utilization distribution chart
  const distributionChartOptions = {
    chart: { type: 'donut' },
    labels: ['Excellent (80-100%)', 'Good (60-79%)', 'Average (40-59%)', 'Poor (20-39%)', 'Critical (0-19%)'],
    colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
    legend: { position: 'bottom' },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Vehicles',
              formatter: () => vehicles.length
            }
          }
        }
      }
    }
  };
  
  const distributionSeries = [
    utilizationDistribution.excellent,
    utilizationDistribution.good,
    utilizationDistribution.average,
    utilizationDistribution.poor,
    utilizationDistribution.critical
  ];
  
  // DataGrid columns
  const columns = [
    {
      field: 'vehicleNumber',
      headerName: 'Vehicle',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.make} {params.row.model}
          </Typography>
        </Box>
      )
    },
    {
      field: 'efficiencyScore',
      headerName: 'Score',
      width: 90,
      align: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getTierColor(params.row.performanceTier)}
          size="small"
          sx={{ fontWeight: 700 }}
        />
      )
    },
    {
      field: 'utilizationRate',
      headerName: 'Utilization',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">{params.value}%</Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.activeDays}/{params.row.totalDaysInPeriod} days
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={params.value}
            color={getUtilizationColor(params.value)}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Box>
      )
    },
    {
      field: 'orderCount',
      headerName: 'Orders',
      width: 80,
      align: 'right'
    },
    {
      field: 'totalRevenue',
      headerName: 'Total Cost',
      width: 120,
      align: 'right',
      renderCell: (params) => formatCurrency(params.value)
    },
    {
      field: 'avgCostPerOrder',
      headerName: 'Avg Cost',
      width: 110,
      align: 'right',
      renderCell: (params) => formatCurrency(params.value)
    },
    {
      field: 'uniqueRoutes',
      headerName: 'Routes',
      width: 80,
      align: 'center'
    },
    {
      field: 'condition',
      headerName: 'Condition',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value || 'N/A'}
          size="small"
          color={params.value === 'good' ? 'success' : params.value === 'poor' ? 'error' : 'default'}
        />
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
              icon={<InfoIcon />}
              label={params.value.length}
              size="small"
              color="info"
            />
          </Tooltip>
        ) : null
      )
    }
  ];
  
  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${card.color}.lighter`,
                      color: `${card.color}.main`
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h4">{card.value}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Utilization Distribution & Idle Vehicles */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Utilization Distribution
              </Typography>
              <Chart
                type="donut"
                series={distributionSeries}
                options={distributionChartOptions}
                height={300}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Idle Vehicles ({idleVehiclesList.length})
              </Typography>
              {idleVehiclesList.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    All vehicles are being utilized
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
                  {idleVehiclesList.map(vehicle => (
                    <Box
                      key={vehicle.vehicleId}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {vehicle.vehicleNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Condition: {vehicle.condition || 'N/A'}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<Warning />}
                        label="No orders"
                        color="error"
                        size="small"
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Fleet Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Fleet Performance Details
          </Typography>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={vehicles}
              columns={columns}
              getRowId={(row) => row.vehicleId}
              loading={loading}
              pageSize={25}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              onRowClick={(params) => {
                setSelectedVehicle(params.row);
                setDetailDialogOpen(true);
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
      
      {/* Vehicle Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedVehicle && (
          <>
            <DialogTitle>
              {selectedVehicle.vehicleNumber} - Performance Details
            </DialogTitle>
            <DialogContent>
              {/* Detailed vehicle analytics would go here */}
              <Typography variant="body2">
                Detailed analytics for this vehicle...
              </Typography>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default FleetUtilizationDashboard;
```

---

## 5.2 Expense Analysis Dashboard

### Purpose
Comprehensive breakdown and analysis of operational expenses

### 5.2.1 Expense Categories & Trends

**Backend Endpoint:** `GET /api/analytics/expense-analysis`

**Query Parameters:**
- `account`, `organization`, `startDate`, `endDate`
- `groupBy` - 'category' | 'order' | 'vehicle' | 'time'

**Response Structure:**
```javascript
{
  expenseSummary: {
    totalExpenses: Number,
    expenseCategories: {
      fuel: Number,
      maintenance: Number,
      tolls: Number,
      parking: Number,
      labor: Number,
      loading: Number,
      unloading: Number,
      other: Number
    },
    expenseRatio: Number,           // Expenses / Revenue %
    avgExpensePerOrder: Number,
    avgExpensePerDelivery: Number
  },
  
  expensesByCategory: [
    {
      category: String,
      totalAmount: Number,
      orderCount: Number,
      percentage: Number,            // % of total expenses
      avgPerOrder: Number,
      trend: Array,                  // Weekly totals
      topExpenses: Array             // Largest individual expenses
    }
  ],
  
  expensesByOrder: [
    {
      orderId: ObjectId,
      orderNo: String,
      totalExpenses: Number,
      expenseRatio: Number,          // Expenses / Sales %
      breakdown: {
        fuel: Number,
        maintenance: Number,
        // ... other categories
      }
    }
  ],
  
  expensesByVehicle: [
    {
      vehicleId: ObjectId,
      vehicleNumber: String,
      totalExpenses: Number,
      orderCount: Number,
      avgExpensePerOrder: Number,
      categoryBreakdown: Object
    }
  ],
  
  expensesByTime: [
    {
      date: String,
      totalExpenses: Number,
      categoryBreakdown: Object
    }
  ],
  
  insights: [
    {
      type: 'high_expense_order' | 'category_spike' | 'vehicle_high_cost',
      severity: 'low' | 'medium' | 'high',
      message: String,
      details: Object
    }
  ]
}
```

### 5.2.2 Expense Breakdown Component

**Visualizations:**
1. **Expense Category Pie Chart** - Distribution by category
2. **Expense Trend Line Chart** - Time-series of expenses by category
3. **Expense Ratio Gauge** - Expense/Revenue ratio
4. **Top Expense Items Table** - Largest individual expenses
5. **Vehicle Cost Comparison** - Bar chart of vehicles by expense

---

## 5.3 Driver Performance Analytics

### Purpose
Analyze driver productivity, reliability, and workload distribution

### 5.3.1 Driver Metrics

**Backend Endpoint:** `GET /api/analytics/driver-performance`

**Response Structure:**
```javascript
{
  driverSummary: {
    totalDrivers: Number,
    activeDrivers: Number,
    avgOrdersPerDriver: Number,
    avgRevenuePerDriver: Number
  },
  
  drivers: [
    {
      driverId: ObjectId,
      name: String,
      mobile: String,
      
      // Volume metrics
      orderCount: Number,
      deliveryCount: Number,
      activeDays: Number,
      
      // Financial contribution
      totalRevenue: Number,        // Sales generated
      totalCost: Number,           // Purchase + expenses
      avgRevenuePerOrder: Number,
      
      // Efficiency metrics
      avgOrdersPerDay: Number,
      documentCompletionRate: Number,
      onTimeDeliveryRate: Number,  // If delivery dates tracked
      
      // Workload distribution
      primaryVehicles: Array,
      uniqueRoutes: Number,
      topRoute: Object,
      
      // Performance scoring
      performanceScore: Number,    // 0-100
      reliabilityTier: String,     // 'excellent', 'good', 'average', 'needs_improvement'
      
      // Trends
      orderTrend: Array,
      revenueTrend: Array
    }
  ],
  
  workloadDistribution: {
    balanced: Number,              // Drivers with average workload
    overloaded: Number,            // High workload
    underutilized: Number          // Low workload
  }
}
```

**Driver Performance Score (0-100):**
1. **Volume Score (30%)** - Order count normalized
2. **Efficiency Score (25%)** - Orders per active day
3. **Quality Score (25%)** - Document completion rate
4. **Consistency Score (20%)** - Day-to-day variation

---

## 5.4 Document Completion Tracking

### Purpose
Detailed tracking of LR and invoice completion status

### 5.4.1 Document Compliance Dashboard

**Expanded from Phase 1 with:**
- Completion timeline (how long to complete after order?)
- Aging analysis (orders without LR/invoice for X days)
- Completion rate by customer/route/vehicle
- Document error rate (if validation tracking exists)
- Bottleneck identification (which stage delays docs?)

**Component Structure:**
```javascript
const DocumentComplianceDashboard = () => {
  // Summary metrics
  // Aging table (orders grouped by days without docs)
  // Completion timeline histogram
  // Compliance by dimension (customer, route, vehicle)
  // Action items (prioritized list of pending docs)
};
```

---

## 5.5 Operational KPIs Dashboard

### Purpose
Consolidated view of all operational efficiency metrics

**Key KPIs:**
1. Fleet Utilization Rate
2. Average Cost per Order
3. Expense Ratio (Expenses/Revenue)
4. Document Completion Rate
5. Driver Productivity (Orders/Driver/Day)
6. Vehicle Downtime %
7. Route Efficiency Score
8. On-Time Delivery Rate (if tracking added)

**Visualization:** KPI cards with sparklines, trend indicators, and target comparisons

---

## Redux Integration

### State Structure

```javascript
{
  fleetUtilization: {
    data: { fleetSummary: {}, vehicles: [], utilizationDistribution: {}, topPerformers: {} },
    loading: false,
    error: null
  },
  
  expenseAnalysis: {
    data: { expenseSummary: {}, expensesByCategory: [], insights: [] },
    loading: false,
    error: null
  },
  
  driverPerformance: {
    data: { driverSummary: {}, drivers: [], workloadDistribution: {} },
    loading: false,
    error: null
  },
  
  documentCompliance: {
    data: { aging: [], timeline: [], byDimension: {} },
    loading: false,
    error: null
  },
  
  operationalKPIs: {
    data: { kpis: [], trends: {}, targets: {} },
    loading: false,
    error: null
  }
}
```

### Thunks

```javascript
export const fetchFleetUtilization = createAsyncThunk(/*...*/);
export const fetchExpenseAnalysis = createAsyncThunk(/*...*/);
export const fetchDriverPerformance = createAsyncThunk(/*...*/);
export const fetchDocumentCompliance = createAsyncThunk(/*...*/);
export const fetchOperationalKPIs = createAsyncThunk(/*...*/);
```

---

## Database Indexes for Phase 5

```javascript
// Fleet analysis
db.orders.createIndex({
  account: 1,
  vehicle: 1,
  saleDate: -1
});

// Expense analysis
db.orders.createIndex({
  account: 1,
  'orderExpenses.expenseType': 1,
  saleDate: -1
});

// Driver analysis
db.orders.createIndex({
  account: 1,
  driver: 1,
  saleDate: -1
});

// Document compliance
db.orders.createIndex({
  account: 1,
  'deliveries.lr': 1,
  'deliveries.invoices': 1,
  saleDate: -1
});
```

---

## Testing Requirements

### Unit Tests
- [ ] Vehicle efficiency score calculation
- [ ] Expense categorization logic
- [ ] Driver performance score accuracy
- [ ] Utilization rate calculations

### Integration Tests
- [ ] Fleet utilization API with various filters
- [ ] Expense analysis API accuracy
- [ ] Driver performance API
- [ ] Document compliance tracking

### Performance Tests
- [ ] Fleet aggregation completes in <2s
- [ ] Expense analysis with 1000+ expenses <1.5s
- [ ] Driver dashboard renders smoothly

### Business Logic Tests
- [ ] Idle vehicle detection accuracy
- [ ] Expense ratio threshold alerts
- [ ] Driver workload distribution fairness
- [ ] Document aging calculations

---

## Deployment Checklist - Phase 5

### Backend
- [ ] Create `/api/analytics/fleet-utilization` endpoint
- [ ] Create `/api/analytics/expense-analysis` endpoint
- [ ] Create `/api/analytics/driver-performance` endpoint
- [ ] Create `/api/analytics/document-compliance` endpoint
- [ ] Create `/api/analytics/operational-kpis` endpoint
- [ ] Implement efficiency scoring algorithms
- [ ] Add operational indexes
- [ ] Test with production data volumes

### Frontend
- [ ] Build `FleetUtilizationDashboard` component
- [ ] Build `ExpenseAnalysisDashboard` component
- [ ] Build `DriverPerformanceDashboard` component
- [ ] Build `DocumentComplianceDashboard` component
- [ ] Build `OperationalKPIsDashboard` component
- [ ] Implement vehicle detail dialog
- [ ] Add expense drill-down views
- [ ] Test with various data scenarios

### Data Quality
- [ ] Standardize expense categories
- [ ] Validate vehicle-order relationships
- [ ] Audit driver assignments
- [ ] Document completion data integrity

### Integration
- [ ] Connect all components to Redux
- [ ] Implement cross-dashboard navigation
- [ ] Add export functionality for reports
- [ ] Test with organization switching
- [ ] Verify all calculations

---

## Advanced Features (Post Phase 5)

### 1. Predictive Maintenance
**When:** After fleet tracking proven valuable

- ML model to predict vehicle maintenance needs
- Cost vs. downtime optimization
- Maintenance schedule recommendations
- Parts inventory planning

### 2. Route Optimization Engine
**When:** After route profitability analysis complete

- Suggest optimal vehicle-route assignments
- Load balancing across fleet
- Distance minimization algorithms
- Real-time route adjustment suggestions

### 3. Driver Training Recommendations
**When:** After driver performance baseline established

- Identify skill gaps from performance data
- Personalized training suggestions
- Safety score integration
- Certification tracking

### 4. Automated Expense Approval
**When:** After expense patterns understood

- Auto-flag unusual expenses
- Approval workflow based on rules
- Expense policy enforcement
- Fraud detection algorithms

---

## End of Phase 5 Documentation

**Status:** ✅ Complete and ready for review

**Next Phase:** Phase 6 - Scoring & Recommendation Engine

**Estimated Implementation Time:**
- Fleet utilization backend: 10-12 hours
- Fleet utilization frontend: 8-10 hours
- Expense analysis: 8-10 hours
- Driver performance: 6-8 hours
- Document compliance: 4-6 hours
- Operational KPIs: 4-6 hours
- Testing & optimization: 8-10 hours
- **Total: 48-62 hours (6-8 working days)**

**Key Success Metrics:**
- Increase fleet utilization from 60% to 80%
- Reduce expense ratio by 15% through insights
- Balance driver workload (CV < 0.3)
- Achieve 95%+ document completion rate
- Reduce idle vehicle days by 50%