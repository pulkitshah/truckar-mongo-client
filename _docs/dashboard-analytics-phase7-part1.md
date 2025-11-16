# Phase 7: Comparative & Predictive Analytics (Part 1 of 3)

**Timeline:** Week 13-15  
**Goal:** Enable multi-organization benchmarking, peer comparison, and advanced machine learning predictions  
**Status:** 📋 Planning  
**Prerequisites:** Phase 1-6 completed (requires comprehensive historical data across multiple organizations)

---

## Overview

Phase 7 introduces advanced comparative and predictive capabilities:

1. **Multi-Organization Benchmarking** - Compare performance across your own organizations
2. **Peer Performance Analysis** - Industry benchmarks and competitive positioning (if data available)
3. **Advanced ML Predictions** - Revenue forecasting, churn prediction, demand optimization
4. **Competitive Intelligence** - Market share analysis and competitive insights
5. **Cohort Comparison** - Compare customer/route cohorts over time
6. **What-If Modeling** - Advanced scenario planning with ML-based predictions

This phase transforms the dashboard from **descriptive analytics** (what happened) through **diagnostic analytics** (why it happened) and **predictive analytics** (what will happen) to **prescriptive analytics** (what should we do).

---

## Part 1: Multi-Organization Comparison & Benchmarking

---

## 7.1 Multi-Organization Performance Comparison

### Purpose
Enable account owners to compare performance across their multiple organizations to identify best practices and improvement opportunities

### 7.1.1 Cross-Organization Metrics Dashboard

**Backend Endpoint:** `GET /api/analytics/multi-org-comparison`

**Query Parameters:**
- `account` (required)
- `organizationIds` (optional array, defaults to all orgs for account)
- `startDate` (required)
- `endDate` (required)
- `metrics` - Array of: 'revenue', 'profit', 'margin', 'orders', 'customers', 'utilization', 'efficiency'

**Response Structure:**
```javascript
{
  organizations: [
    {
      organizationId: ObjectId,
      organizationName: String,
      
      // Financial metrics
      totalRevenue: Number,
      totalProfit: Number,
      profitMargin: Number,
      avgOrderValue: Number,
      revenuePerCustomer: Number,
      
      // Operational metrics
      totalOrders: Number,
      activeCustomers: Number,
      activeVehicles: Number,
      activeDrivers: Number,
      fleetUtilization: Number,
      documentCompletionRate: Number,
      
      // Efficiency metrics
      revenuePerVehicle: Number,
      revenuePerDriver: Number,
      ordersPerVehicle: Number,
      ordersPerDriver: Number,
      costEfficiencyScore: Number,
      
      // Growth metrics
      revenueGrowth: Number,        // vs previous period
      customerGrowth: Number,
      orderGrowth: Number,
      
      // Rankings
      rankings: {
        revenue: Number,            // 1 = best
        profitMargin: Number,
        efficiency: Number,
        growth: Number
      },
      
      // Percentile scores (0-100)
      percentiles: {
        revenue: Number,            // 85 = better than 85% of orgs
        profitMargin: Number,
        efficiency: Number,
        growth: Number
      }
    }
  ],
  
  aggregates: {
    totalRevenue: Number,
    totalProfit: Number,
    avgMargin: Number,
    totalOrders: Number,
    totalCustomers: Number,
    totalVehicles: Number
  },
  
  benchmarks: {
    revenue: { min: Number, max: Number, avg: Number, median: Number },
    profitMargin: { min: Number, max: Number, avg: Number, median: Number },
    fleetUtilization: { min: Number, max: Number, avg: Number, median: Number },
    revenuePerVehicle: { min: Number, max: Number, avg: Number, median: Number }
  },
  
  bestPractices: [
    {
      organizationId: ObjectId,
      organizationName: String,
      metric: String,
      value: Number,
      insight: String              // "Achieves 85% fleet utilization through..."
    }
  ],
  
  improvementOpportunities: [
    {
      organizationId: ObjectId,
      organizationName: String,
      metric: String,
      currentValue: Number,
      benchmarkValue: Number,
      gap: Number,
      potentialImpact: String,
      recommendation: String
    }
  ]
}
```

**MongoDB Aggregation Pipeline:**

```javascript
// /pages/api/analytics/multi-org-comparison.js

import dbConnect from '../../../lib/dbConnect';
import Order from '../../../models/Order';
import Vehicle from '../../../models/Vehicle';
import Driver from '../../../models/Driver';
import Party from '../../../models/Party';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  const { account, organizationIds, startDate, endDate } = req.query;

  if (!account || !startDate || !endDate) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    // Parse organizationIds if provided
    const orgIds = organizationIds 
      ? JSON.parse(organizationIds).map(id => mongoose.Types.ObjectId(id))
      : null;

    // Step 1: Get all organizations for account
    const organizationFilter = orgIds 
      ? { _id: { $in: orgIds } }
      : { account: mongoose.Types.ObjectId(account) };

    const organizations = await Organisation.find(organizationFilter)
      .select('_id name')
      .lean();

    const orgIdList = organizations.map(o => o._id);

    // Step 2: Aggregate metrics for each organization
    const orgMetrics = await Order.aggregate([
      {
        $match: {
          // Hybrid filter: direct org field OR vehicle.organisation
          $or: [
            { 
              organisation: { $in: orgIdList },
              saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
            },
            {
              saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
              vehicle: { $exists: true }
            }
          ]
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
        $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          effectiveOrganisation: {
            $ifNull: ['$organisation', '$vehicleData.organisation']
          }
        }
      },
      {
        $match: {
          effectiveOrganisation: { $in: orgIdList }
        }
      },
      {
        $lookup: {
          from: 'invoices',
          let: { orderId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$order', '$$orderId'] }
              }
            }
          ],
          as: 'invoices'
        }
      },
      {
        $lookup: {
          from: 'lrs',
          let: { orderId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$order', '$$orderId'] }
              }
            }
          ],
          as: 'lrs'
        }
      },
      {
        $addFields: {
          // Calculate financials
          baseSale: {
            $sum: {
              $map: {
                input: '$deliveries',
                as: 'delivery',
                in: {
                  $cond: [
                    { $ifNull: ['$$delivery.saleAmount', false] },
                    '$$delivery.saleAmount',
                    0
                  ]
                }
              }
            }
          },
          lrCharges: {
            $multiply: [
              { $size: { $ifNull: ['$deliveries', []] } },
              { $ifNull: ['$lrChargesPerDelivery', 0] }
            ]
          },
          invoiceCharges: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$invoices', []] } }, 0] },
              { $ifNull: ['$invoiceCharges', 0] },
              0
            ]
          },
          basePurchase: {
            $sum: {
              $map: {
                input: '$deliveries',
                as: 'delivery',
                in: {
                  $cond: [
                    { $ifNull: ['$$delivery.purchaseAmount', false] },
                    '$$delivery.purchaseAmount',
                    0
                  ]
                }
              }
            }
          },
          totalExpenses: {
            $sum: {
              $map: {
                input: { $ifNull: ['$orderExpenses', []] },
                as: 'expense',
                in: { $ifNull: ['$$expense.amount', 0] }
              }
            }
          },
          hasLR: { $gt: [{ $size: { $ifNull: ['$lrs', []] } }, 0] },
          hasInvoice: { $gt: [{ $size: { $ifNull: ['$invoices', []] } }, 0] }
        }
      },
      {
        $addFields: {
          totalSale: { $add: ['$baseSale', '$lrCharges', '$invoiceCharges'] },
          totalPurchase: '$basePurchase'
        }
      },
      {
        $addFields: {
          totalProfit: {
            $subtract: [
              { $subtract: ['$totalSale', '$totalPurchase'] },
              '$totalExpenses'
            ]
          },
          profitMargin: {
            $cond: [
              { $gt: ['$totalSale', 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: [{ $subtract: ['$totalSale', '$totalPurchase'] }, '$totalExpenses'] },
                      '$totalSale'
                    ]
                  },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: '$effectiveOrganisation',
          
          // Financial metrics
          totalRevenue: { $sum: '$totalSale' },
          totalProfit: { $sum: '$totalProfit' },
          totalExpenses: { $sum: '$totalExpenses' },
          
          // Count metrics
          totalOrders: { $sum: 1 },
          uniqueCustomers: { $addToSet: '$customer' },
          uniqueVehicles: { $addToSet: '$vehicle' },
          uniqueDrivers: { $addToSet: '$driver' },
          
          // Document completion
          ordersWithLR: { $sum: { $cond: ['$hasLR', 1, 0] } },
          ordersWithInvoice: { $sum: { $cond: ['$hasInvoice', 1, 0] } },
          
          // Sum for averages
          sumProfitMargin: { $sum: '$profitMargin' }
        }
      },
      {
        $lookup: {
          from: 'organisations',
          localField: '_id',
          foreignField: '_id',
          as: 'orgData'
        }
      },
      {
        $unwind: '$orgData'
      },
      {
        $addFields: {
          activeCustomers: { $size: '$uniqueCustomers' },
          activeVehicles: { $size: '$uniqueVehicles' },
          activeDrivers: { $size: '$uniqueDrivers' },
          avgProfitMargin: { $divide: ['$sumProfitMargin', '$totalOrders'] },
          avgOrderValue: { $divide: ['$totalRevenue', '$totalOrders'] },
          revenuePerCustomer: {
            $divide: ['$totalRevenue', { $size: '$uniqueCustomers' }]
          },
          revenuePerVehicle: {
            $divide: ['$totalRevenue', { $size: '$uniqueVehicles' }]
          },
          revenuePerDriver: {
            $divide: ['$totalRevenue', { $size: '$uniqueDrivers' }]
          },
          ordersPerVehicle: {
            $divide: ['$totalOrders', { $size: '$uniqueVehicles' }]
          },
          ordersPerDriver: {
            $divide: ['$totalOrders', { $size: '$uniqueDrivers' }]
          },
          documentCompletionRate: {
            $multiply: [
              {
                $divide: [
                  { $add: ['$ordersWithLR', '$ordersWithInvoice'] },
                  { $multiply: ['$totalOrders', 2] }
                ]
              },
              100
            ]
          }
        }
      },
      {
        $project: {
          organizationId: '$_id',
          organizationName: '$orgData.name',
          totalRevenue: 1,
          totalProfit: 1,
          profitMargin: '$avgProfitMargin',
          avgOrderValue: 1,
          revenuePerCustomer: 1,
          totalOrders: 1,
          activeCustomers: 1,
          activeVehicles: 1,
          activeDrivers: 1,
          documentCompletionRate: 1,
          revenuePerVehicle: 1,
          revenuePerDriver: 1,
          ordersPerVehicle: 1,
          ordersPerDriver: 1,
          totalExpenses: 1
        }
      }
    ]);

    // Step 3: Get fleet utilization for each org (requires vehicle-level data)
    const fleetUtilizationByOrg = await Vehicle.aggregate([
      {
        $match: {
          organisation: { $in: orgIdList }
        }
      },
      {
        $lookup: {
          from: 'orders',
          let: { vehicleId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$vehicle', '$$vehicleId'] },
                    { $gte: ['$saleDate', new Date(startDate)] },
                    { $lte: ['$saleDate', new Date(endDate)] }
                  ]
                }
              }
            },
            {
              $project: {
                saleDate: 1
              }
            }
          ],
          as: 'orders'
        }
      },
      {
        $addFields: {
          activeDays: {
            $size: {
              $setUnion: {
                $map: {
                  input: '$orders',
                  as: 'order',
                  in: {
                    $dateToString: { format: '%Y-%m-%d', date: '$$order.saleDate' }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$organisation',
          totalVehicles: { $sum: 1 },
          totalActiveDays: { $sum: '$activeDays' },
          totalPossibleDays: {
            $sum: {
              $dateDiff: {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                unit: 'day'
              }
            }
          }
        }
      },
      {
        $addFields: {
          fleetUtilization: {
            $multiply: [
              {
                $divide: [
                  '$totalActiveDays',
                  '$totalPossibleDays'
                ]
              },
              100
            ]
          }
        }
      },
      {
        $project: {
          organizationId: '$_id',
          fleetUtilization: 1
        }
      }
    ]);

    // Step 4: Merge utilization data
    const fleetUtilizationMap = fleetUtilizationByOrg.reduce((acc, item) => {
      acc[item.organizationId.toString()] = item.fleetUtilization;
      return acc;
    }, {});

    orgMetrics.forEach(org => {
      org.fleetUtilization = fleetUtilizationMap[org.organizationId.toString()] || 0;
      org.costEfficiencyScore = (org.totalRevenue - org.totalExpenses) / org.totalRevenue * 100;
    });

    // Step 5: Calculate growth (requires previous period data)
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);
    const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);
    previousEndDate.setDate(previousEndDate.getDate() - periodDays);

    const previousMetrics = await Order.aggregate([
      {
        $match: {
          $or: [
            { 
              organisation: { $in: orgIdList },
              saleDate: { $gte: previousStartDate, $lte: previousEndDate }
            },
            {
              saleDate: { $gte: previousStartDate, $lte: previousEndDate },
              vehicle: { $exists: true }
            }
          ]
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
        $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          effectiveOrganisation: {
            $ifNull: ['$organisation', '$vehicleData.organisation']
          }
        }
      },
      {
        $match: {
          effectiveOrganisation: { $in: orgIdList }
        }
      },
      {
        $addFields: {
          baseSale: {
            $sum: {
              $map: {
                input: '$deliveries',
                as: 'delivery',
                in: { $ifNull: ['$$delivery.saleAmount', 0] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$effectiveOrganisation',
          previousRevenue: { $sum: '$baseSale' },
          previousOrders: { $sum: 1 },
          previousCustomers: { $addToSet: '$customer' }
        }
      },
      {
        $project: {
          organizationId: '$_id',
          previousRevenue: 1,
          previousOrders: 1,
          previousCustomerCount: { $size: '$previousCustomers' }
        }
      }
    ]);

    const previousMetricsMap = previousMetrics.reduce((acc, item) => {
      acc[item.organizationId.toString()] = item;
      return acc;
    }, {});

    orgMetrics.forEach(org => {
      const prev = previousMetricsMap[org.organizationId.toString()];
      if (prev) {
        org.revenueGrowth = ((org.totalRevenue - prev.previousRevenue) / prev.previousRevenue * 100).toFixed(1);
        org.orderGrowth = ((org.totalOrders - prev.previousOrders) / prev.previousOrders * 100).toFixed(1);
        org.customerGrowth = ((org.activeCustomers - prev.previousCustomerCount) / prev.previousCustomerCount * 100).toFixed(1);
      } else {
        org.revenueGrowth = 0;
        org.orderGrowth = 0;
        org.customerGrowth = 0;
      }
    });

    // Step 6: Calculate rankings and percentiles
    const rankedByRevenue = [...orgMetrics].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const rankedByMargin = [...orgMetrics].sort((a, b) => b.profitMargin - a.profitMargin);
    const rankedByUtilization = [...orgMetrics].sort((a, b) => b.fleetUtilization - a.fleetUtilization);
    const rankedByGrowth = [...orgMetrics].sort((a, b) => parseFloat(b.revenueGrowth) - parseFloat(a.revenueGrowth));

    orgMetrics.forEach(org => {
      org.rankings = {
        revenue: rankedByRevenue.findIndex(o => o.organizationId.toString() === org.organizationId.toString()) + 1,
        profitMargin: rankedByMargin.findIndex(o => o.organizationId.toString() === org.organizationId.toString()) + 1,
        efficiency: rankedByUtilization.findIndex(o => o.organizationId.toString() === org.organizationId.toString()) + 1,
        growth: rankedByGrowth.findIndex(o => o.organizationId.toString() === org.organizationId.toString()) + 1
      };

      org.percentiles = {
        revenue: ((orgMetrics.length - org.rankings.revenue) / orgMetrics.length * 100).toFixed(0),
        profitMargin: ((orgMetrics.length - org.rankings.profitMargin) / orgMetrics.length * 100).toFixed(0),
        efficiency: ((orgMetrics.length - org.rankings.efficiency) / orgMetrics.length * 100).toFixed(0),
        growth: ((orgMetrics.length - org.rankings.growth) / orgMetrics.length * 100).toFixed(0)
      };
    });

    // Step 7: Calculate aggregates and benchmarks
    const aggregates = {
      totalRevenue: orgMetrics.reduce((sum, o) => sum + o.totalRevenue, 0),
      totalProfit: orgMetrics.reduce((sum, o) => sum + o.totalProfit, 0),
      avgMargin: orgMetrics.reduce((sum, o) => sum + o.profitMargin, 0) / orgMetrics.length,
      totalOrders: orgMetrics.reduce((sum, o) => sum + o.totalOrders, 0),
      totalCustomers: orgMetrics.reduce((sum, o) => sum + o.activeCustomers, 0),
      totalVehicles: orgMetrics.reduce((sum, o) => sum + o.activeVehicles, 0)
    };

    const calculateBenchmark = (metric) => {
      const values = orgMetrics.map(o => o[metric]).sort((a, b) => a - b);
      return {
        min: values[0],
        max: values[values.length - 1],
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        median: values[Math.floor(values.length / 2)]
      };
    };

    const benchmarks = {
      revenue: calculateBenchmark('totalRevenue'),
      profitMargin: calculateBenchmark('profitMargin'),
      fleetUtilization: calculateBenchmark('fleetUtilization'),
      revenuePerVehicle: calculateBenchmark('revenuePerVehicle')
    };

    // Step 8: Identify best practices
    const bestPractices = [];

    const bestMarginOrg = rankedByMargin[0];
    if (bestMarginOrg.profitMargin > benchmarks.profitMargin.avg * 1.2) {
      bestPractices.push({
        organizationId: bestMarginOrg.organizationId,
        organizationName: bestMarginOrg.organizationName,
        metric: 'Profit Margin',
        value: bestMarginOrg.profitMargin,
        insight: `Achieves ${bestMarginOrg.profitMargin.toFixed(1)}% margin through effective cost control and pricing strategy`
      });
    }

    const bestUtilizationOrg = rankedByUtilization[0];
    if (bestUtilizationOrg.fleetUtilization > benchmarks.fleetUtilization.avg * 1.2) {
      bestPractices.push({
        organizationId: bestUtilizationOrg.organizationId,
        organizationName: bestUtilizationOrg.organizationName,
        metric: 'Fleet Utilization',
        value: bestUtilizationOrg.fleetUtilization,
        insight: `Achieves ${bestUtilizationOrg.fleetUtilization.toFixed(1)}% fleet utilization through optimized vehicle-route assignments`
      });
    }

    // Step 9: Identify improvement opportunities
    const improvementOpportunities = [];

    orgMetrics.forEach(org => {
      // Margin improvement opportunity
      if (org.profitMargin < benchmarks.profitMargin.avg * 0.8) {
        const gap = benchmarks.profitMargin.avg - org.profitMargin;
        const potentialRevenue = org.totalRevenue * (gap / 100);
        
        improvementOpportunities.push({
          organizationId: org.organizationId,
          organizationName: org.organizationName,
          metric: 'Profit Margin',
          currentValue: org.profitMargin,
          benchmarkValue: benchmarks.profitMargin.avg,
          gap: gap,
          potentialImpact: `₹${(potentialRevenue / 100000).toFixed(2)}L additional profit`,
          recommendation: 'Review pricing strategy and cost structure to improve margins'
        });
      }

      // Utilization improvement opportunity
      if (org.fleetUtilization < benchmarks.fleetUtilization.avg * 0.8) {
        const gap = benchmarks.fleetUtilization.avg - org.fleetUtilization;
        const potentialRevenue = org.totalRevenue * (gap / 100);
        
        improvementOpportunities.push({
          organizationId: org.organizationId,
          organizationName: org.organizationName,
          metric: 'Fleet Utilization',
          currentValue: org.fleetUtilization,
          benchmarkValue: benchmarks.fleetUtilization.avg,
          gap: gap,
          potentialImpact: `₹${(potentialRevenue / 100000).toFixed(2)}L additional revenue from better utilization`,
          recommendation: 'Optimize vehicle allocation and consider fleet right-sizing'
        });
      }

      // Revenue per customer opportunity
      if (org.revenuePerCustomer < benchmarks.revenuePerVehicle.avg * 0.7) {
        improvementOpportunities.push({
          organizationId: org.organizationId,
          organizationName: org.organizationName,
          metric: 'Revenue per Customer',
          currentValue: org.revenuePerCustomer,
          benchmarkValue: aggregates.totalRevenue / aggregates.totalCustomers,
          gap: (aggregates.totalRevenue / aggregates.totalCustomers) - org.revenuePerCustomer,
          potentialImpact: 'Increase wallet share with existing customers',
          recommendation: 'Focus on upselling and expanding services to current customer base'
        });
      }
    });

    res.status(200).json({
      organizations: orgMetrics,
      aggregates,
      benchmarks,
      bestPractices,
      improvementOpportunities
    });

  } catch (error) {
    console.error('Multi-org comparison error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
```

---

## 7.1.2 Multi-Org Comparison Dashboard Component

**File:** `src/components/dashboard/MultiOrgComparisonDashboard.js`

```javascript
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Flag,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material';
import { Chart as ChartJS } from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { fetchMultiOrgComparison } from 'slices/dashboardSlice';

const MultiOrgComparisonDashboard = () => {
  const dispatch = useDispatch();
  const { multiOrgComparison, loading } = useSelector((state) => state.dashboard);
  const [activeTab, setActiveTab] = useState(0);
  const [comparisonMetric, setComparisonMetric] = useState('revenue');
  
  useEffect(() => {
    dispatch(fetchMultiOrgComparison());
  }, [dispatch]);
  
  if (!multiOrgComparison.data) return null;
  
  const { organizations, aggregates, benchmarks, bestPractices, improvementOpportunities } = multiOrgComparison.data;
  
  // Format currency
  const formatCurrency = (amount) => `₹${(amount / 100000).toFixed(2)}L`;
  
  // Get rank badge color
  const getRankColor = (rank, total) => {
    const percentile = (total - rank + 1) / total;
    if (percentile >= 0.8) return 'success';
    if (percentile >= 0.6) return 'info';
    if (percentile >= 0.4) return 'warning';
    return 'error';
  };
  
  // Comparison bar chart
  const comparisonChartData = {
    labels: organizations.map(o => o.organizationName),
    datasets: [
      {
        label: 'Revenue',
        data: organizations.map(o => o.totalRevenue / 100000),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      },
      {
        label: 'Profit',
        data: organizations.map(o => o.totalProfit / 100000),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };
  
  const comparisonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Revenue & Profit Comparison' }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Amount (Lakhs)' }
      }
    }
  };
  
  // Performance radar chart
  const radarChartData = {
    labels: ['Revenue', 'Profit Margin', 'Fleet Utilization', 'Orders/Vehicle', 'Document Completion'],
    datasets: organizations.map((org, index) => ({
      label: org.organizationName,
      data: [
        (org.totalRevenue / benchmarks.revenue.max) * 100,
        (org.profitMargin / benchmarks.profitMargin.max) * 100,
        (org.fleetUtilization / benchmarks.fleetUtilization.max) * 100,
        (org.ordersPerVehicle / Math.max(...organizations.map(o => o.ordersPerVehicle))) * 100,
        org.documentCompletionRate
      ],
      backgroundColor: `rgba(${index * 50}, ${150 - index * 30}, ${200 - index * 20}, 0.2)`,
      borderColor: `rgba(${index * 50}, ${150 - index * 30}, ${200 - index * 20}, 1)`,
      borderWidth: 2
    }))
  };
  
  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20 }
      }
    },
    plugins: {
      legend: { position: 'top' }
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Multi-Organization Performance Comparison
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Revenue
              </Typography>
              <Typography variant="h4">
                {formatCurrency(aggregates.totalRevenue)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Across {organizations.length} organizations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Profit
              </Typography>
              <Typography variant="h4">
                {formatCurrency(aggregates.totalProfit)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg margin: {aggregates.avgMargin.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Orders
              </Typography>
              <Typography variant="h4">
                {aggregates.totalOrders}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {aggregates.totalCustomers} customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Fleet
              </Typography>
              <Typography variant="h4">
                {aggregates.totalVehicles}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Vehicles across all orgs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Performance Table" />
          <Tab label="Visual Comparison" />
          <Tab label="Best Practices" />
          <Tab label="Improvement Opportunities" />
        </Tabs>
      </Card>
      
      {/* Tab 0: Performance Table */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Organization</strong></TableCell>
                    <TableCell align="right"><strong>Revenue</strong></TableCell>
                    <TableCell align="right"><strong>Profit</strong></TableCell>
                    <TableCell align="right"><strong>Margin %</strong></TableCell>
                    <TableCell align="right"><strong>Orders</strong></TableCell>
                    <TableCell align="right"><strong>Utilization %</strong></TableCell>
                    <TableCell align="center"><strong>Growth %</strong></TableCell>
                    <TableCell align="center"><strong>Rankings</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.organizationId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {org.organizationName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {org.activeVehicles} vehicles · {org.activeCustomers} customers
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        {formatCurrency(org.totalRevenue)}
                      </TableCell>
                      
                      <TableCell align="right">
                        {formatCurrency(org.totalProfit)}
                      </TableCell>
                      
                      <TableCell align="right">
                        <Chip
                          label={`${org.profitMargin.toFixed(1)}%`}
                          color={org.profitMargin >= benchmarks.profitMargin.avg ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell align="right">
                        {org.totalOrders}
                      </TableCell>
                      
                      <TableCell align="right">
                        <Chip
                          label={`${org.fleetUtilization.toFixed(1)}%`}
                          color={org.fleetUtilization >= 70 ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          {parseFloat(org.revenueGrowth) >= 0 ? (
                            <ArrowUpward sx={{ fontSize: 16, color: 'success.main' }} />
                          ) : (
                            <ArrowDownward sx={{ fontSize: 16, color: 'error.main' }} />
                          )}
                          <Typography variant="body2">
                            {Math.abs(parseFloat(org.revenueGrowth))}%
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Tooltip title="Revenue Rank">
                            <Chip
                              label={`#${org.rankings.revenue}`}
                              color={getRankColor(org.rankings.revenue, organizations.length)}
                              size="small"
                            />
                          </Tooltip>
                          <Tooltip title="Margin Rank">
                            <Chip
                              label={`#${org.rankings.profitMargin}`}
                              color={getRankColor(org.rankings.profitMargin, organizations.length)}
                              size="small"
                            />
                          </Tooltip>
                          <Tooltip title="Efficiency Rank">
                            <Chip
                              label={`#${org.rankings.efficiency}`}
                              color={getRankColor(org.rankings.efficiency, organizations.length)}
                              size="small"
                            />
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
      
      {/* Tab 1: Visual Comparison */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ height: 400 }}>
                  <Bar data={comparisonChartData} options={comparisonChartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ height: 400 }}>
                  <Radar data={radarChartData} options={radarChartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Benchmarks */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Benchmarks
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">Revenue</Typography>
                      <Typography variant="body2">Min: {formatCurrency(benchmarks.revenue.min)}</Typography>
                      <Typography variant="body2">Avg: {formatCurrency(benchmarks.revenue.avg)}</Typography>
                      <Typography variant="body2">Max: {formatCurrency(benchmarks.revenue.max)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">Profit Margin</Typography>
                      <Typography variant="body2">Min: {benchmarks.profitMargin.min.toFixed(1)}%</Typography>
                      <Typography variant="body2">Avg: {benchmarks.profitMargin.avg.toFixed(1)}%</Typography>
                      <Typography variant="body2">Max: {benchmarks.profitMargin.max.toFixed(1)}%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">Fleet Utilization</Typography>
                      <Typography variant="body2">Min: {benchmarks.fleetUtilization.min.toFixed(1)}%</Typography>
                      <Typography variant="body2">Avg: {benchmarks.fleetUtilization.avg.toFixed(1)}%</Typography>
                      <Typography variant="body2">Max: {benchmarks.fleetUtilization.max.toFixed(1)}%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">Revenue/Vehicle</Typography>
                      <Typography variant="body2">Min: {formatCurrency(benchmarks.revenuePerVehicle.min)}</Typography>
                      <Typography variant="body2">Avg: {formatCurrency(benchmarks.revenuePerVehicle.avg)}</Typography>
                      <Typography variant="body2">Max: {formatCurrency(benchmarks.revenuePerVehicle.max)}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Tab 2: Best Practices */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents sx={{ color: 'warning.main' }} />
              Best Practices & Leaders
            </Typography>
            
            {bestPractices.length === 0 ? (
              <Alert severity="info">
                No standout best practices identified yet. Continue monitoring performance.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {bestPractices.map((practice, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            {practice.organizationName}
                          </Typography>
                          <Chip
                            label={practice.metric}
                            color="success"
                            size="small"
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {practice.insight}
                          </Typography>
                        </Box>
                        <Typography variant="h4" color="warning.main">
                          {typeof practice.value === 'number' && practice.value > 100
                            ? formatCurrency(practice.value)
                            : `${practice.value.toFixed(1)}%`}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Tab 3: Improvement Opportunities */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Flag sx={{ color: 'info.main' }} />
              Improvement Opportunities
            </Typography>
            
            {improvementOpportunities.length === 0 ? (
              <Alert severity="success">
                All organizations performing well! No major improvement opportunities identified.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {improvementOpportunities.map((opp, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">{opp.organizationName}</Typography>
                          <Chip label={opp.metric} color="warning" size="small" />
                        </Box>
                        <Chip
                          label={opp.potentialImpact}
                          color="info"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Current</Typography>
                          <Typography variant="h6">{opp.currentValue.toFixed(1)}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Benchmark</Typography>
                          <Typography variant="h6">{opp.benchmarkValue.toFixed(1)}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Gap</Typography>
                          <Typography variant="h6" color="error.main">
                            -{opp.gap.toFixed(1)}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      <Alert severity="info" icon={<TrendingUp />}>
                        <strong>Recommendation:</strong> {opp.recommendation}
                      </Alert>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MultiOrgComparisonDashboard;
```

---

**End of Part 1**

This covers the multi-organization comparison and benchmarking features. Part 2 will cover advanced ML predictions (revenue forecasting, churn prediction, demand optimization), and Part 3 will cover competitive intelligence, cohort analysis, and advanced scenario modeling.