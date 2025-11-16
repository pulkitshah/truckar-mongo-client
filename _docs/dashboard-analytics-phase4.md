# Phase 4: Time-Series & Trend Analysis

**Timeline:** Week 7-8  
**Goal:** Enable temporal analysis, forecasting, and seasonality detection for proactive decision-making  
**Status:** 📋 Planning  
**Prerequisites:** Phase 1-3 completed

---

## Overview

Phase 4 focuses on temporal patterns and predictive analytics to:
1. Identify seasonal trends and cyclical patterns
2. Forecast future performance using time-series analysis
3. Detect anomalies and unusual patterns
4. Track performance against historical benchmarks
5. Enable year-over-year and period-over-period comparisons
6. Support capacity planning and resource allocation

---

## 4.1 Enhanced Time-Series Charts

### Purpose
Replace basic revenue chart with comprehensive multi-metric time-series visualization

### 4.1.1 Advanced Revenue & Profit Chart

**Backend Endpoint:** `GET /api/analytics/time-series`

**Query Parameters:**
- `account` (required)
- `organization` (optional)
- `startDate` (required)
- `endDate` (required)
- `granularity` - 'day' | 'week' | 'month' | 'quarter' (required)
- `metrics` - Array: ['sales', 'profit', 'orders', 'margin', 'expenses'] (optional, default: all)
- `includeForecast` - Boolean (optional, default: false)
- `compareWithPreviousPeriod` - Boolean (optional, default: false)

**Response Structure:**
```javascript
{
  timeSeries: [
    {
      date: String,              // ISO date or period label
      period: String,            // "2024-W43", "2024-10", "Q3-2024"
      
      // Core metrics
      sales: Number,
      purchase: Number,
      profit: Number,
      profitMargin: Number,
      expenses: Number,
      orders: Number,
      
      // Volume metrics
      deliveries: Number,
      totalQuantity: Number,
      
      // Operational metrics
      uniqueCustomers: Number,
      newCustomers: Number,
      activeVehicles: Number,
      
      // Document compliance
      lrCompletionRate: Number,
      invoiceCompletionRate: Number,
      
      // Breakdown by type (optional)
      salesByType: {
        perTon: Number,
        fixed: Number,
        perCase: Number,
        // ... other types
      },
      
      // Customer segmentation
      salesBySegment: {
        champions: Number,
        loyal: Number,
        bigSpenders: Number,
        // ... other segments
      }
    }
  ],
  
  // Forecast data (if includeForecast=true)
  forecast: [
    {
      date: String,
      sales: {
        predicted: Number,
        lowerBound: Number,      // 95% confidence interval
        upperBound: Number
      },
      profit: {
        predicted: Number,
        lowerBound: Number,
        upperBound: Number
      },
      orders: {
        predicted: Number,
        lowerBound: Number,
        upperBound: Number
      }
    }
  ],
  
  // Comparison data (if compareWithPreviousPeriod=true)
  previousPeriod: [
    {
      date: String,              // Aligned to current period
      sales: Number,
      profit: Number,
      orders: Number,
      // ... other metrics
    }
  ],
  
  // Statistical summary
  statistics: {
    trend: {
      direction: 'increasing' | 'decreasing' | 'stable',
      magnitude: Number,         // % change per period
      significance: Number       // p-value (0-1)
    },
    
    seasonality: {
      detected: Boolean,
      pattern: 'weekly' | 'monthly' | 'quarterly' | 'none',
      strength: Number,          // 0-1 (1 = strong seasonality)
      peakPeriod: String         // "Monday", "December", "Q4"
    },
    
    volatility: {
      coefficient: Number,       // Coefficient of variation
      level: 'low' | 'medium' | 'high'
    },
    
    movingAverages: {
      ma7: Number,               // 7-period moving average
      ma30: Number,
      ema: Number                // Exponential moving average
    },
    
    growthMetrics: {
      periodOverPeriod: Number,  // % change vs previous period
      yearOverYear: Number,      // % change vs same period last year
      compoundGrowthRate: Number // CAGR
    }
  },
  
  // Anomalies detected
  anomalies: [
    {
      date: String,
      metric: String,
      value: Number,
      expectedValue: Number,
      deviation: Number,         // Standard deviations from expected
      type: 'spike' | 'drop' | 'outlier',
      severity: 'low' | 'medium' | 'high',
      explanation: String        // "Holiday period", "Data entry error", etc.
    }
  ]
}
```

**API Implementation:**

```javascript
// src/pages/api/analytics/time-series.js

import { connectToDatabase } from 'lib/mongodb';
import { calculateOrderFinancials } from 'helper/orderCalculations';
import moment from 'moment';

// Simple moving average calculation
const calculateMovingAverage = (data, period) => {
  return data.map((_, idx, arr) => {
    if (idx < period - 1) return null;
    const slice = arr.slice(idx - period + 1, idx + 1);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  });
};

// Exponential moving average
const calculateEMA = (data, period) => {
  const multiplier = 2 / (period + 1);
  const ema = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  
  return ema;
};

// Simple linear regression for trend
const calculateTrend = (values) => {
  const n = values.length;
  const indices = values.map((_, i) => i);
  
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
};

// Detect seasonality using autocorrelation
const detectSeasonality = (values, granularity) => {
  // Simplified seasonality detection
  // In production, use proper statistical methods (FFT, ACF)
  
  if (values.length < 14) return { detected: false, pattern: 'none', strength: 0 };
  
  // Check for weekly pattern (7 periods for daily data)
  if (granularity === 'day') {
    const weeklyCorr = calculateAutocorrelation(values, 7);
    if (weeklyCorr > 0.3) {
      return { 
        detected: true, 
        pattern: 'weekly', 
        strength: weeklyCorr,
        peakPeriod: findPeakDay(values)
      };
    }
  }
  
  // Check for monthly pattern
  if (granularity === 'day' || granularity === 'week') {
    const monthlyLag = granularity === 'day' ? 30 : 4;
    const monthlyCorr = calculateAutocorrelation(values, monthlyLag);
    if (monthlyCorr > 0.3) {
      return {
        detected: true,
        pattern: 'monthly',
        strength: monthlyCorr,
        peakPeriod: findPeakMonth(values, granularity)
      };
    }
  }
  
  return { detected: false, pattern: 'none', strength: 0 };
};

const calculateAutocorrelation = (values, lag) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  
  let covariance = 0;
  for (let i = 0; i < values.length - lag; i++) {
    covariance += (values[i] - mean) * (values[i + lag] - mean);
  }
  
  return covariance / variance;
};

// Anomaly detection using Z-score
const detectAnomalies = (timeSeries, metric, threshold = 2.5) => {
  const values = timeSeries.map(t => t[metric]).filter(v => v != null);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  );
  
  const anomalies = [];
  timeSeries.forEach(point => {
    const value = point[metric];
    if (value == null) return;
    
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push({
        date: point.date,
        metric,
        value,
        expectedValue: mean,
        deviation: zScore,
        type: value > mean ? 'spike' : 'drop',
        severity: zScore > 4 ? 'high' : zScore > 3 ? 'medium' : 'low',
        explanation: determineAnomalyReason(point.date, metric)
      });
    }
  });
  
  return anomalies;
};

const determineAnomalyReason = (date, metric) => {
  // Check if date is near known holidays/events
  const dateObj = new Date(date);
  const month = dateObj.getMonth();
  const day = dateObj.getDate();
  
  // Indian holidays (simplified)
  if (month === 10 && day >= 1 && day <= 5) return 'Diwali period';
  if (month === 2 && day >= 1 && day <= 10) return 'Holi period';
  if (month === 0 && day === 26) return 'Republic Day';
  if (month === 7 && day === 15) return 'Independence Day';
  
  // End of fiscal year
  if (month === 2 && day >= 25) return 'End of fiscal year';
  
  // Month end
  if (day >= 28) return 'Month-end activity';
  
  return 'Unusual activity - investigate';
};

// Simple forecasting using exponential smoothing
const generateForecast = (timeSeries, metric, periods = 30) => {
  const values = timeSeries.map(t => t[metric]).filter(v => v != null);
  
  // Holt-Winters exponential smoothing (simplified)
  const alpha = 0.3;  // Level smoothing
  const beta = 0.1;   // Trend smoothing
  
  let level = values[0];
  let trend = 0;
  
  // Fit the model
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  
  // Generate forecasts
  const forecasts = [];
  const lastDate = new Date(timeSeries[timeSeries.length - 1].date);
  
  // Calculate standard error for confidence intervals
  const errors = values.slice(1).map((val, i) => {
    return val - (values[i] + trend);
  });
  const stdError = Math.sqrt(
    errors.reduce((sum, err) => sum + err * err, 0) / errors.length
  );
  
  for (let i = 1; i <= periods; i++) {
    const predicted = level + i * trend;
    const margin = 1.96 * stdError * Math.sqrt(i); // 95% CI
    
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    forecasts.push({
      date: forecastDate.toISOString().split('T')[0],
      [metric]: {
        predicted: Math.max(0, predicted),
        lowerBound: Math.max(0, predicted - margin),
        upperBound: predicted + margin
      }
    });
  }
  
  return forecasts;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const {
    account,
    organization,
    startDate,
    endDate,
    granularity = 'day',
    metrics: requestedMetrics,
    includeForecast = 'false',
    compareWithPreviousPeriod = 'false'
  } = req.query;
  
  const { db } = await connectToDatabase();
  
  // Determine date grouping format
  const getDateFormat = (date, gran) => {
    const m = moment(date);
    switch (gran) {
      case 'day':
        return m.format('YYYY-MM-DD');
      case 'week':
        return m.format('YYYY-[W]WW');
      case 'month':
        return m.format('YYYY-MM');
      case 'quarter':
        return `Q${m.quarter()}-${m.year()}`;
      default:
        return m.format('YYYY-MM-DD');
    }
  };
  
  // Calculate previous period dates
  const start = moment(startDate);
  const end = moment(endDate);
  const periodDays = end.diff(start, 'days');
  const previousStart = moment(start).subtract(periodDays + 1, 'days');
  const previousEnd = moment(start).subtract(1, 'days');
  
  // Main aggregation pipeline
  const pipeline = [
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
    }
  ];
  
  // Add organization filter if specified
  if (organization) {
    pipeline.push({
      $match: {
        $or: [
          { organisation: organization },
          { 'vehicleData.organisation': organization }
        ]
      }
    });
  }
  
  // Calculate financials
  pipeline.push(
    {
      $addFields: {
        financials: {
          $function: {
            body: calculateOrderFinancials.toString(),
            args: ['$$ROOT'],
            lang: 'js'
          }
        },
        saleType: { $ifNull: ['$saleType', {}] },
        deliveryCount: { $size: { $ifNull: ['$deliveries', []] } }
      }
    },
    // Group by time period
    {
      $group: {
        _id: {
          $dateToString: {
            format: granularity === 'day' ? '%Y-%m-%d' :
                    granularity === 'week' ? '%Y-W%U' :
                    granularity === 'month' ? '%Y-%m' :
                    '%Y-Q',
            date: '$saleDate'
          }
        },
        
        // Core metrics
        sales: { $sum: '$financials.totalSales' },
        purchase: { $sum: '$financials.totalPurchase' },
        profit: { $sum: '$financials.totalProfit' },
        expenses: { $sum: '$financials.totalExpenses' },
        orders: { $sum: 1 },
        
        // Volume metrics
        deliveries: { $sum: '$deliveryCount' },
        totalQuantity: { $sum: { $ifNull: ['$deliveries.0.billQuantity', 0] } },
        
        // Customer metrics
        uniqueCustomers: { $addToSet: '$customer' },
        
        // Operational metrics
        activeVehicles: { $addToSet: '$vehicle' },
        
        // Document completion
        ordersWithLR: {
          $sum: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$deliveries', []] } }, 0] },
              {
                $cond: [
                  { $ne: [{ $ifNull: ['$deliveries.0.lr', null] }, null] },
                  1,
                  0
                ]
              },
              0
            ]
          }
        },
        ordersWithInvoice: {
          $sum: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$deliveries', []] } }, 0] },
              {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ['$deliveries.0.invoices', []] } }, 0] },
                  1,
                  0
                ]
              },
              0
            ]
          }
        },
        
        // Sales breakdown by type
        salesByType: {
          $push: {
            type: { $objectToArray: '$saleType' },
            amount: '$financials.baseSales'
          }
        }
      }
    },
    // Calculate derived metrics
    {
      $addFields: {
        date: '$_id',
        profitMargin: {
          $cond: {
            if: { $gt: ['$sales', 0] },
            then: { $multiply: [{ $divide: ['$profit', '$sales'] }, 100] },
            else: 0
          }
        },
        uniqueCustomerCount: { $size: '$uniqueCustomers' },
        activeVehicleCount: { $size: '$activeVehicles' },
        lrCompletionRate: {
          $cond: {
            if: { $gt: ['$orders', 0] },
            then: { $multiply: [{ $divide: ['$ordersWithLR', '$orders'] }, 100] },
            else: 0
          }
        },
        invoiceCompletionRate: {
          $cond: {
            if: { $gt: ['$orders', 0] },
            then: { $multiply: [{ $divide: ['$ordersWithInvoice', '$orders'] }, 100] },
            else: 0
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        uniqueCustomers: 0,
        activeVehicles: 0
      }
    },
    {
      $sort: { date: 1 }
    }
  );
  
  const timeSeries = await db.collection('orders').aggregate(pipeline).toArray();
  
  // Get previous period data if requested
  let previousPeriod = [];
  if (compareWithPreviousPeriod === 'true') {
    const previousPipeline = JSON.parse(JSON.stringify(pipeline));
    previousPipeline[0].$match.saleDate = {
      $gte: previousStart.toDate(),
      $lte: previousEnd.toDate()
    };
    
    previousPeriod = await db.collection('orders').aggregate(previousPipeline).toArray();
  }
  
  // Calculate statistics
  const salesValues = timeSeries.map(t => t.sales);
  const profitValues = timeSeries.map(t => t.profit);
  const orderValues = timeSeries.map(t => t.orders);
  
  const trend = calculateTrend(salesValues);
  const trendDirection = trend.slope > 5 ? 'increasing' : 
                        trend.slope < -5 ? 'decreasing' : 'stable';
  
  const seasonality = detectSeasonality(salesValues, granularity);
  
  const avgSales = salesValues.reduce((a, b) => a + b, 0) / salesValues.length;
  const stdDevSales = Math.sqrt(
    salesValues.reduce((sum, val) => sum + Math.pow(val - avgSales, 2), 0) / salesValues.length
  );
  const cv = (stdDevSales / avgSales) * 100;
  const volatilityLevel = cv < 20 ? 'low' : cv < 40 ? 'medium' : 'high';
  
  const ma7 = calculateMovingAverage(salesValues, Math.min(7, salesValues.length));
  const ma30 = calculateMovingAverage(salesValues, Math.min(30, salesValues.length));
  const ema = calculateEMA(salesValues, Math.min(14, salesValues.length));
  
  // Growth metrics
  const currentPeriodSales = salesValues.reduce((a, b) => a + b, 0);
  const previousPeriodSales = previousPeriod.length > 0 
    ? previousPeriod.reduce((sum, t) => sum + t.sales, 0)
    : 0;
  const periodOverPeriod = previousPeriodSales > 0
    ? ((currentPeriodSales - previousPeriodSales) / previousPeriodSales) * 100
    : 0;
  
  const statistics = {
    trend: {
      direction: trendDirection,
      magnitude: Math.abs(trend.slope),
      significance: 0.05  // Placeholder - proper statistical test needed
    },
    seasonality,
    volatility: {
      coefficient: cv,
      level: volatilityLevel
    },
    movingAverages: {
      ma7: ma7[ma7.length - 1],
      ma30: ma30[ma30.length - 1],
      ema: ema[ema.length - 1]
    },
    growthMetrics: {
      periodOverPeriod,
      yearOverYear: 0,  // Would need data from 1 year ago
      compoundGrowthRate: 0  // Would need longer historical data
    }
  };
  
  // Detect anomalies
  const anomalies = [
    ...detectAnomalies(timeSeries, 'sales'),
    ...detectAnomalies(timeSeries, 'profit'),
    ...detectAnomalies(timeSeries, 'orders')
  ];
  
  // Generate forecast if requested
  let forecast = [];
  if (includeForecast === 'true') {
    const forecastPeriods = granularity === 'day' ? 30 :
                           granularity === 'week' ? 12 :
                           granularity === 'month' ? 6 : 4;
    
    const salesForecast = generateForecast(timeSeries, 'sales', forecastPeriods);
    const profitForecast = generateForecast(timeSeries, 'profit', forecastPeriods);
    const ordersForecast = generateForecast(timeSeries, 'orders', forecastPeriods);
    
    // Merge forecasts
    forecast = salesForecast.map((sf, i) => ({
      date: sf.date,
      sales: sf.sales,
      profit: profitForecast[i].profit,
      orders: ordersForecast[i].orders
    }));
  }
  
  return res.status(200).json({
    timeSeries,
    forecast,
    previousPeriod,
    statistics,
    anomalies
  });
}
```

---

### 4.1.2 Advanced Time-Series Chart Component

**File:** `src/components/dashboard/AdvancedTimeSeriesChart.js`

```javascript
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import Chart from 'react-apexcharts';
import { fetchTimeSeries } from 'slices/dashboardSlice';
import { formatCurrency } from 'utils/formatters';

const AdvancedTimeSeriesChart = () => {
  const dispatch = useDispatch();
  const { timeSeries, loading } = useSelector((state) => state.dashboard);
  
  const [granularity, setGranularity] = useState('day');
  const [showForecast, setShowForecast] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState(['sales', 'profit']);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  
  useEffect(() => {
    dispatch(fetchTimeSeries({ 
      granularity, 
      includeForecast: showForecast,
      compareWithPreviousPeriod: showComparison
    }));
  }, [dispatch, granularity, showForecast, showComparison]);
  
  if (!timeSeries.data) return null;
  
  const { timeSeries: data, forecast, previousPeriod, statistics, anomalies } = timeSeries.data;
  
  // Prepare chart series
  const series = [];
  
  // Current period series
  if (selectedMetrics.includes('sales')) {
    series.push({
      name: 'Sales',
      type: 'area',
      data: data.map(d => ({ x: d.date, y: d.sales }))
    });
  }
  
  if (selectedMetrics.includes('profit')) {
    series.push({
      name: 'Profit',
      type: 'line',
      data: data.map(d => ({ x: d.date, y: d.profit }))
    });
  }
  
  if (selectedMetrics.includes('orders')) {
    series.push({
      name: 'Orders',
      type: 'column',
      data: data.map(d => ({ x: d.date, y: d.orders }))
    });
  }
  
  if (selectedMetrics.includes('margin')) {
    series.push({
      name: 'Margin %',
      type: 'line',
      data: data.map(d => ({ x: d.date, y: d.profitMargin }))
    });
  }
  
  // Moving average series
  if (statistics.movingAverages && selectedMetrics.includes('sales')) {
    series.push({
      name: 'MA-7',
      type: 'line',
      data: data.map((d, i) => ({
        x: d.date,
        y: statistics.movingAverages.ma7
      })),
      dashArray: 4
    });
  }
  
  // Previous period comparison
  if (showComparison && previousPeriod.length > 0) {
    series.push({
      name: 'Previous Period Sales',
      type: 'line',
      data: previousPeriod.map(d => ({ x: d.date, y: d.sales })),
      dashArray: 8,
      opacity: 0.5
    });
  }
  
  // Forecast series
  if (showForecast && forecast.length > 0) {
    series.push({
      name: 'Sales Forecast',
      type: 'line',
      data: forecast.map(f => ({ x: f.date, y: f.sales.predicted })),
      dashArray: 6,
      color: '#9333ea'
    });
    
    // Confidence interval
    series.push({
      name: 'Forecast Range',
      type: 'rangeArea',
      data: forecast.map(f => ({
        x: f.date,
        y: [f.sales.lowerBound, f.sales.upperBound]
      })),
      color: '#9333ea',
      opacity: 0.2
    });
  }
  
  // Chart options
  const chartOptions = {
    chart: {
      type: 'line',
      height: 450,
      toolbar: {
        show: true,
        tools: {
          download: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    stroke: {
      width: [3, 2, 0, 2, 2, 2, 2, 2],
      curve: 'smooth'
    },
    fill: {
      type: ['gradient', 'solid', 'solid', 'solid', 'solid', 'solid', 'solid', 'gradient'],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280', '#9333ea'],
    dataLabels: {
      enabled: false
    },
    markers: {
      size: 0,
      hover: {
        size: 5
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        format: granularity === 'day' ? 'dd MMM' :
                granularity === 'week' ? 'W ww' :
                granularity === 'month' ? 'MMM yyyy' : 'Q q yyyy'
      }
    },
    yaxis: [
      {
        title: {
          text: 'Amount (₹)'
        },
        labels: {
          formatter: (val) => formatCurrency(val, false)
        }
      },
      {
        opposite: true,
        title: {
          text: selectedMetrics.includes('orders') ? 'Orders' : ''
        },
        show: selectedMetrics.includes('orders')
      }
    ],
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: (val, opts) => {
          const seriesName = opts.w.config.series[opts.seriesIndex].name;
          if (seriesName.includes('Margin')) return `${val.toFixed(1)}%`;
          if (seriesName.includes('Orders')) return val.toString();
          return formatCurrency(val);
        }
      }
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'center'
    },
    grid: {
      borderColor: '#e0e0e0',
      strokeDashArray: 4
    },
    // Annotations for anomalies
    annotations: showAnomalies ? {
      points: anomalies
        .filter(a => selectedMetrics.includes(a.metric))
        .map(a => ({
          x: new Date(a.date).getTime(),
          y: a.value,
          marker: {
            size: 6,
            fillColor: a.severity === 'high' ? '#ef4444' : 
                      a.severity === 'medium' ? '#f59e0b' : '#fbbf24',
            strokeColor: '#fff',
            radius: 2
          },
          label: {
            borderColor: '#ef4444',
            style: {
              color: '#fff',
              background: '#ef4444',
              fontSize: '10px'
            },
            text: `⚠️ ${a.type}`
          }
        }))
    } : {}
  };
  
  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6">Performance Trends & Forecast</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
              {/* Trend indicator */}
              <Chip
                icon={statistics.trend.direction === 'increasing' ? <TrendingUp /> : <TrendingDown />}
                label={`${statistics.trend.direction} ${statistics.trend.magnitude.toFixed(1)}%`}
                color={statistics.trend.direction === 'increasing' ? 'success' : 'error'}
                size="small"
              />
              
              {/* Seasonality indicator */}
              {statistics.seasonality.detected && (
                <Chip
                  icon={<TimelineIcon />}
                  label={`${statistics.seasonality.pattern} pattern detected`}
                  color="info"
                  size="small"
                />
              )}
              
              {/* Volatility indicator */}
              <Chip
                label={`${statistics.volatility.level} volatility`}
                color={statistics.volatility.level === 'high' ? 'warning' : 'default'}
                size="small"
              />
              
              {/* Growth indicator */}
              {statistics.growthMetrics.periodOverPeriod !== 0 && (
                <Chip
                  label={`${statistics.growthMetrics.periodOverPeriod >= 0 ? '+' : ''}${statistics.growthMetrics.periodOverPeriod.toFixed(1)}% vs prev period`}
                  color={statistics.growthMetrics.periodOverPeriod >= 0 ? 'success' : 'error'}
                  size="small"
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Granularity selector */}
            <ToggleButtonGroup
              value={granularity}
              exclusive
              onChange={(e, value) => value && setGranularity(value)}
              size="small"
            >
              <ToggleButton value="day">Day</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="quarter">Quarter</ToggleButton>
            </ToggleButtonGroup>
            
            {/* Settings menu */}
            <IconButton
              onClick={(e) => setSettingsAnchor(e.currentTarget)}
              size="small"
            >
              <SettingsIcon />
            </IconButton>
            <Menu
              anchorEl={settingsAnchor}
              open={Boolean(settingsAnchor)}
              onClose={() => setSettingsAnchor(null)}
            >
              <MenuItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showForecast}
                      onChange={(e) => setShowForecast(e.target.checked)}
                    />
                  }
                  label="Show Forecast"
                />
              </MenuItem>
              <MenuItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showComparison}
                      onChange={(e) => setShowComparison(e.target.checked)}
                    />
                  }
                  label="Compare with Previous Period"
                />
              </MenuItem>
              <MenuItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showAnomalies}
                      onChange={(e) => setShowAnomalies(e.target.checked)}
                    />
                  }
                  label="Show Anomalies"
                />
              </MenuItem>
            </Menu>
          </Box>
        </Box>
        
        {/* Anomaly alerts */}
        {showAnomalies && anomalies.length > 0 && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" fontWeight={600}>
              {anomalies.length} anomalies detected in this period
            </Typography>
            <Box sx={{ mt: 1 }}>
              {anomalies.slice(0, 3).map((anomaly, i) => (
                <Typography key={i} variant="caption" display="block">
                  • {new Date(anomaly.date).toLocaleDateString()}: {anomaly.metric} {anomaly.type} 
                  ({formatCurrency(anomaly.value)}) - {anomaly.explanation}
                </Typography>
              ))}
              {anomalies.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  ... and {anomalies.length - 3} more
                </Typography>
              )}
            </Box>
          </Alert>
        )}
        
        {/* Metric selector */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {['sales', 'profit', 'orders', 'margin'].map(metric => (
            <Chip
              key={metric}
              label={metric.charAt(0).toUpperCase() + metric.slice(1)}
              onClick={() => {
                setSelectedMetrics(prev =>
                  prev.includes(metric)
                    ? prev.filter(m => m !== metric)
                    : [...prev, metric]
                );
              }}
              color={selectedMetrics.includes(metric) ? 'primary' : 'default'}
              variant={selectedMetrics.includes(metric) ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </Box>
        
        {/* Chart */}
        <Box sx={{ height: 450 }}>
          <Chart
            options={chartOptions}
            series={series}
            type="line"
            height={450}
          />
        </Box>
        
        {/* Statistical summary */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 2,
          mt: 3,
          p: 2,
          backgroundColor: 'background.default',
          borderRadius: 1
        }}>
          <Box>
            <Typography variant="caption" color="text.secondary">7-Period MA</Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatCurrency(statistics.movingAverages.ma7)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">30-Period MA</Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatCurrency(statistics.movingAverages.ma30)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Volatility (CV)</Typography>
            <Typography variant="body2" fontWeight={600}>
              {statistics.volatility.coefficient.toFixed(1)}%
            </Typography>
          </Box>
          {statistics.seasonality.detected && (
            <Box>
              <Typography variant="caption" color="text.secondary">Peak Period</Typography>
              <Typography variant="body2" fontWeight={600}>
                {statistics.seasonality.peakPeriod || 'N/A'}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AdvancedTimeSeriesChart;
```

---

## 4.2 Year-over-Year Comparison

### Purpose
Compare current performance with same period in previous years

### Component Structure

**Visualization:** Grouped bar chart or line chart with multiple year series

```javascript
const YearOverYearChart = () => {
  // Show current year, previous year, and 2 years ago
  // Monthly or quarterly comparison
  // Highlight best/worst performing periods
  
  const series = [
    {
      name: '2025',
      data: [/* monthly values */]
    },
    {
      name: '2024',
      data: [/* monthly values */]
    },
    {
      name: '2023',
      data: [/* monthly values */]
    }
  ];
  
  // Chart shows clear comparison with % change labels
  // Identifies seasonal patterns across years
};
```

---

## 4.3 Cohort Analysis

### Purpose
Track customer behavior over time by acquisition cohort

### Cohort Definition
Group customers by first order month, analyze retention and revenue over subsequent months

**Backend Endpoint:** `GET /api/analytics/cohort-analysis`

**Response Structure:**
```javascript
{
  cohorts: [
    {
      cohortMonth: 'YYYY-MM',
      customersAcquired: Number,
      
      // Retention by month
      retention: [
        {
          month: 0,  // Same month
          activeCustomers: Number,
          retentionRate: Number,
          revenue: Number
        },
        {
          month: 1,  // One month later
          activeCustomers: Number,
          retentionRate: Number,
          revenue: Number
        }
        // ... up to 12 months
      ]
    }
  ]
}
```

**Visualization:** Heatmap showing retention rates across cohorts and time

---

## 4.4 Seasonality Calendar

### Purpose
Visual calendar showing business patterns by day/week/month

### Component Structure

**Calendar Heatmap:** Similar to GitHub contribution graph
- Each cell = day (or week/month)
- Color intensity = sales/profit/orders
- Easy identification of high/low periods
- Holiday and event markers

```javascript
const SeasonalityCalendar = () => {
  // 12-month calendar grid
  // Color-coded cells by metric value
  // Hover shows exact values
  // Click drills down to day details
};
```

---

## 4.5 Performance Benchmarking

### Purpose
Compare current metrics against historical averages and targets

### Component: Benchmark Cards

```javascript
const BenchmarkCard = ({ metric, current, benchmark, target }) => {
  const vsAverage = ((current - benchmark) / benchmark) * 100;
  const vsTarget = ((current - target) / target) * 100;
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h4">{formatValue(current)}</Typography>
        <Typography variant="body2" color="text.secondary">{metric}</Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Chip
            label={`${vsAverage >= 0 ? '+' : ''}${vsAverage.toFixed(1)}% vs avg`}
            color={vsAverage >= 0 ? 'success' : 'error'}
            size="small"
          />
          <Chip
            label={`${vsTarget >= 0 ? '+' : ''}${vsTarget.toFixed(1)}% vs target`}
            color={vsTarget >= 0 ? 'success' : 'warning'}
            size="small"
          />
        </Box>
        
        {/* Mini spark line showing trend */}
        <Box sx={{ mt: 2 }}>
          <Chart type="line" height={50} /* historical values */ />
        </Box>
      </CardContent>
    </Card>
  );
};
```

---

## Redux Integration

### State Structure

```javascript
{
  timeSeries: {
    data: { timeSeries: [], forecast: [], statistics: {}, anomalies: [] },
    loading: false,
    error: null
  },
  
  yearOverYear: {
    data: { years: [], comparison: {} },
    loading: false,
    error: null
  },
  
  cohortAnalysis: {
    data: { cohorts: [] },
    loading: false,
    error: null
  },
  
  benchmarks: {
    data: { current: {}, historical: {}, targets: {} },
    loading: false,
    error: null
  }
}
```

### Thunks

```javascript
export const fetchTimeSeries = createAsyncThunk(
  'dashboard/fetchTimeSeries',
  async ({ granularity, includeForecast, compareWithPreviousPeriod }, { getState, rejectWithValue }) => {
    const { selectedOrganization, dateRange } = getState().dashboard;
    const { currentAccount } = getState().auth;
    
    try {
      const response = await analyticsApi.getTimeSeries({
        account: currentAccount,
        organization: selectedOrganization,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        granularity,
        includeForecast,
        compareWithPreviousPeriod
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchYearOverYear = createAsyncThunk(/*...*/);
export const fetchCohortAnalysis = createAsyncThunk(/*...*/);
export const fetchBenchmarks = createAsyncThunk(/*...*/);
```

---

## Database Indexes for Phase 4

```javascript
// Optimize time-series queries
db.orders.createIndex({
  account: 1,
  saleDate: -1,
  organisation: 1
});

// For customer cohort analysis
db.orders.createIndex({
  account: 1,
  customer: 1,
  saleDate: 1
});

// For anomaly detection
db.orders.createIndex({
  account: 1,
  saleDate: 1,
  'financials.totalSales': 1
});
```

---

## Testing Requirements

### Unit Tests
- [ ] Moving average calculation accuracy
- [ ] Trend detection algorithm
- [ ] Seasonality detection
- [ ] Anomaly detection (Z-score)
- [ ] Forecast generation (exponential smoothing)

### Integration Tests
- [ ] Time-series API with various granularities
- [ ] Forecast API accuracy validation
- [ ] Anomaly detection with real data
- [ ] Previous period comparison alignment

### Performance Tests
- [ ] Time-series aggregation completes in <1.5s
- [ ] Forecast generation completes in <500ms
- [ ] Chart renders smoothly with 365 data points
- [ ] Moving average calculations are instant

### Data Validation Tests
- [ ] Handle missing data points gracefully
- [ ] Validate forecast confidence intervals
- [ ] Test with seasonal and non-seasonal data
- [ ] Verify anomaly detection accuracy

---

## Deployment Checklist - Phase 4

### Backend
- [ ] Create `/api/analytics/time-series` endpoint
- [ ] Implement statistical functions (MA, EMA, trend, seasonality)
- [ ] Implement forecasting algorithm (exponential smoothing)
- [ ] Implement anomaly detection (Z-score method)
- [ ] Create `/api/analytics/year-over-year` endpoint
- [ ] Create `/api/analytics/cohort-analysis` endpoint
- [ ] Create `/api/analytics/benchmarks` endpoint
- [ ] Add time-series specific indexes
- [ ] Test forecast accuracy with historical data
- [ ] Optimize aggregation performance

### Frontend
- [ ] Build `AdvancedTimeSeriesChart` component
- [ ] Build `YearOverYearChart` component
- [ ] Build `SeasonalityCalendar` component
- [ ] Build `CohortAnalysisHeatmap` component
- [ ] Build `BenchmarkCard` components
- [ ] Implement chart interactivity (zoom, pan, hover)
- [ ] Add anomaly markers to charts
- [ ] Implement forecast toggle
- [ ] Add comparison period toggle
- [ ] Test with various date ranges and granularities

### Machine Learning (Future Enhancement)
- [ ] Research advanced forecasting models (ARIMA, Prophet, LSTM)
- [ ] Implement proper statistical significance tests
- [ ] Add confidence intervals to all predictions
- [ ] Implement A/B testing for forecast accuracy
- [ ] Consider external factors (holidays, events, weather)

### Integration
- [ ] Connect time-series component to Redux
- [ ] Implement granularity switching
- [ ] Add forecast caching (Redis)
- [ ] Test forecast accuracy over time
- [ ] Implement anomaly notifications (email/SMS)
- [ ] Add bookmark for important anomalies

---

## Advanced Features (Post Phase 4)

### 1. Prophet-based Forecasting
**When:** After basic forecasting proves valuable

Facebook's Prophet library for production-grade time-series forecasting:
- Handles seasonality automatically
- Accounts for holidays and events
- Provides uncertainty intervals
- Works well with missing data

### 2. Real-time Anomaly Alerts
**When:** After anomaly detection is validated

- WebSocket/SSE for real-time updates
- Email/SMS notifications for critical anomalies
- Slack/Teams integration
- Customizable alert thresholds per organization

### 3. What-If Scenarios
**When:** After forecasting is trusted

Interactive scenario planning:
- Adjust pricing → see revenue impact
- Change volume → see profit impact
- Seasonal planning → capacity requirements
- Compare multiple scenarios side-by-side

### 4. Trend Decomposition
**When:** For advanced users needing deeper analysis

Break down time-series into:
- Trend component (long-term direction)
- Seasonal component (repeating patterns)
- Residual component (noise/irregularities)
- Interactive decomposition viewer

---

## Performance Optimization

### Caching Strategy

```javascript
// Redis cache for expensive calculations
const cacheKey = `timeseries:${account}:${organization}:${startDate}:${endDate}:${granularity}`;
const cachedData = await redis.get(cacheKey);

if (cachedData) {
  return JSON.parse(cachedData);
}

// Calculate and cache for 1 hour
const data = await calculateTimeSeries(/*...*/);
await redis.setex(cacheKey, 3600, JSON.stringify(data));
```

### Aggregation Optimization

```javascript
// Pre-aggregate daily/weekly/monthly summaries
// Background job runs nightly to update aggregations
// API queries pre-aggregated tables instead of raw orders

db.createCollection('daily_aggregates');
db.createCollection('weekly_aggregates');
db.createCollection('monthly_aggregates');

// Indexes on aggregated collections
db.daily_aggregates.createIndex({ account: 1, organisation: 1, date: -1 });
```

---

## End of Phase 4 Documentation

**Status:** ✅ Complete and ready for review

**Next Phase:** Phase 5 - Operational Efficiency Analytics

**Estimated Implementation Time:**
- Time-series backend: 12-16 hours
- Advanced chart component: 10-12 hours
- Statistical functions: 8-10 hours
- Forecasting implementation: 8-10 hours
- Anomaly detection: 6-8 hours
- Year-over-year comparison: 4-6 hours
- Cohort analysis: 6-8 hours
- Testing & optimization: 8-10 hours
- **Total: 62-80 hours (8-10 working days)**

**Key Success Metrics:**
- Forecast accuracy within 15% of actual (MAPE < 15%)
- Detect 90%+ of true anomalies with <10% false positives
- Identify seasonal patterns with 80%+ confidence
- Enable proactive planning based on trends
- Reduce manual analysis time by 70%