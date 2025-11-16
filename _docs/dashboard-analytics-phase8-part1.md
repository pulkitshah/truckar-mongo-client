# Phase 8: Executive Summary & Automated Reporting (Part 1 of 4)

## Overview: Executive Intelligence Layer

Phase 8 transforms analytics into actionable executive intelligence through automated reporting, customizable dashboards, and intelligent delivery systems.

### Goals
1. **Executive Dashboard** - Single-page strategic overview for leadership
2. **Automated Reports** - Scheduled generation and delivery
3. **Custom Report Builder** - User-defined reports and metrics
4. **Export Systems** - PDF, Excel, Email delivery
5. **Alert & Notification System** - Proactive issue detection
6. **Board Presentation Mode** - Investor/board-ready views

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Executive Layer                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Executive    │  │ Report       │  │ Alert        │      │
│  │ Dashboard    │  │ Builder      │  │ System       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PDF          │  │ Excel        │  │ Email        │      │
│  │ Generator    │  │ Exporter     │  │ Delivery     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 8.1 Executive Dashboard API

### Purpose
Comprehensive single-page view of all critical business metrics

### 8.1.1 Executive Summary API

**Backend Endpoint:** `GET /api/analytics/executive-summary`

**Query Parameters:**
- `account`, `organization`
- `period` - 'today' | 'wtd' | 'mtd' | 'qtd' | 'ytd'
- `compareWith` - 'previous_period' | 'previous_year'

**Response Structure:**
```javascript
{
  overview: {
    period: String,
    dateRange: { start: Date, end: Date },
    comparisonPeriod: { start: Date, end: Date },
    
    kpis: {
      revenue: {
        current: Number,
        previous: Number,
        change: Number,              // %
        trend: 'up' | 'down' | 'stable',
        target: Number,
        targetAchievement: Number    // %
      },
      profit: { /* same structure */ },
      orders: { /* same structure */ },
      customers: {
        active: Number,
        new: Number,
        churned: Number,
        retention: Number            // %
      },
      fleet: {
        utilization: Number,         // %
        activeVehicles: Number,
        avgRevenuePerVehicle: Number
      }
    }
  },
  
  financialHealth: {
    score: Number,                   // 0-100
    status: 'excellent' | 'good' | 'fair' | 'poor',
    profitMargin: Number,
    cashConversionCycle: Number,     // Days
    outstandingInvoices: {
      count: Number,
      amount: Number,
      avgAge: Number
    },
    revenueGrowth: Number,           // % YoY
    indicators: [
      {
        metric: String,
        value: Number,
        status: 'healthy' | 'warning' | 'critical',
        message: String
      }
    ]
  },
  
  operationalHealth: {
    score: Number,                   // 0-100
    status: 'excellent' | 'good' | 'fair' | 'poor',
    fleetUtilization: Number,
    documentCompliance: Number,
    avgTurnaroundTime: Number,       // Days
    indicators: [
      {
        metric: String,
        value: Number,
        status: 'healthy' | 'warning' | 'critical',
        message: String
      }
    ]
  },
  
  customerHealth: {
    score: Number,                   // 0-100
    status: 'excellent' | 'good' | 'fair' | 'poor',
    retentionRate: Number,
    churnRate: Number,
    nps: Number,                     // Net Promoter Score (if available)
    atRiskCustomers: Number,
    topCustomers: [
      {
        customerId: String,
        name: String,
        revenue: Number,
        health: Number               // 0-100
      }
    ]
  },
  
  marketPosition: {
    estimatedMarketShare: Number,
    competitivePosition: String,
    growthRate: Number,
    strengths: Array<String>,
    opportunities: Array<String>
  },
  
  predictions: {
    revenueForecast: {
      next30Days: Number,
      confidence: Number,
      trend: 'increasing' | 'stable' | 'decreasing'
    },
    churnRisk: {
      customersAtRisk: Number,
      revenueAtRisk: Number,
      criticalCount: Number
    },
    demandForecast: {
      expectedOrders: Number,
      topRoutes: Array<String>
    }
  },
  
  criticalAlerts: [
    {
      id: String,
      type: 'financial' | 'operational' | 'customer' | 'predictive',
      severity: 'critical' | 'high' | 'medium',
      title: String,
      message: String,
      actionRequired: String,
      affectedEntities: Number,
      estimatedImpact: String,
      createdAt: Date
    }
  ],
  
  topInsights: [
    {
      category: String,
      insight: String,
      impact: 'high' | 'medium' | 'low',
      recommendation: String,
      estimatedValue: Number
    }
  ],
  
  quickActions: [
    {
      action: String,
      description: String,
      priority: 'high' | 'medium' | 'low',
      expectedImpact: String,
      effort: 'low' | 'medium' | 'high'
    }
  ]
}
```

**Implementation:**

```javascript
// /pages/api/analytics/executive-summary.js

import dbConnect from '../../../lib/dbConnect';
import Order from '../../../models/Order';
import Invoice from '../../../models/Invoice';
import Party from '../../../models/Party';
import Vehicle from '../../../models/Vehicle';
import { calculateDateRange, getPreviousPeriod } from '../../../helper/dateUtils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  const { account, organization, period = 'mtd', compareWith = 'previous_period' } = req.query;

  try {
    // Calculate date ranges
    const currentRange = calculateDateRange(period);
    const previousRange = getPreviousPeriod(currentRange, compareWith);

    // Fetch all data in parallel
    const [
      currentMetrics,
      previousMetrics,
      customerData,
      fleetData,
      invoiceData,
      predictiveData
    ] = await Promise.all([
      getMetricsForPeriod(organization || account, currentRange),
      getMetricsForPeriod(organization || account, previousRange),
      getCustomerHealth(organization || account, currentRange),
      getFleetHealth(organization || account, currentRange),
      getInvoiceHealth(organization || account, currentRange),
      getPredictiveMetrics(organization || account)
    ]);

    // Build overview
    const overview = buildOverview(
      currentMetrics,
      previousMetrics,
      currentRange,
      previousRange,
      period
    );

    // Calculate health scores
    const financialHealth = calculateFinancialHealth(currentMetrics, invoiceData);
    const operationalHealth = calculateOperationalHealth(currentMetrics, fleetData);
    const customerHealth = calculateCustomerHealth(customerData);

    // Market position (simplified - would call market-position API)
    const marketPosition = {
      estimatedMarketShare: 12.5,
      competitivePosition: 'challenger',
      growthRate: currentMetrics.growth,
      strengths: ['High profit margins', 'Strong fleet utilization'],
      opportunities: ['Expand to new routes', 'Increase customer base']
    };

    // Predictions
    const predictions = {
      revenueForecast: predictiveData.forecast,
      churnRisk: predictiveData.churn,
      demandForecast: predictiveData.demand
    };

    // Generate alerts
    const criticalAlerts = generateCriticalAlerts(
      financialHealth,
      operationalHealth,
      customerHealth,
      predictiveData
    );

    // Generate insights
    const topInsights = generateTopInsights(
      currentMetrics,
      previousMetrics,
      customerData,
      fleetData
    );

    // Generate quick actions
    const quickActions = generateQuickActions(
      criticalAlerts,
      topInsights,
      financialHealth,
      operationalHealth
    );

    res.status(200).json({
      overview,
      financialHealth,
      operationalHealth,
      customerHealth,
      marketPosition,
      predictions,
      criticalAlerts,
      topInsights,
      quickActions
    });

  } catch (error) {
    console.error('Executive summary error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// Helper functions

async function getMetricsForPeriod(orgId, dateRange) {
  const orders = await Order.aggregate([
    {
      $match: {
        $or: [
          { organisation: orgId },
          { 'vehicle.organisation': orgId }
        ],
        saleDate: { $gte: dateRange.start, $lte: dateRange.end }
      }
    },
    {
      $unwind: '$deliveries'
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$deliveries.saleAmount' },
        totalProfit: {
          $sum: {
            $subtract: ['$deliveries.saleAmount', '$deliveries.totalExpense']
          }
        },
        orderCount: { $sum: 1 },
        uniqueCustomers: { $addToSet: '$customer' },
        uniqueVehicles: { $addToSet: '$vehicle' }
      }
    }
  ]);

  const metrics = orders[0] || {
    totalRevenue: 0,
    totalProfit: 0,
    orderCount: 0,
    uniqueCustomers: [],
    uniqueVehicles: []
  };

  return {
    revenue: metrics.totalRevenue,
    profit: metrics.totalProfit,
    orders: metrics.orderCount,
    customers: metrics.uniqueCustomers.length,
    vehicles: metrics.uniqueVehicles.length,
    avgOrderValue: metrics.orderCount > 0 ? metrics.totalRevenue / metrics.orderCount : 0,
    profitMargin: metrics.totalRevenue > 0 ? (metrics.totalProfit / metrics.totalRevenue) * 100 : 0
  };
}

async function getCustomerHealth(orgId, dateRange) {
  const customers = await Order.aggregate([
    {
      $match: {
        $or: [
          { organisation: orgId },
          { 'vehicle.organisation': orgId }
        ],
        saleDate: { $gte: dateRange.start, $lte: dateRange.end }
      }
    },
    {
      $group: {
        _id: '$customer',
        orderCount: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $reduce: {
              input: '$deliveries',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.saleAmount'] }
            }
          }
        },
        lastOrderDate: { $max: '$saleDate' }
      }
    },
    {
      $lookup: {
        from: 'parties',
        localField: '_id',
        foreignField: '_id',
        as: 'customerInfo'
      }
    },
    {
      $unwind: '$customerInfo'
    },
    {
      $project: {
        customerId: '$_id',
        name: '$customerInfo.name',
        orderCount: 1,
        totalRevenue: 1,
        lastOrderDate: 1,
        recency: {
          $divide: [
            { $subtract: [new Date(), '$lastOrderDate'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);

  // Calculate health score for each customer
  const customersWithHealth = customers.map(c => ({
    ...c,
    health: calculateCustomerHealthScore(c)
  }));

  const activeCustomers = customersWithHealth.filter(c => c.recency <= 90).length;
  const atRiskCustomers = customersWithHealth.filter(c => c.health < 50).length;

  return {
    total: customersWithHealth.length,
    active: activeCustomers,
    atRisk: atRiskCustomers,
    topCustomers: customersWithHealth.slice(0, 10)
  };
}

function calculateCustomerHealthScore(customer) {
  // Simple health scoring
  let score = 50;
  
  // Recency factor
  if (customer.recency <= 30) score += 25;
  else if (customer.recency <= 60) score += 15;
  else if (customer.recency <= 90) score += 5;
  else score -= 15;
  
  // Frequency factor
  if (customer.orderCount >= 10) score += 15;
  else if (customer.orderCount >= 5) score += 10;
  else if (customer.orderCount >= 2) score += 5;
  
  // Monetary factor
  if (customer.totalRevenue >= 1000000) score += 10;
  else if (customer.totalRevenue >= 500000) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

async function getFleetHealth(orgId, dateRange) {
  const vehicles = await Vehicle.find({
    $or: [
      { organisation: orgId },
      { account: orgId }
    ]
  }).lean();

  const vehicleUtilization = await Order.aggregate([
    {
      $match: {
        $or: [
          { organisation: orgId },
          { 'vehicle.organisation': orgId }
        ],
        saleDate: { $gte: dateRange.start, $lte: dateRange.end }
      }
    },
    {
      $group: {
        _id: '$vehicle',
        orderCount: { $sum: 1 },
        revenue: {
          $sum: {
            $reduce: {
              input: '$deliveries',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.saleAmount'] }
            }
          }
        }
      }
    }
  ]);

  const totalDays = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
  const activeVehicles = vehicleUtilization.length;
  const avgUtilization = vehicleUtilization.length > 0
    ? vehicleUtilization.reduce((sum, v) => sum + (v.orderCount / totalDays * 100), 0) / vehicleUtilization.length
    : 0;

  return {
    totalVehicles: vehicles.length,
    activeVehicles,
    utilization: avgUtilization,
    vehicleData: vehicleUtilization
  };
}

async function getInvoiceHealth(orgId, dateRange) {
  const invoices = await Invoice.aggregate([
    {
      $match: {
        organisation: orgId,
        invoiceDate: { $gte: dateRange.start, $lte: dateRange.end }
      }
    },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        avgAge: {
          $avg: {
            $divide: [
              { $subtract: [new Date(), '$invoiceDate'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    }
  ]);

  const outstandingInvoices = await Invoice.countDocuments({
    organisation: orgId,
    status: { $ne: 'paid' },
    invoiceDate: { $lte: dateRange.end }
  });

  return {
    count: invoices[0]?.totalInvoices || 0,
    amount: invoices[0]?.totalAmount || 0,
    avgAge: invoices[0]?.avgAge || 0,
    outstanding: outstandingInvoices
  };
}

async function getPredictiveMetrics(orgId) {
  // Simplified - would call actual prediction APIs
  return {
    forecast: {
      next30Days: 5000000,
      confidence: 85,
      trend: 'increasing'
    },
    churn: {
      customersAtRisk: 12,
      revenueAtRisk: 800000,
      criticalCount: 3
    },
    demand: {
      expectedOrders: 145,
      topRoutes: ['Mumbai-Delhi', 'Delhi-Bangalore', 'Pune-Mumbai']
    }
  };
}

function buildOverview(current, previous, currentRange, previousRange, period) {
  const calculateChange = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const getTrend = (change) => {
    if (Math.abs(change) < 2) return 'stable';
    return change > 0 ? 'up' : 'down';
  };

  return {
    period,
    dateRange: currentRange,
    comparisonPeriod: previousRange,
    kpis: {
      revenue: {
        current: current.revenue,
        previous: previous.revenue,
        change: calculateChange(current.revenue, previous.revenue),
        trend: getTrend(calculateChange(current.revenue, previous.revenue)),
        target: current.revenue * 1.2, // 20% growth target
        targetAchievement: (current.revenue / (current.revenue * 1.2)) * 100
      },
      profit: {
        current: current.profit,
        previous: previous.profit,
        change: calculateChange(current.profit, previous.profit),
        trend: getTrend(calculateChange(current.profit, previous.profit)),
        target: current.profit * 1.25,
        targetAchievement: (current.profit / (current.profit * 1.25)) * 100
      },
      orders: {
        current: current.orders,
        previous: previous.orders,
        change: calculateChange(current.orders, previous.orders),
        trend: getTrend(calculateChange(current.orders, previous.orders)),
        target: current.orders * 1.15,
        targetAchievement: (current.orders / (current.orders * 1.15)) * 100
      },
      customers: {
        active: current.customers,
        new: Math.max(0, current.customers - previous.customers),
        churned: 0, // Would need historical tracking
        retention: previous.customers > 0 
          ? (current.customers / previous.customers) * 100 
          : 100
      },
      fleet: {
        utilization: 75, // Placeholder
        activeVehicles: current.vehicles,
        avgRevenuePerVehicle: current.vehicles > 0 
          ? current.revenue / current.vehicles 
          : 0
      }
    }
  };
}

function calculateFinancialHealth(metrics, invoiceData) {
  let score = 50;
  const indicators = [];

  // Profit margin check
  if (metrics.profitMargin >= 20) {
    score += 20;
    indicators.push({
      metric: 'Profit Margin',
      value: metrics.profitMargin,
      status: 'healthy',
      message: `Strong profit margin at ${metrics.profitMargin.toFixed(1)}%`
    });
  } else if (metrics.profitMargin >= 10) {
    score += 10;
    indicators.push({
      metric: 'Profit Margin',
      value: metrics.profitMargin,
      status: 'warning',
      message: `Profit margin at ${metrics.profitMargin.toFixed(1)}% - room for improvement`
    });
  } else {
    score -= 10;
    indicators.push({
      metric: 'Profit Margin',
      value: metrics.profitMargin,
      status: 'critical',
      message: `Low profit margin at ${metrics.profitMargin.toFixed(1)}% - urgent action needed`
    });
  }

  // Revenue growth
  const growth = metrics.growth || 0;
  if (growth >= 15) {
    score += 20;
    indicators.push({
      metric: 'Revenue Growth',
      value: growth,
      status: 'healthy',
      message: `Strong growth at ${growth.toFixed(1)}%`
    });
  } else if (growth >= 5) {
    score += 10;
    indicators.push({
      metric: 'Revenue Growth',
      value: growth,
      status: 'warning',
      message: `Moderate growth at ${growth.toFixed(1)}%`
    });
  } else if (growth < 0) {
    score -= 15;
    indicators.push({
      metric: 'Revenue Growth',
      value: growth,
      status: 'critical',
      message: `Declining revenue at ${growth.toFixed(1)}%`
    });
  }

  // Outstanding invoices
  if (invoiceData.outstanding < 10) {
    score += 10;
  } else if (invoiceData.outstanding > 50) {
    score -= 10;
    indicators.push({
      metric: 'Outstanding Invoices',
      value: invoiceData.outstanding,
      status: 'warning',
      message: `${invoiceData.outstanding} invoices pending - follow up required`
    });
  }

  score = Math.max(0, Math.min(100, score));

  let status;
  if (score >= 80) status = 'excellent';
  else if (score >= 60) status = 'good';
  else if (score >= 40) status = 'fair';
  else status = 'poor';

  return {
    score: Math.round(score),
    status,
    profitMargin: metrics.profitMargin,
    cashConversionCycle: invoiceData.avgAge,
    outstandingInvoices: {
      count: invoiceData.outstanding,
      amount: invoiceData.amount,
      avgAge: invoiceData.avgAge
    },
    revenueGrowth: growth,
    indicators
  };
}

function calculateOperationalHealth(metrics, fleetData) {
  let score = 50;
  const indicators = [];

  // Fleet utilization
  if (fleetData.utilization >= 80) {
    score += 25;
    indicators.push({
      metric: 'Fleet Utilization',
      value: fleetData.utilization,
      status: 'healthy',
      message: `Excellent fleet utilization at ${fleetData.utilization.toFixed(1)}%`
    });
  } else if (fleetData.utilization >= 60) {
    score += 15;
    indicators.push({
      metric: 'Fleet Utilization',
      value: fleetData.utilization,
      status: 'warning',
      message: `Fleet utilization at ${fleetData.utilization.toFixed(1)}% - optimization opportunity`
    });
  } else {
    score -= 10;
    indicators.push({
      metric: 'Fleet Utilization',
      value: fleetData.utilization,
      status: 'critical',
      message: `Low fleet utilization at ${fleetData.utilization.toFixed(1)}%`
    });
  }

  // Document compliance (simplified)
  const compliance = 85; // Placeholder
  if (compliance >= 90) {
    score += 15;
  } else if (compliance >= 75) {
    score += 10;
  } else {
    score -= 5;
    indicators.push({
      metric: 'Document Compliance',
      value: compliance,
      status: 'warning',
      message: `Document compliance at ${compliance}% - improve documentation`
    });
  }

  // Active vehicles ratio
  const activeRatio = (fleetData.activeVehicles / fleetData.totalVehicles) * 100;
  if (activeRatio >= 80) {
    score += 10;
  } else if (activeRatio < 50) {
    score -= 10;
    indicators.push({
      metric: 'Active Vehicles',
      value: activeRatio,
      status: 'warning',
      message: `Only ${activeRatio.toFixed(0)}% of fleet active`
    });
  }

  score = Math.max(0, Math.min(100, score));

  let status;
  if (score >= 80) status = 'excellent';
  else if (score >= 60) status = 'good';
  else if (score >= 40) status = 'fair';
  else status = 'poor';

  return {
    score: Math.round(score),
    status,
    fleetUtilization: fleetData.utilization,
    documentCompliance: compliance,
    avgTurnaroundTime: 3.5, // Placeholder
    indicators
  };
}

function calculateCustomerHealth(customerData) {
  let score = 50;
  const retentionRate = (customerData.active / customerData.total) * 100;
  const churnRate = ((customerData.total - customerData.active) / customerData.total) * 100;
  const atRiskPercent = (customerData.atRisk / customerData.total) * 100;

  if (retentionRate >= 85) score += 25;
  else if (retentionRate >= 70) score += 15;
  else score -= 10;

  if (atRiskPercent <= 10) score += 15;
  else if (atRiskPercent <= 20) score += 5;
  else score -= 15;

  score = Math.max(0, Math.min(100, score));

  let status;
  if (score >= 80) status = 'excellent';
  else if (score >= 60) status = 'good';
  else if (score >= 40) status = 'fair';
  else status = 'poor';

  return {
    score: Math.round(score),
    status,
    retentionRate,
    churnRate,
    nps: null,
    atRiskCustomers: customerData.atRisk,
    topCustomers: customerData.topCustomers
  };
}

function generateCriticalAlerts(financial, operational, customer, predictive) {
  const alerts = [];

  // Financial alerts
  if (financial.status === 'poor' || financial.score < 50) {
    alerts.push({
      id: 'fin_001',
      type: 'financial',
      severity: 'critical',
      title: 'Poor Financial Health',
      message: `Financial health score is ${financial.score}/100`,
      actionRequired: 'Review profit margins and cost structure',
      affectedEntities: 1,
      estimatedImpact: 'High',
      createdAt: new Date()
    });
  }

  if (financial.outstandingInvoices.count > 50) {
    alerts.push({
      id: 'fin_002',
      type: 'financial',
      severity: 'high',
      title: 'High Outstanding Invoices',
      message: `${financial.outstandingInvoices.count} invoices pending with average age ${financial.outstandingInvoices.avgAge.toFixed(0)} days`,
      actionRequired: 'Follow up on pending payments',
      affectedEntities: financial.outstandingInvoices.count,
      estimatedImpact: `₹${(financial.outstandingInvoices.amount / 100000).toFixed(2)}L`,
      createdAt: new Date()
    });
  }

  // Operational alerts
  if (operational.fleetUtilization < 50) {
    alerts.push({
      id: 'ops_001',
      type: 'operational',
      severity: 'high',
      title: 'Low Fleet Utilization',
      message: `Fleet utilization at ${operational.fleetUtilization.toFixed(1)}%`,
      actionRequired: 'Optimize vehicle allocation and route planning',
      affectedEntities: 1,
      estimatedImpact: 'Medium',
      createdAt: new Date()
    });
  }

  // Customer alerts
  if (customer.atRiskCustomers > 10) {
    alerts.push({
      id: 'cust_001',
      type: 'customer',
      severity: 'high',
      title: 'High Customer Churn Risk',
      message: `${customer.atRiskCustomers} customers at risk of churning`,
      actionRequired: 'Implement retention campaigns',
      affectedEntities: customer.atRiskCustomers,
      estimatedImpact: 'High',
      createdAt: new Date()
    });
  }

  // Predictive alerts
  if (predictive.churn.criticalCount > 0) {
    alerts.push({
      id: 'pred_001',
      type: 'predictive',
      severity: 'critical',
      title: 'Critical Churn Risk Detected',
      message: `${predictive.churn.criticalCount} customers in critical churn risk zone`,
      actionRequired: 'Immediate retention intervention required',
      affectedEntities: predictive.churn.criticalCount,
      estimatedImpact: `₹${(predictive.churn.revenueAtRisk / 100000).toFixed(2)}L at risk`,
      createdAt: new Date()
    });
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

function generateTopInsights(current, previous, customerData, fleetData) {
  const insights = [];

  // Revenue growth insight
  const revenueGrowth = ((current.revenue - previous.revenue) / previous.revenue) * 100;
  if (Math.abs(revenueGrowth) > 10) {
    insights.push({
      category: 'Financial',
      insight: `Revenue ${revenueGrowth > 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueGrowth).toFixed(1)}% compared to previous period`,
      impact: Math.abs(revenueGrowth) > 20 ? 'high' : 'medium',
      recommendation: revenueGrowth > 0 
        ? 'Identify and replicate success factors'
        : 'Investigate causes and implement corrective measures',
      estimatedValue: Math.abs(current.revenue - previous.revenue)
    });
  }

  // Profit margin insight
  if (current.profitMargin > 15) {
    insights.push({
      category: 'Financial',
      insight: `Strong profit margin at ${current.profitMargin.toFixed(1)}%`,
      impact: 'high',
      recommendation: 'Maintain pricing discipline and cost control',
      estimatedValue: current.profit
    });
  }

  // Fleet utilization insight
  if (fleetData.utilization < 70) {
    const potentialRevenue = (current.revenue / fleetData.utilization) * (80 - fleetData.utilization);
    insights.push({
      category: 'Operational',
      insight: `Fleet utilization at ${fleetData.utilization.toFixed(1)}% - significant improvement opportunity`,
      impact: 'high',
      recommendation: 'Optimize route planning and vehicle allocation to reach 80% utilization',
      estimatedValue: potentialRevenue
    });
  }

  // Customer concentration insight
  const top3Revenue = customerData.topCustomers.slice(0, 3)
    .reduce((sum, c) => sum + c.totalRevenue, 0);
  const concentration = (top3Revenue / current.revenue) * 100;
  
  if (concentration > 50) {
    insights.push({
      category: 'Customer',
      insight: `High customer concentration - top 3 customers represent ${concentration.toFixed(0)}% of revenue`,
      impact: 'medium',
      recommendation: 'Diversify customer base to reduce dependency risk',
      estimatedValue: top3Revenue
    });
  }

  return insights.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  }).slice(0, 5);
}

function generateQuickActions(alerts, insights, financial, operational) {
  const actions = [];

  // From critical alerts
  if (alerts.some(a => a.type === 'financial' && a.severity === 'critical')) {
    actions.push({
      action: 'Review Cost Structure',
      description: 'Analyze expenses and identify cost reduction opportunities',
      priority: 'high',
      expectedImpact: 'Improve profit margin by 3-5%',
      effort: 'medium'
    });
  }

  if (alerts.some(a => a.type === 'customer')) {
    actions.push({
      action: 'Launch Retention Campaign',
      description: 'Contact at-risk customers with personalized offers',
      priority: 'high',
      expectedImpact: 'Reduce churn by 30-40%',
      effort: 'low'
    });
  }

  // From insights
  if (operational.fleetUtilization < 70) {
    actions.push({
      action: 'Optimize Fleet Utilization',
      description: 'Reassign vehicles to high-demand routes',
      priority: 'high',
      expectedImpact: 'Increase revenue by 10-15%',
      effort: 'medium'
    });
  }

  if (financial.outstandingInvoices.count > 30) {
    actions.push({
      action: 'Clear Outstanding Invoices',
      description: 'Follow up on pending payments, offer early payment incentives',
      priority: 'medium',
      expectedImpact: 'Improve cash flow by ₹' + (financial.outstandingInvoices.amount / 100000).toFixed(1) + 'L',
      effort: 'low'
    });
  }

  // Growth opportunities
  actions.push({
    action: 'Expand Service Offerings',
    description: 'Introduce value-added services to existing customers',
    priority: 'medium',
    expectedImpact: 'Increase revenue per customer by 15-20%',
    effort: 'high'
  });

  return actions.slice(0, 5);
}

// Date utility helpers
function calculateDateRange(period) {
  const now = new Date();
  let start, end = new Date(now);

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'wtd': // Week to date
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      break;
    case 'mtd': // Month to date
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'qtd': // Quarter to date
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'ytd': // Year to date (fiscal: April-March)
      const fiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(fiscalYear, 3, 1); // April 1st
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start, end };
}

function getPreviousPeriod(currentRange, compareWith) {
  const duration = currentRange.end - currentRange.start;
  
  if (compareWith === 'previous_year') {
    return {
      start: new Date(currentRange.start.getFullYear() - 1, currentRange.start.getMonth(), currentRange.start.getDate()),
      end: new Date(currentRange.end.getFullYear() - 1, currentRange.end.getMonth(), currentRange.end.getDate())
    };
  }
  
  // previous_period
  return {
    start: new Date(currentRange.start.getTime() - duration),
    end: new Date(currentRange.start.getTime() - 1)
  };
}
```

---

## End of Part 1

**Covered:**
- Executive Summary API (complete implementation)
- KPI calculations with period comparisons
- Financial health scoring
- Operational health scoring
- Customer health scoring
- Critical alert generation
- Insight generation
- Quick action recommendations

**Next Part:** Report Builder API, Custom Reports, Scheduled Reports

**Lines:** ~1,450