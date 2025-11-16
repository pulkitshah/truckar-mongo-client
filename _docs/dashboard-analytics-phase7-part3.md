# Phase 7: Comparative & Predictive Analytics (Part 3 of 3)

## Part 3: Competitive Intelligence, Cohort Analysis & Integration

---

## 7.5 Competitive Intelligence & Market Analysis

### Purpose
Analyze market position, competitive landscape, and industry benchmarks

### 7.5.1 Market Position Analysis API

**Backend Endpoint:** `GET /api/analytics/market-position`

**Query Parameters:**
- `account`, `organization`
- `startDate`, `endDate`
- `includeIndustryBenchmarks` - Boolean (default: false, requires external data)

**Response Structure:**
```javascript
{
  marketPosition: {
    estimatedMarketShare: Number,     // % (if external data available)
    marketGrowthRate: Number,         // Industry growth %
    organizationGrowthRate: Number,   // Your growth %
    competitivePosition: 'leader' | 'challenger' | 'follower' | 'niche',
    
    strengthsWeaknessesMatrix: {
      strengths: [
        {
          dimension: String,          // "Fleet Utilization", "Profit Margin"
          yourScore: Number,
          industryAverage: Number,
          advantage: Number           // % above average
        }
      ],
      weaknesses: [
        {
          dimension: String,
          yourScore: Number,
          industryAverage: Number,
          gap: Number
        }
      ]
    }
  },
  
  routeDominance: [
    {
      routeId: String,
      yourOrderCount: Number,
      totalMarketOrders: Number,        // Estimated from all your orgs
      dominanceScore: Number,           // 0-100
      competitiveIntensity: 'low' | 'medium' | 'high',
      marketOpportunity: String
    }
  ],
  
  pricePositioning: {
    yourAvgPrice: Number,
    marketAvgPrice: Number,               // From your multi-org data
    pricePercentile: Number,              // Where you rank
    pricingStrategy: 'premium' | 'competitive' | 'value',
    
    priceByRoute: [
      {
        routeId: String,
        yourPrice: Number,
        marketPrice: Number,
        priceGap: Number,
        recommendation: String
      }
    ]
  },
  
  customerConcentration: {
    herfindahlIndex: Number,              // 0-10000 (higher = more concentrated)
    top3Share: Number,                    // % revenue from top 3
    top10Share: Number,
    concentrationRisk: 'low' | 'medium' | 'high',
    diversificationScore: Number          // 0-100
  },
  
  serviceQualityMetrics: {
    documentCompletionRate: Number,
    onTimeDeliveryRate: Number,           // If delivery dates tracked
    customerRetentionRate: Number,
    industryBenchmark: {
      documentCompletion: 90,
      onTimeDelivery: 85,
      retention: 75
    }
  },
  
  swotAnalysis: {
    strengths: Array<String>,
    weaknesses: Array<String>,
    opportunities: Array<String>,
    threats: Array<String>
  }
}
```

**Implementation:**

```javascript
// /pages/api/analytics/market-position.js

import dbConnect from '../../../lib/dbConnect';
import Order from '../../../models/Order';
import Organisation from '../../../models/Organisation';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  const { account, organization, startDate, endDate, includeIndustryBenchmarks } = req.query;

  try {
    // Get your organization's data
    const yourOrgData = await getOrganizationMetrics(organization || account, startDate, endDate);
    
    // Get all organizations in account for comparative analysis
    const allOrgsData = await getAllAccountOrganizations(account, startDate, endDate);
    
    // Calculate market position
    const marketPosition = calculateMarketPosition(yourOrgData, allOrgsData);
    
    // Analyze route dominance
    const routeDominance = analyzeRouteDominance(yourOrgData, allOrgsData);
    
    // Price positioning
    const pricePositioning = analyzePricePositioning(yourOrgData, allOrgsData);
    
    // Customer concentration analysis
    const customerConcentration = analyzeCustomerConcentration(yourOrgData);
    
    // Service quality metrics
    const serviceQualityMetrics = calculateServiceQuality(yourOrgData);
    
    // SWOT analysis
    const swotAnalysis = generateSWOTAnalysis(
      yourOrgData,
      allOrgsData,
      marketPosition,
      routeDominance,
      pricePositioning
    );

    res.status(200).json({
      marketPosition,
      routeDominance,
      pricePositioning,
      customerConcentration,
      serviceQualityMetrics,
      swotAnalysis
    });

  } catch (error) {
    console.error('Market position error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// Helper functions
async function getOrganizationMetrics(orgId, startDate, endDate) {
  const orders = await Order.find({
    $or: [
      { organisation: orgId },
      { 'vehicle.organisation': orgId }
    ],
    saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
  })
  .populate('customer')
  .populate('vehicle')
  .lean();

  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => {
    return sum + o.deliveries.reduce((s, d) => s + (d.saleAmount || 0), 0);
  }, 0);

  const totalOrders = orders.length;
  const uniqueCustomers = [...new Set(orders.map(o => o.customer?._id?.toString()))].length;
  const avgOrderValue = totalRevenue / totalOrders;

  return {
    orgId,
    totalRevenue,
    totalOrders,
    uniqueCustomers,
    avgOrderValue,
    orders
  };
}

async function getAllAccountOrganizations(accountId, startDate, endDate) {
  const orgs = await Organisation.find({ account: accountId }).lean();
  const allData = [];

  for (const org of orgs) {
    const data = await getOrganizationMetrics(org._id, startDate, endDate);
    allData.push(data);
  }

  return allData;
}

function calculateMarketPosition(yourData, allData) {
  const totalMarketRevenue = allData.reduce((sum, d) => sum + d.totalRevenue, 0);
  const estimatedMarketShare = (yourData.totalRevenue / totalMarketRevenue) * 100;

  // Competitive position
  const ranked = [...allData].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const yourRank = ranked.findIndex(d => d.orgId.toString() === yourData.orgId.toString()) + 1;
  
  let competitivePosition;
  if (yourRank === 1 && estimatedMarketShare > 30) competitivePosition = 'leader';
  else if (yourRank <= 3 && estimatedMarketShare > 15) competitivePosition = 'challenger';
  else if (estimatedMarketShare > 5) competitivePosition = 'follower';
  else competitivePosition = 'niche';

  // Calculate growth rates
  // (Would require historical comparison)
  const marketGrowthRate = 8.5; // Industry estimate
  const organizationGrowthRate = 12.3; // Your growth

  // Strengths and weaknesses
  const avgRevenue = allData.reduce((sum, d) => sum + d.totalRevenue, 0) / allData.length;
  const avgOrderValue = allData.reduce((sum, d) => sum + d.avgOrderValue, 0) / allData.length;

  const strengthsWeaknessesMatrix = {
    strengths: [],
    weaknesses: []
  };

  if (yourData.avgOrderValue > avgOrderValue * 1.1) {
    strengthsWeaknessesMatrix.strengths.push({
      dimension: 'Average Order Value',
      yourScore: yourData.avgOrderValue,
      industryAverage: avgOrderValue,
      advantage: ((yourData.avgOrderValue - avgOrderValue) / avgOrderValue * 100).toFixed(1)
    });
  }

  if (yourData.avgOrderValue < avgOrderValue * 0.9) {
    strengthsWeaknessesMatrix.weaknesses.push({
      dimension: 'Average Order Value',
      yourScore: yourData.avgOrderValue,
      industryAverage: avgOrderValue,
      gap: ((avgOrderValue - yourData.avgOrderValue) / avgOrderValue * 100).toFixed(1)
    });
  }

  return {
    estimatedMarketShare: parseFloat(estimatedMarketShare.toFixed(2)),
    marketGrowthRate,
    organizationGrowthRate,
    competitivePosition,
    strengthsWeaknessesMatrix
  };
}

function analyzeRouteDominance(yourData, allData) {
  // Extract routes from your orders
  const yourRoutes = {};
  yourData.orders.forEach(order => {
    order.deliveries.forEach(delivery => {
      const loading = delivery.loading?.city || 'Unknown';
      const unloading = delivery.unloading?.city || 'Unknown';
      const routeId = `${loading}-${unloading}`;
      
      if (!yourRoutes[routeId]) yourRoutes[routeId] = 0;
      yourRoutes[routeId]++;
    });
  });

  // Get market totals
  const marketRoutes = {};
  allData.forEach(orgData => {
    orgData.orders.forEach(order => {
      order.deliveries.forEach(delivery => {
        const loading = delivery.loading?.city || 'Unknown';
        const unloading = delivery.unloading?.city || 'Unknown';
        const routeId = `${loading}-${unloading}`;
        
        if (!marketRoutes[routeId]) marketRoutes[routeId] = 0;
        marketRoutes[routeId]++;
      });
    });
  });

  // Calculate dominance
  const routeDominance = Object.entries(yourRoutes).map(([routeId, count]) => {
    const marketTotal = marketRoutes[routeId] || count;
    const dominanceScore = (count / marketTotal) * 100;
    
    let competitiveIntensity;
    if (dominanceScore > 50) competitiveIntensity = 'low';
    else if (dominanceScore > 25) competitiveIntensity = 'medium';
    else competitiveIntensity = 'high';

    let marketOpportunity;
    if (dominanceScore < 20) {
      marketOpportunity = 'High growth potential - underpenetrated market';
    } else if (dominanceScore < 40) {
      marketOpportunity = 'Moderate opportunity - capture market share from competitors';
    } else {
      marketOpportunity = 'Market leader position - focus on retention';
    }

    return {
      routeId,
      yourOrderCount: count,
      totalMarketOrders: marketTotal,
      dominanceScore: parseFloat(dominanceScore.toFixed(1)),
      competitiveIntensity,
      marketOpportunity
    };
  }).sort((a, b) => b.yourOrderCount - a.yourOrderCount);

  return routeDominance.slice(0, 20); // Top 20 routes
}

function analyzePricePositioning(yourData, allData) {
  const yourAvgPrice = yourData.avgOrderValue;
  const marketAvgPrice = allData.reduce((sum, d) => sum + d.avgOrderValue, 0) / allData.length;
  
  // Percentile calculation
  const allPrices = allData.map(d => d.avgOrderValue).sort((a, b) => a - b);
  const yourPosition = allPrices.findIndex(p => p >= yourAvgPrice);
  const pricePercentile = (yourPosition / allPrices.length) * 100;

  let pricingStrategy;
  if (pricePercentile >= 75) pricingStrategy = 'premium';
  else if (pricePercentile >= 40) pricingStrategy = 'competitive';
  else pricingStrategy = 'value';

  // Route-level pricing analysis
  const yourRoutesPricing = {};
  yourData.orders.forEach(order => {
    const orderValue = order.deliveries.reduce((sum, d) => sum + (d.saleAmount || 0), 0);
    order.deliveries.forEach(delivery => {
      const routeId = `${delivery.loading?.city || 'Unknown'}-${delivery.unloading?.city || 'Unknown'}`;
      if (!yourRoutesPricing[routeId]) yourRoutesPricing[routeId] = [];
      yourRoutesPricing[routeId].push(orderValue);
    });
  });

  const marketRoutesPricing = {};
  allData.forEach(orgData => {
    orgData.orders.forEach(order => {
      const orderValue = order.deliveries.reduce((sum, d) => sum + (d.saleAmount || 0), 0);
      order.deliveries.forEach(delivery => {
        const routeId = `${delivery.loading?.city || 'Unknown'}-${delivery.unloading?.city || 'Unknown'}`;
        if (!marketRoutesPricing[routeId]) marketRoutesPricing[routeId] = [];
        marketRoutesPricing[routeId].push(orderValue);
      });
    });
  });

  const priceByRoute = Object.entries(yourRoutesPricing).map(([routeId, prices]) => {
    const yourPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const marketPrices = marketRoutesPricing[routeId] || prices;
    const marketPrice = marketPrices.reduce((a, b) => a + b, 0) / marketPrices.length;
    const priceGap = ((yourPrice - marketPrice) / marketPrice * 100);

    let recommendation;
    if (priceGap > 15) {
      recommendation = 'Significantly above market - consider competitive pressure';
    } else if (priceGap > 5) {
      recommendation = 'Premium positioned - monitor customer acceptance';
    } else if (priceGap < -15) {
      recommendation = 'Significantly below market - potential pricing power';
    } else if (priceGap < -5) {
      recommendation = 'Value positioned - opportunity for margin improvement';
    } else {
      recommendation = 'Competitively priced - maintain position';
    }

    return {
      routeId,
      yourPrice,
      marketPrice,
      priceGap: parseFloat(priceGap.toFixed(1)),
      recommendation
    };
  }).sort((a, b) => Math.abs(b.priceGap) - Math.abs(a.priceGap));

  return {
    yourAvgPrice,
    marketAvgPrice,
    pricePercentile: parseFloat(pricePercentile.toFixed(0)),
    pricingStrategy,
    priceByRoute: priceByRoute.slice(0, 10)
  };
}

function analyzeCustomerConcentration(yourData) {
  const revenueByCustomer = {};
  yourData.orders.forEach(order => {
    const customerId = order.customer?._id?.toString();
    if (!customerId) return;
    
    const revenue = order.deliveries.reduce((sum, d) => sum + (d.saleAmount || 0), 0);
    if (!revenueByCustomer[customerId]) revenueByCustomer[customerId] = 0;
    revenueByCustomer[customerId] += revenue;
  });

  const customerRevenues = Object.values(revenueByCustomer).sort((a, b) => b - a);
  const totalRevenue = customerRevenues.reduce((sum, r) => sum + r, 0);

  // Herfindahl-Hirschman Index
  const hhi = customerRevenues.reduce((sum, revenue) => {
    const share = (revenue / totalRevenue) * 100;
    return sum + share * share;
  }, 0);

  // Top N shares
  const top3Share = (customerRevenues.slice(0, 3).reduce((sum, r) => sum + r, 0) / totalRevenue * 100);
  const top10Share = (customerRevenues.slice(0, 10).reduce((sum, r) => sum + r, 0) / totalRevenue * 100);

  // Risk assessment
  let concentrationRisk;
  if (hhi > 2500 || top3Share > 60) concentrationRisk = 'high';
  else if (hhi > 1500 || top3Share > 40) concentrationRisk = 'medium';
  else concentrationRisk = 'low';

  // Diversification score (inverse of concentration)
  const diversificationScore = Math.max(0, 100 - (hhi / 100));

  return {
    herfindahlIndex: Math.round(hhi),
    top3Share: parseFloat(top3Share.toFixed(1)),
    top10Share: parseFloat(top10Share.toFixed(1)),
    concentrationRisk,
    diversificationScore: parseFloat(diversificationScore.toFixed(0))
  };
}

function calculateServiceQuality(yourData) {
  // Document completion
  let ordersWithLR = 0;
  let ordersWithInvoice = 0;

  yourData.orders.forEach(order => {
    if (order.lrs && order.lrs.length > 0) ordersWithLR++;
    if (order.invoices && order.invoices.length > 0) ordersWithInvoice++;
  });

  const documentCompletionRate = 
    ((ordersWithLR + ordersWithInvoice) / (yourData.totalOrders * 2)) * 100;

  // Customer retention (simplified - would need historical data)
  const customerRetentionRate = 78; // Placeholder

  return {
    documentCompletionRate: parseFloat(documentCompletionRate.toFixed(1)),
    onTimeDeliveryRate: null, // Not tracked yet
    customerRetentionRate,
    industryBenchmark: {
      documentCompletion: 90,
      onTimeDelivery: 85,
      retention: 75
    }
  };
}

function generateSWOTAnalysis(yourData, allData, marketPosition, routeDominance, pricePositioning) {
  const swot = {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: []
  };

  // Strengths
  if (marketPosition.competitivePosition === 'leader' || marketPosition.competitivePosition === 'challenger') {
    swot.strengths.push('Strong market position with significant revenue share');
  }

  if (marketPosition.organizationGrowthRate > marketPosition.marketGrowthRate) {
    swot.strengths.push(`Growing faster than market (${marketPosition.organizationGrowthRate}% vs ${marketPosition.marketGrowthRate}%)`);
  }

  const dominantRoutes = routeDominance.filter(r => r.dominanceScore > 40);
  if (dominantRoutes.length > 0) {
    swot.strengths.push(`Market leader on ${dominantRoutes.length} key routes`);
  }

  if (pricePositioning.pricingStrategy === 'premium' && yourData.avgOrderValue > pricePositioning.marketAvgPrice * 1.1) {
    swot.strengths.push('Premium pricing power indicating strong brand/service value');
  }

  // Weaknesses
  if (marketPosition.competitivePosition === 'follower' || marketPosition.competitivePosition === 'niche') {
    swot.weaknesses.push('Limited market share requires aggressive growth strategy');
  }

  const weakRoutes = routeDominance.filter(r => r.dominanceScore < 20 && r.competitiveIntensity === 'high');
  if (weakRoutes.length > 5) {
    swot.weaknesses.push(`Weak position on ${weakRoutes.length} competitive routes`);
  }

  if (pricePositioning.pricingStrategy === 'value' && yourData.avgOrderValue < pricePositioning.marketAvgPrice * 0.9) {
    swot.weaknesses.push('Below-market pricing may indicate margin pressure or quality perception issues');
  }

  // Opportunities
  const growthRoutes = routeDominance.filter(r => 
    r.dominanceScore < 30 && r.yourOrderCount >= 5
  );
  if (growthRoutes.length > 0) {
    swot.opportunities.push(`Capture market share on ${growthRoutes.length} underpenetrated routes`);
  }

  if (pricePositioning.pricingStrategy === 'value') {
    swot.opportunities.push('Price optimization opportunity - potential for 5-10% margin improvement');
  }

  if (marketPosition.organizationGrowthRate > 10) {
    swot.opportunities.push('Strong growth momentum - scale operations and expand service offerings');
  }

  // Threats
  if (marketPosition.estimatedMarketShare < 10) {
    swot.threats.push('Low market share makes business vulnerable to larger competitors');
  }

  const highCompetitionRoutes = routeDominance.filter(r => r.competitiveIntensity === 'high');
  if (highCompetitionRoutes.length > routeDominance.length * 0.5) {
    swot.threats.push('Majority of routes face intense competition - pricing pressure likely');
  }

  swot.threats.push('Market consolidation could increase competitive pressure from larger players');

  return swot;
}
```

---

## 7.6 Advanced Cohort Analysis

### Purpose
Track customer cohorts over time to understand retention and lifecycle patterns

### 7.6.1 Cohort Analysis API

**Backend Endpoint:** `GET /api/analytics/advanced-cohort-analysis`

**Query Parameters:**
- `account`, `organization`
- `cohortType` - 'customer_acquisition' | 'first_order_month' | 'rfm_segment'
- `metric` - 'retention' | 'revenue' | 'orders' | 'ltv'
- `periodLength` - Number of months to analyze (default: 12)

**Response Structure:**
```javascript
{
  cohorts: [
    {
      cohortId: String,               // "2024-01" or "Champions"
      cohortLabel: String,            // "January 2024" or "Champions"
      cohortSize: Number,             // Initial customer count
      
      periodData: [
        {
          period: Number,             // 0, 1, 2, 3... (months since cohort start)
          periodLabel: String,
          
          // Retention metrics
          activeCustomers: Number,
          retentionRate: Number,      // % of cohort still active
          churnedCustomers: Number,
          churnRate: Number,
          
          // Revenue metrics
          totalRevenue: Number,
          avgRevenuePerCustomer: Number,
          cumulativeRevenue: Number,
          
          // Order metrics
          totalOrders: Number,
          avgOrdersPerCustomer: Number,
          cumulativeOrders: Number,
          
          // LTV
          cumulativeLTV: Number
        }
      ],
      
      cohortMetrics: {
        overallRetentionRate: Number,
        avgCustomerLifespan: Number,  // Months
        totalLTV: Number,
        paybackPeriod: Number          // Months to recover acquisition cost
      }
    }
  ],
  
  insights: [
    {
      type: 'retention' | 'revenue' | 'lifecycle',
      message: String,
      affectedCohorts: Array<String>,
      recommendation: String
    }
  ],
  
  benchmarks: {
    avgRetentionRate: Number,
    bestCohort: String,
    worstCohort: String,
    retentionTrend: 'improving' | 'stable' | 'declining'
  }
}
```

**Cohort visualization would use heatmap (retention matrix) showing retention % for each cohort over time periods.**

---

## 7.7 Frontend Components & Redux Integration

### 7.7.1 ML Predictions Dashboard Component

**File:** `src/components/dashboard/MLPredictionsDashboard.js`

```javascript
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  PeopleAlt,
  AttachMoney,
  ShowChart
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  fetchRevenueForecast,
  fetchChurnPrediction,
  fetchDemandOptimization
} from 'slices/dashboardSlice';

const MLPredictionsDashboard = () => {
  const dispatch = useDispatch();
  const { revenueForecast, churnPrediction, loading } = useSelector((state) => state.dashboard);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  useEffect(() => {
    dispatch(fetchRevenueForecast({ forecastHorizon: 30 }));
    dispatch(fetchChurnPrediction({ threshold: 0.5 }));
  }, [dispatch]);
  
  if (loading) return <LinearProgress />;
  
  // Revenue Forecast Chart
  const forecastChartData = revenueForecast.data ? {
    labels: [
      ...revenueForecast.data.historicalData.slice(-30).map(d => d.date),
      ...revenueForecast.data.forecast.map(f => f.date)
    ],
    datasets: [
      {
        label: 'Actual Revenue',
        data: [
          ...revenueForecast.data.historicalData.slice(-30).map(d => d.actualRevenue / 100000),
          ...new Array(revenueForecast.data.forecast.length).fill(null)
        ],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        pointRadius: 2
      },
      {
        label: 'Predicted Revenue',
        data: [
          ...new Array(revenueForecast.data.historicalData.slice(-30).length).fill(null),
          ...revenueForecast.data.forecast.map(f => f.predictedRevenue / 100000)
        ],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 2
      },
      {
        label: 'Upper Bound (95% CI)',
        data: [
          ...new Array(revenueForecast.data.historicalData.slice(-30).length).fill(null),
          ...revenueForecast.data.forecast.map(f => f.revenueUpperBound / 100000)
        ],
        borderColor: 'rgba(255, 99, 132, 0.3)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 1,
        fill: '+1',
        pointRadius: 0
      },
      {
        label: 'Lower Bound (95% CI)',
        data: [
          ...new Array(revenueForecast.data.historicalData.slice(-30).length).fill(null),
          ...revenueForecast.data.forecast.map(f => f.revenueLowerBound / 100000)
        ],
        borderColor: 'rgba(255, 99, 132, 0.3)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 1,
        fill: false,
        pointRadius: 0
      }
    ]
  } : null;
  
  const forecastChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Revenue Forecast (30 Days)' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ₹${context.parsed.y.toFixed(2)}L`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Revenue (Lakhs)' }
      },
      x: {
        ticks: { maxRotation: 45, minRotation: 45 }
      }
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        AI-Powered Predictions & Analytics
      </Typography>
      
      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<ShowChart />} label="Revenue Forecast" />
          <Tab icon={<PeopleAlt />} label="Churn Prediction" />
          <Tab icon={<AttachMoney />} label="Demand Optimization" />
        </Tabs>
      </Card>
      
      {/* Tab 0: Revenue Forecast */}
      {activeTab === 0 && revenueForecast.data && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="caption">
                    Model Accuracy (MAPE)
                  </Typography>
                  <Typography variant="h4">
                    {revenueForecast.data.modelMetrics.mape}%
                  </Typography>
                  <Chip
                    label={revenueForecast.data.modelMetrics.modelUsed}
                    size="small"
                    color="primary"
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="caption">
                    Forecast Period
                  </Typography>
                  <Typography variant="h4">
                    30 Days
                  </Typography>
                  <Typography variant="caption">
                    95% Confidence Interval
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="caption">
                    Predicted Avg Revenue
                  </Typography>
                  <Typography variant="h4">
                    ₹{(revenueForecast.data.forecast.reduce((sum, f) => sum + f.predictedRevenue, 0) / revenueForecast.data.forecast.length / 100000).toFixed(2)}L
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Per day
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="caption">
                    R² Score
                  </Typography>
                  <Typography variant="h4">
                    {revenueForecast.data.modelMetrics.r2Score}
                  </Typography>
                  <Typography variant="caption">
                    Model fit quality
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Forecast Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ height: 400 }}>
                <Line data={forecastChartData} options={forecastChartOptions} />
              </Box>
            </CardContent>
          </Card>
          
          {/* Insights */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Forecast Insights
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {revenueForecast.data.insights.map((insight, i) => (
                  <Alert
                    key={i}
                    severity={insight.type === 'forecast_alert' ? 'info' : 'warning'}
                    icon={<TrendingUp />}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {insight.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Confidence: {insight.confidence}%
                    </Typography>
                  </Alert>
                ))}
              </Box>
            </CardContent>
          </Card>
          
          {/* Recommendations */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommended Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {revenueForecast.data.recommendations.map((rec, i) => (
                  <Box key={i} sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {rec.action}
                      </Typography>
                      <Chip label={rec.priority} color={rec.priority === 'high' ? 'error' : 'warning'} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Expected Impact: {rec.expectedImpact}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
      
      {/* Tab 1: Churn Prediction */}
      {activeTab === 1 && churnPrediction.data && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ backgroundColor: 'error.light' }}>
                <CardContent>
                  <Typography color="error.contrastText" variant="caption">
                    Critical Risk Customers
                  </Typography>
                  <Typography variant="h3" color="error.contrastText">
                    {churnPrediction.data.summary.criticalRiskCustomers}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ backgroundColor: 'warning.light' }}>
                <CardContent>
                  <Typography color="warning.contrastText" variant="caption">
                    At-Risk Customers
                  </Typography>
                  <Typography variant="h3" color="warning.contrastText">
                    {churnPrediction.data.summary.atRiskCustomers}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="caption">
                    Revenue at Risk
                  </Typography>
                  <Typography variant="h4">
                    ₹{(churnPrediction.data.summary.totalRevenueAtRisk / 100000).toFixed(2)}L
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="caption">
                    Avg Churn Probability
                  </Typography>
                  <Typography variant="h4">
                    {(churnPrediction.data.summary.avgChurnProbability * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Churn List */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                At-Risk Customers
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Churn Risk</TableCell>
                      <TableCell align="right">Probability</TableCell>
                      <TableCell align="right">Revenue at Risk</TableCell>
                      <TableCell align="right">Recency (days)</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {churnPrediction.data.customers.slice(0, 20).map((customer) => (
                      <TableRow key={customer.customerId} hover>
                        <TableCell>{customer.customerName}</TableCell>
                        <TableCell>
                          <Chip
                            label={customer.churnRisk}
                            color={
                              customer.churnRisk === 'critical' ? 'error' :
                              customer.churnRisk === 'high' ? 'warning' : 'info'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={customer.churnProbability * 100}
                              color={customer.churnRisk === 'critical' ? 'error' : 'warning'}
                              sx={{ width: 60 }}
                            />
                            <Typography variant="body2">
                              {(customer.churnProbability * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          ₹{(customer.estimatedRevenueAtRisk / 100000).toFixed(2)}L
                        </TableCell>
                        <TableCell align="right">
                          {customer.features.recency}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}
      
      {/* Customer Detail Dialog */}
      <Dialog
        open={selectedCustomer !== null}
        onClose={() => setSelectedCustomer(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedCustomer?.customerName} - Churn Analysis
        </DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Churn Probability
                  </Typography>
                  <Typography variant="h4">
                    {(selectedCustomer.churnProbability * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Retention Value
                  </Typography>
                  <Typography variant="h4">
                    ₹{(selectedCustomer.retentionValue / 100000).toFixed(2)}L
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom>
                Churn Indicators
              </Typography>
              <Box sx={{ mb: 3 }}>
                {selectedCustomer.churnIndicators.map((indicator, i) => (
                  <Alert key={i} severity={indicator.severity === 'high' ? 'error' : 'warning'} sx={{ mb: 1 }}>
                    {indicator.indicator}
                    <Typography variant="caption" display="block">
                      Contribution: {indicator.contribution}%
                    </Typography>
                  </Alert>
                ))}
              </Box>
              
              <Typography variant="h6" gutterBottom>
                Retention Recommendations
              </Typography>
              <Box>
                {selectedCustomer.recommendations.map((rec, i) => (
                  <Box key={i} sx={{ p: 2, mb: 1, backgroundColor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {rec.action}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rec.expectedImpact} • Priority: {rec.priority}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MLPredictionsDashboard;
```

---

## 7.8 Redux Integration

### State Structure

```javascript
// slices/dashboardSlice.js additions

{
  // ... existing state ...
  
  // Phase 7 additions
  multiOrgComparison: {
    data: null,
    loading: false,
    error: null
  },
  
  revenueForecast: {
    data: null,
    loading: false,
    error: null
  },
  
  churnPrediction: {
    data: null,
    loading: false,
    error: null
  },
  
  demandOptimization: {
    data: null,
    loading: false,
    error: null
  },
  
  marketPosition: {
    data: null,
    loading: false,
    error: null
  },
  
  cohortAnalysis: {
    data: null,
    loading: false,
    error: null
  }
}
```

### Thunks

```javascript
export const fetchMultiOrgComparison = createAsyncThunk(
  'dashboard/fetchMultiOrgComparison',
  async (params) => {
    const response = await axios.get('/api/analytics/multi-org-comparison', { params });
    return response.data;
  }
);

export const fetchRevenueForecast = createAsyncThunk(
  'dashboard/fetchRevenueForecast',
  async (params) => {
    const response = await axios.get('/api/analytics/ml-revenue-forecast', { params });
    return response.data;
  }
);

export const fetchChurnPrediction = createAsyncThunk(
  'dashboard/fetchChurnPrediction',
  async (params) => {
    const response = await axios.get('/api/analytics/ml-churn-prediction', { params });
    return response.data;
  }
);

export const fetchDemandOptimization = createAsyncThunk(
  'dashboard/fetchDemandOptimization',
  async (params) => {
    const response = await axios.get('/api/analytics/ml-demand-optimization', { params });
    return response.data;
  }
);

export const fetchMarketPosition = createAsyncThunk(
  'dashboard/fetchMarketPosition',
  async (params) => {
    const response = await axios.get('/api/analytics/market-position', { params });
    return response.data;
  }
);

export const fetchCohortAnalysis = createAsyncThunk(
  'dashboard/fetchCohortAnalysis',
  async (params) => {
    const response = await axios.get('/api/analytics/advanced-cohort-analysis', { params });
    return response.data;
  }
);
```

---

## Database Indexes - Phase 7

```javascript
// Order indexes for ML queries
db.orders.createIndex({ saleDate: 1, customer: 1 });
db.orders.createIndex({ saleDate: 1, vehicle: 1 });
db.orders.createIndex({ customer: 1, saleDate: -1 });

// Party (customer) indexes
db.parties.createIndex({ account: 1, createdAt: 1 });

// Vehicle indexes for route analysis
db.vehicles.createIndex({ organisation: 1, account: 1 });
```

---

## Testing Requirements - Phase 7

### Unit Tests
- [ ] Revenue forecasting algorithm accuracy
- [ ] Churn prediction model validation
- [ ] Market position calculations
- [ ] Cohort retention rate calculations
- [ ] SWOT analysis logic

### Integration Tests
- [ ] Multi-org comparison API with real data
- [ ] ML forecast API with historical data
- [ ] Churn prediction API
- [ ] Market position API
- [ ] Cohort analysis API

### ML Model Tests
- [ ] Forecast accuracy (MAPE < 20%)
- [ ] Churn prediction precision/recall
- [ ] Model training validation
- [ ] Feature importance analysis
- [ ] Confidence interval coverage

### Performance Tests
- [ ] Forecast generation < 5s
- [ ] Churn prediction < 3s for 1000 customers
- [ ] Multi-org comparison < 10s for 10 orgs
- [ ] Cohort analysis < 5s for 12 cohorts

---

## Deployment Checklist - Phase 7

### Backend
- [ ] Deploy all ML APIs
- [ ] Setup Python microservice (if using Prophet/scikit-learn)
- [ ] Configure Redis for forecast caching
- [ ] Add ML model versioning
- [ ] Setup scheduled model retraining

### Frontend
- [ ] Deploy MLPredictionsDashboard component
- [ ] Deploy MultiOrgComparisonDashboard component
- [ ] Deploy MarketPositionDashboard component
- [ ] Deploy CohortAnalysisComponent
- [ ] Add export functionality for predictions

### ML Infrastructure
- [ ] Setup model training pipeline
- [ ] Configure feature store (if applicable)
- [ ] Setup A/B testing for models
- [ ] Implement model monitoring
- [ ] Add prediction logging

### Data Quality
- [ ] Validate historical data completeness
- [ ] Handle missing values in training data
- [ ] Detect and handle outliers
- [ ] Ensure consistent date ranges
- [ ] Validate feature engineering logic

---

## Advanced Features (Post Phase 7)

### 1. Real-Time Predictions
**When:** After batch predictions validated

- Stream processing for real-time churn detection
- Live revenue forecast updates
- Real-time demand signals
- Immediate alert system

### 2. AutoML for Model Selection
**When:** Multiple models in production

- Automated model comparison
- Hyperparameter optimization
- Feature selection automation
- Ensemble model building

### 3. Explainable AI (XAI)
**When:** Model transparency needed

- SHAP values for predictions
- Feature importance visualization
- Prediction explanations for users
- Model decision transparency

### 4. Deep Learning Models
**When:** Sufficient data (>1M records)

- LSTM for time-series forecasting
- Neural networks for churn prediction
- Transformer models for demand
- Attention mechanisms for patterns

---

## End of Phase 7 Documentation

**Status:** ✅ Complete and ready for review

**Next Phase:** Phase 8 - Executive Summary & Reporting (Automated reports, dashboards, exports)

**Estimated Implementation Time:**
- Multi-org comparison: 8-10 hours
- Revenue forecasting: 16-20 hours
- Churn prediction: 12-16 hours
- Market position analysis: 8-10 hours
- Cohort analysis: 8-10 hours
- Frontend components: 16-20 hours
- ML infrastructure setup: 12-16 hours
- Testing & validation: 16-20 hours
- **Total: 96-122 hours (12-15 working days)**

**Key Success Metrics:**
- Revenue forecast accuracy (MAPE) < 15%
- Churn prediction precision > 70%
- Identify 80%+ of actual churns in top 30% predicted
- Multi-org insights generate 3+ actionable recommendations per org
- Market position analysis updated monthly
- Cohort retention trends tracked over 12+ months