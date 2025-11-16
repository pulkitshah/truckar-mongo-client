# Phase 6: Scoring & Recommendation Engine

**Timeline:** Week 11-12  
**Goal:** Implement intelligent scoring algorithms and AI-powered recommendations for strategic decision-making  
**Status:** 📋 Planning  
**Prerequisites:** Phase 1-5 completed (historical data needed for accurate scoring)

---

## Overview

Phase 6 focuses on intelligent analysis and actionable recommendations to:
1. Provide comprehensive scoring for customers, transporters, routes, and drivers
2. Generate data-driven recommendations for business optimization
3. Identify risks and opportunities automatically
4. Enable predictive insights using historical patterns
5. Support strategic planning with scenario analysis
6. Deliver personalized dashboard insights based on user role

---

## 6.1 Comprehensive Scoring System

### Purpose
Unified scoring framework across all business entities (already partially implemented in Phase 2-5, now consolidated)

### 6.1.1 Master Scoring Dashboard

**Backend Endpoint:** `GET /api/analytics/master-scores`

**Query Parameters:**
- `account` (required)
- `organization` (optional)
- `startDate` (required)
- `endDate` (required)
- `entityType` - 'customer' | 'transporter' | 'route' | 'vehicle' | 'driver' | 'all'

**Response Structure:**
```javascript
{
  scoreSummary: {
    avgCustomerScore: Number,
    avgTransporterScore: Number,
    avgRouteScore: Number,
    avgVehicleScore: Number,
    avgDriverScore: Number,
    overallHealthScore: Number      // Weighted composite of all scores
  },
  
  customerScores: [
    {
      customerId: ObjectId,
      name: String,
      healthScore: Number,          // 0-100 from Phase 2
      rfmSegment: String,
      tier: String,
      riskLevel: 'low' | 'medium' | 'high',
      opportunities: Array<String>,
      recommendations: Array<String>
    }
  ],
  
  transporterScores: [
    {
      transporterId: ObjectId,
      name: String,
      partnershipScore: Number,     // 0-100 from Phase 2
      tier: String,
      reliabilityScore: Number,
      costEfficiencyScore: Number,
      riskLevel: String,
      recommendations: Array<String>
    }
  ],
  
  routeScores: [
    {
      routeId: String,
      routeScore: Number,           // 0-100 from Phase 3
      routeTier: String,
      profitability: String,
      growthPotential: Number,      // 0-100
      recommendations: Array<String>
    }
  ],
  
  vehicleScores: [
    {
      vehicleId: ObjectId,
      vehicleNumber: String,
      efficiencyScore: Number,      // 0-100 from Phase 5
      performanceTier: String,
      maintenanceRisk: String,
      utilizationPotential: Number,
      recommendations: Array<String>
    }
  ],
  
  driverScores: [
    {
      driverId: ObjectId,
      name: String,
      performanceScore: Number,     // 0-100 from Phase 5
      reliabilityTier: String,
      workloadStatus: String,
      trainingNeeds: Array<String>,
      recommendations: Array<String>
    }
  ],
  
  criticalItems: [
    {
      entityType: String,
      entityId: ObjectId,
      entityName: String,
      issue: String,
      severity: 'critical' | 'high' | 'medium',
      actionRequired: String,
      estimatedImpact: String
    }
  ]
}
```

---

## 6.2 AI-Powered Dashboard Insights

### Purpose
Generate contextual, actionable insights automatically displayed on dashboard

### 6.2.1 Insight Generation Engine

**Backend Endpoint:** `GET /api/analytics/ai-insights`

**Query Parameters:**
- `account`, `organization`, `startDate`, `endDate`
- `insightTypes` - Array: ['financial', 'operational', 'customer', 'risk', 'opportunity']
- `priority` - 'critical' | 'high' | 'all'

**Response Structure:**
```javascript
{
  insights: [
    {
      id: String,
      type: 'financial' | 'operational' | 'customer' | 'risk' | 'opportunity',
      category: String,             // More specific: 'revenue_drop', 'cost_spike', etc.
      priority: 'critical' | 'high' | 'medium' | 'low',
      
      title: String,                // "Revenue declined 15% this week"
      description: String,          // Detailed explanation
      
      metrics: {
        current: Number,
        previous: Number,
        change: Number,
        changePercent: Number
      },
      
      affectedEntities: [
        {
          type: String,             // 'customer', 'route', etc.
          id: ObjectId,
          name: String,
          impact: String
        }
      ],
      
      rootCause: String,            // Analyzed reason for the insight
      confidence: Number,           // 0-100 confidence in analysis
      
      recommendations: [
        {
          action: String,
          expectedImpact: String,
          effort: 'low' | 'medium' | 'high',
          timeframe: String
        }
      ],
      
      visualizations: {
        chartType: String,          // 'line', 'bar', 'comparison'
        chartData: Object
      },
      
      dismissed: Boolean,
      createdAt: Date,
      expiresAt: Date               // Insights are time-sensitive
    }
  ],
  
  insightCategories: {
    financial: Number,              // Count by type
    operational: Number,
    customer: Number,
    risk: Number,
    opportunity: Number
  }
}
```

**Insight Generation Logic:**

```javascript
// src/lib/insightEngine.js

class InsightEngine {
  constructor(analyticsData) {
    this.data = analyticsData;
    this.insights = [];
  }
  
  generateAllInsights() {
    this.detectFinancialAnomalies();
    this.identifyCustomerRisks();
    this.findGrowthOpportunities();
    this.detectOperationalIssues();
    this.analyzeSeasonalPatterns();
    
    return this.prioritizeInsights();
  }
  
  detectFinancialAnomalies() {
    // Revenue drops
    if (this.data.currentPeriodRevenue < this.data.previousPeriodRevenue * 0.85) {
      this.insights.push({
        type: 'financial',
        category: 'revenue_drop',
        priority: 'critical',
        title: `Revenue declined ${this.percentChange(this.data.currentPeriodRevenue, this.data.previousPeriodRevenue)}% this period`,
        description: 'Significant revenue decrease detected. Analysis shows primary drivers...',
        metrics: {
          current: this.data.currentPeriodRevenue,
          previous: this.data.previousPeriodRevenue,
          change: this.data.currentPeriodRevenue - this.data.previousPeriodRevenue,
          changePercent: this.percentChange(this.data.currentPeriodRevenue, this.data.previousPeriodRevenue)
        },
        rootCause: this.analyzeRevenueDropCause(),
        confidence: 85,
        recommendations: [
          {
            action: 'Focus on high-value customers showing reduced activity',
            expectedImpact: 'Potential recovery of 40% of lost revenue',
            effort: 'medium',
            timeframe: '2-4 weeks'
          }
        ]
      });
    }
    
    // Margin compression
    const currentMargin = (this.data.currentPeriodProfit / this.data.currentPeriodRevenue) * 100;
    const previousMargin = (this.data.previousPeriodProfit / this.data.previousPeriodRevenue) * 100;
    
    if (currentMargin < previousMargin - 3) {
      this.insights.push({
        type: 'financial',
        category: 'margin_compression',
        priority: 'high',
        title: `Profit margin decreased by ${(previousMargin - currentMargin).toFixed(1)} percentage points`,
        description: `Current margin: ${currentMargin.toFixed(1)}% vs Previous: ${previousMargin.toFixed(1)}%`,
        rootCause: this.analyzeMarginCompression(),
        confidence: 90,
        recommendations: [
          {
            action: 'Review pricing on low-margin routes',
            expectedImpact: 'Margin improvement of 2-3%',
            effort: 'medium',
            timeframe: '1-2 weeks'
          },
          {
            action: 'Negotiate better rates with high-cost transporters',
            expectedImpact: 'Cost reduction of 5-8%',
            effort: 'high',
            timeframe: '4-6 weeks'
          }
        ]
      });
    }
    
    // Expense spikes
    const expenseRatio = (this.data.currentExpenses / this.data.currentPeriodRevenue) * 100;
    if (expenseRatio > 15) {
      this.insights.push({
        type: 'financial',
        category: 'high_expenses',
        priority: 'high',
        title: `Operating expenses at ${expenseRatio.toFixed(1)}% of revenue`,
        description: 'Expense ratio exceeds healthy threshold of 15%',
        rootCause: this.identifyExpenseDrivers(),
        confidence: 95,
        recommendations: [
          {
            action: 'Audit high-expense orders and optimize',
            expectedImpact: 'Expense reduction of 10-15%',
            effort: 'medium',
            timeframe: '2-3 weeks'
          }
        ]
      });
    }
  }
  
  identifyCustomerRisks() {
    // Customer churn risk
    const atRiskCustomers = this.data.customers.filter(c => 
      c.rfmSegment === 'at_risk' || c.rfmSegment === 'about_to_sleep'
    );
    
    if (atRiskCustomers.length > 0) {
      const atRiskRevenue = atRiskCustomers.reduce((sum, c) => sum + c.totalRevenue, 0);
      
      this.insights.push({
        type: 'customer',
        category: 'churn_risk',
        priority: atRiskRevenue > this.data.currentPeriodRevenue * 0.2 ? 'critical' : 'high',
        title: `${atRiskCustomers.length} customers at risk of churn`,
        description: `At-risk customers represent ${this.formatCurrency(atRiskRevenue)} in revenue (${((atRiskRevenue / this.data.currentPeriodRevenue) * 100).toFixed(1)}%)`,
        affectedEntities: atRiskCustomers.map(c => ({
          type: 'customer',
          id: c.customerId,
          name: c.name,
          impact: `${this.formatCurrency(c.totalRevenue)} revenue at risk`
        })),
        rootCause: 'Customers showing reduced frequency and recency',
        confidence: 75,
        recommendations: [
          {
            action: 'Launch re-engagement campaign with personalized offers',
            expectedImpact: 'Retain 50-60% of at-risk customers',
            effort: 'medium',
            timeframe: '2-3 weeks'
          },
          {
            action: 'Schedule direct meetings with top 5 at-risk accounts',
            expectedImpact: 'Understand pain points and improve retention',
            effort: 'low',
            timeframe: '1 week'
          }
        ]
      });
    }
    
    // Customer concentration risk
    const top3CustomerRevenue = this.data.customers
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 3)
      .reduce((sum, c) => sum + c.totalRevenue, 0);
    
    const concentrationRatio = (top3CustomerRevenue / this.data.currentPeriodRevenue) * 100;
    
    if (concentrationRatio > 50) {
      this.insights.push({
        type: 'risk',
        category: 'customer_concentration',
        priority: 'high',
        title: `Top 3 customers account for ${concentrationRatio.toFixed(1)}% of revenue`,
        description: 'High revenue concentration poses business continuity risk',
        rootCause: 'Limited customer diversification',
        confidence: 100,
        recommendations: [
          {
            action: 'Expand customer acquisition in new segments',
            expectedImpact: 'Reduce concentration to <40% within 6 months',
            effort: 'high',
            timeframe: '3-6 months'
          },
          {
            action: 'Strengthen relationships with top customers (contracts, SLAs)',
            expectedImpact: 'Reduce churn risk for critical accounts',
            effort: 'medium',
            timeframe: '1-2 months'
          }
        ]
      });
    }
  }
  
  findGrowthOpportunities() {
    // High-performing segments
    const champions = this.data.customers.filter(c => c.rfmSegment === 'champions');
    if (champions.length > 0) {
      const championAvgRevenue = champions.reduce((sum, c) => sum + c.totalRevenue, 0) / champions.length;
      
      this.insights.push({
        type: 'opportunity',
        category: 'upsell_potential',
        priority: 'medium',
        title: `${champions.length} champion customers averaging ${this.formatCurrency(championAvgRevenue)}`,
        description: 'Opportunity to increase wallet share with high-value, loyal customers',
        rootCause: 'Strong relationship foundation with top-tier customers',
        confidence: 80,
        recommendations: [
          {
            action: 'Offer premium services or volume discounts to champions',
            expectedImpact: 'Increase revenue by 15-20% from this segment',
            effort: 'low',
            timeframe: '2-4 weeks'
          },
          {
            action: 'Request referrals from satisfied champion customers',
            expectedImpact: 'Acquire 3-5 new quality customers',
            effort: 'low',
            timeframe: '1-2 months'
          }
        ]
      });
    }
    
    // Growing routes
    const growingRoutes = this.data.routes.filter(r => 
      r.growthRate > 20 && r.orderCount >= 5
    );
    
    if (growingRoutes.length > 0) {
      this.insights.push({
        type: 'opportunity',
        category: 'route_expansion',
        priority: 'medium',
        title: `${growingRoutes.length} routes showing strong growth (>20%)`,
        description: 'Opportunity to capitalize on growing demand in specific lanes',
        affectedEntities: growingRoutes.map(r => ({
          type: 'route',
          id: r.routeId,
          name: r.routeId,
          impact: `${r.growthRate.toFixed(1)}% growth, ${r.orderCount} orders`
        })),
        rootCause: 'Market demand increasing in these corridors',
        confidence: 85,
        recommendations: [
          {
            action: 'Allocate additional fleet capacity to high-growth routes',
            expectedImpact: 'Capture 25-30% more volume',
            effort: 'medium',
            timeframe: '2-3 weeks'
          },
          {
            action: 'Proactive customer outreach in growing markets',
            expectedImpact: 'Acquire new customers in expansion areas',
            effort: 'medium',
            timeframe: '4-6 weeks'
          }
        ]
      });
    }
    
    // Underutilized assets
    const underutilizedVehicles = this.data.vehicles.filter(v => 
      v.utilizationRate < 50 && v.condition !== 'poor'
    );
    
    if (underutilizedVehicles.length > 0) {
      this.insights.push({
        type: 'opportunity',
        category: 'asset_optimization',
        priority: 'medium',
        title: `${underutilizedVehicles.length} vehicles underutilized (<50%)`,
        description: 'Opportunity to increase revenue without additional capital',
        affectedEntities: underutilizedVehicles.map(v => ({
          type: 'vehicle',
          id: v.vehicleId,
          name: v.vehicleNumber,
          impact: `${v.utilizationRate.toFixed(1)}% utilization`
        })),
        rootCause: 'Fleet capacity exceeds current demand or inefficient allocation',
        confidence: 90,
        recommendations: [
          {
            action: 'Reassign underutilized vehicles to high-demand routes',
            expectedImpact: 'Increase utilization to 70-80%',
            effort: 'low',
            timeframe: '1-2 weeks'
          },
          {
            action: 'Consider leasing excess capacity or fleet right-sizing',
            expectedImpact: 'Reduce fixed costs or generate additional income',
            effort: 'high',
            timeframe: '1-3 months'
          }
        ]
      });
    }
  }
  
  detectOperationalIssues() {
    // Document compliance issues
    const docCompletionRate = this.data.operationalMetrics.documentCompletionRate;
    if (docCompletionRate < 85) {
      this.insights.push({
        type: 'operational',
        category: 'compliance_issue',
        priority: 'high',
        title: `Document completion rate at ${docCompletionRate.toFixed(1)}%`,
        description: 'Below target of 90% - potential billing delays and disputes',
        rootCause: this.analyzeDocumentBottleneck(),
        confidence: 95,
        recommendations: [
          {
            action: 'Implement automated document reminders',
            expectedImpact: 'Increase completion rate to 92-95%',
            effort: 'low',
            timeframe: '1 week'
          },
          {
            action: 'Train staff on document upload procedures',
            expectedImpact: 'Reduce errors and delays',
            effort: 'low',
            timeframe: '2 weeks'
          }
        ]
      });
    }
    
    // Fleet utilization issues
    const fleetUtilization = this.data.operationalMetrics.fleetUtilizationRate;
    if (fleetUtilization < 65) {
      this.insights.push({
        type: 'operational',
        category: 'low_utilization',
        priority: 'high',
        title: `Fleet utilization at ${fleetUtilization.toFixed(1)}%`,
        description: 'Below industry benchmark of 75% - efficiency opportunity',
        rootCause: 'Mismatch between fleet capacity and order demand',
        confidence: 90,
        recommendations: [
          {
            action: 'Optimize vehicle-route assignments using analytics',
            expectedImpact: 'Increase utilization by 10-15 percentage points',
            effort: 'medium',
            timeframe: '2-3 weeks'
          },
          {
            action: 'Consider dynamic fleet allocation based on demand patterns',
            expectedImpact: 'Match capacity to demand more effectively',
            effort: 'high',
            timeframe: '1-2 months'
          }
        ]
      });
    }
    
    // Driver workload imbalance
    const driverWorkloadCV = this.calculateCoefficientOfVariation(
      this.data.drivers.map(d => d.orderCount)
    );
    
    if (driverWorkloadCV > 0.4) {
      this.insights.push({
        type: 'operational',
        category: 'workload_imbalance',
        priority: 'medium',
        title: 'Uneven workload distribution across drivers',
        description: 'Some drivers overloaded while others underutilized',
        rootCause: 'Lack of systematic workload balancing',
        confidence: 85,
        recommendations: [
          {
            action: 'Implement fair workload distribution algorithm',
            expectedImpact: 'Reduce driver burnout and improve satisfaction',
            effort: 'medium',
            timeframe: '2-4 weeks'
          },
          {
            action: 'Monitor driver utilization weekly and rebalance',
            expectedImpact: 'Maintain equitable workload distribution',
            effort: 'low',
            timeframe: 'Ongoing'
          }
        ]
      });
    }
  }
  
  analyzeSeasonalPatterns() {
    if (this.data.statistics.seasonality.detected) {
      const pattern = this.data.statistics.seasonality.pattern;
      const peakPeriod = this.data.statistics.seasonality.peakPeriod;
      
      this.insights.push({
        type: 'opportunity',
        category: 'seasonal_planning',
        priority: 'medium',
        title: `${pattern} seasonality detected with peak in ${peakPeriod}`,
        description: 'Predictable pattern enables proactive capacity planning',
        rootCause: 'Recurring business cycles in your industry',
        confidence: this.data.statistics.seasonality.strength * 100,
        recommendations: [
          {
            action: `Prepare additional capacity before ${peakPeriod}`,
            expectedImpact: 'Capture full peak demand without capacity constraints',
            effort: 'medium',
            timeframe: '4-6 weeks before peak'
          },
          {
            action: 'Optimize inventory and resource planning based on seasonal forecast',
            expectedImpact: 'Reduce costs during low seasons, maximize revenue during peaks',
            effort: 'medium',
            timeframe: 'Ongoing'
          }
        ]
      });
    }
  }
  
  prioritizeInsights() {
    // Sort by priority and confidence
    const priorityWeights = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return this.insights.sort((a, b) => {
      const aPriority = priorityWeights[a.priority] * a.confidence;
      const bPriority = priorityWeights[b.priority] * b.confidence;
      return bPriority - aPriority;
    });
  }
  
  // Helper methods
  percentChange(current, previous) {
    return ((current - previous) / previous * 100).toFixed(1);
  }
  
  formatCurrency(amount) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  
  calculateCoefficientOfVariation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean;
  }
  
  analyzeRevenueDropCause() {
    // Analyze which dimension caused the drop
    const causes = [];
    
    if (this.data.lostCustomers > 0) {
      causes.push(`${this.data.lostCustomers} customers became inactive`);
    }
    
    if (this.data.avgOrderValue < this.data.previousAvgOrderValue * 0.9) {
      causes.push('Average order value decreased');
    }
    
    if (this.data.orderCount < this.data.previousOrderCount * 0.9) {
      causes.push('Order volume decreased');
    }
    
    return causes.length > 0 ? causes.join('; ') : 'Multiple contributing factors';
  }
  
  analyzeMarginCompression() {
    const causes = [];
    
    if (this.data.avgCostPerOrder > this.data.previousAvgCostPerOrder * 1.1) {
      causes.push('Transportation costs increased');
    }
    
    if (this.data.expenseRatio > this.data.previousExpenseRatio * 1.1) {
      causes.push('Operating expenses increased');
    }
    
    if (this.data.avgRevenuePerOrder < this.data.previousAvgRevenuePerOrder * 0.95) {
      causes.push('Pricing pressure or product mix shift');
    }
    
    return causes.join('; ') || 'Cost increases outpacing revenue growth';
  }
  
  identifyExpenseDrivers() {
    // Find which expense categories are high
    const highCategories = Object.entries(this.data.expensesByCategory)
      .filter(([cat, amount]) => amount / this.data.totalExpenses > 0.25)
      .map(([cat]) => cat);
    
    return highCategories.length > 0
      ? `High expenses in: ${highCategories.join(', ')}`
      : 'Expenses elevated across multiple categories';
  }
  
  analyzeDocumentBottleneck() {
    if (this.data.lrCompletionRate < this.data.invoiceCompletionRate) {
      return 'LR completion lagging - likely field/driver issue';
    } else if (this.data.invoiceCompletionRate < this.data.lrCompletionRate) {
      return 'Invoice generation lagging - likely back-office issue';
    } else {
      return 'General process compliance issue';
    }
  }
}

export default InsightEngine;
```

---

### 6.2.2 Dashboard Insights Component

**File:** `src/components/dashboard/AIInsightsPanel.js`

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
  Collapse,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Lightbulb,
  Warning,
  TrendingUp,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle
} from '@mui/icons-material';
import { fetchAIInsights, dismissInsight } from 'slices/dashboardSlice';

const AIInsightsPanel = () => {
  const dispatch = useDispatch();
  const { aiInsights, loading } = useSelector((state) => state.dashboard);
  const [expandedInsight, setExpandedInsight] = useState(null);
  
  useEffect(() => {
    dispatch(fetchAIInsights());
  }, [dispatch]);
  
  if (!aiInsights.data || aiInsights.data.insights.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6">All Clear!</Typography>
            <Typography variant="body2" color="text.secondary">
              No critical insights at the moment. Keep up the good work!
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  const { insights, insightCategories } = aiInsights.data;
  
  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'default'
    };
    return colors[priority] || 'default';
  };
  
  const getPriorityIcon = (priority) => {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: 'ℹ️',
      low: '💡'
    };
    return icons[priority] || '💡';
  };
  
  const getTypeColor = (type) => {
    const colors = {
      financial: 'success',
      operational: 'primary',
      customer: 'info',
      risk: 'error',
      opportunity: 'warning'
    };
    return colors[type] || 'default';
  };
  
  const handleDismiss = (insightId) => {
    dispatch(dismissInsight(insightId));
  };
  
  return (
    <Box>
      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          label={`${insightCategories.financial} Financial`}
          color="success"
          size="small"
        />
        <Chip
          label={`${insightCategories.operational} Operational`}
          color="primary"
          size="small"
        />
        <Chip
          label={`${insightCategories.customer} Customer`}
          color="info"
          size="small"
        />
        <Chip
          label={`${insightCategories.risk} Risk`}
          color="error"
          size="small"
        />
        <Chip
          label={`${insightCategories.opportunity} Opportunity`}
          color="warning"
          size="small"
        />
      </Box>
      
      {/* Insights list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {insights.slice(0, 10).map((insight) => (
          <Card
            key={insight.id}
            sx={{
              border: insight.priority === 'critical' ? 2 : 1,
              borderColor: insight.priority === 'critical' ? 'error.main' : 'divider'
            }}
          >
            <CardContent>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6">
                      {getPriorityIcon(insight.priority)} {insight.title}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Chip
                      label={insight.type}
                      color={getTypeColor(insight.type)}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                    <Chip
                      label={insight.priority}
                      color={getPriorityColor(insight.priority)}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                    <Chip
                      label={`${insight.confidence}% confidence`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    {insight.description}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => setExpandedInsight(
                      expandedInsight === insight.id ? null : insight.id
                    )}
                  >
                    <ExpandMoreIcon
                      sx={{
                        transform: expandedInsight === insight.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s'
                      }}
                    />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDismiss(insight.id)}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Box>
              
              {/* Metrics (if available) */}
              {insight.metrics && (
                <Box sx={{ 
                  display: 'flex', 
                  gap: 3, 
                  p: 2, 
                  backgroundColor: 'background.default',
                  borderRadius: 1,
                  mb: 2
                }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Current</Typography>
                    <Typography variant="h6">{insight.metrics.current}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Previous</Typography>
                    <Typography variant="h6">{insight.metrics.previous}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Change</Typography>
                    <Typography 
                      variant="h6"
                      color={insight.metrics.changePercent >= 0 ? 'success.main' : 'error.main'}
                    >
                      {insight.metrics.changePercent >= 0 ? '+' : ''}{insight.metrics.changePercent}%
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Expandable details */}
              <Collapse in={expandedInsight === insight.id}>
                <Divider sx={{ my: 2 }} />
                
                {/* Root cause */}
                {insight.rootCause && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Root Cause Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {insight.rootCause}
                    </Typography>
                  </Box>
                )}
                
                {/* Affected entities */}
                {insight.affectedEntities && insight.affectedEntities.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Affected Entities ({insight.affectedEntities.length})
                    </Typography>
                    <List dense>
                      {insight.affectedEntities.slice(0, 5).map((entity, i) => (
                        <ListItem key={i}>
                          <ListItemText
                            primary={entity.name}
                            secondary={entity.impact}
                          />
                        </ListItem>
                      ))}
                      {insight.affectedEntities.length > 5 && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          ... and {insight.affectedEntities.length - 5} more
                        </Typography>
                      )}
                    </List>
                  </Box>
                )}
                
                {/* Recommendations */}
                {insight.recommendations && insight.recommendations.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Recommended Actions
                    </Typography>
                    <List dense>
                      {insight.recommendations.map((rec, i) => (
                        <ListItem key={i} sx={{ alignItems: 'flex-start' }}>
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {i + 1}. {rec.action}
                              </Typography>
                              <Chip
                                label={`${rec.effort} effort`}
                                size="small"
                                color={rec.effort === 'low' ? 'success' : rec.effort === 'high' ? 'error' : 'warning'}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Expected Impact: {rec.expectedImpact}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Timeframe: {rec.timeframe}
                            </Typography>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Collapse>
            </CardContent>
          </Card>
        ))}
      </Box>
      
      {insights.length > 10 && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button variant="outlined">
            View All {insights.length} Insights
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AIInsightsPanel;
```

---

## 6.3 Recommendation System

### Purpose
Proactive recommendations for specific actions based on data patterns

### 6.3.1 Recommendation Types

**1. Pricing Recommendations**
- Suggest price increases for high-demand, high-margin routes
- Identify underpriced routes (market comparison)
- Volume discount opportunities for high-value customers

**2. Customer Retention Recommendations**
- Personalized offers for at-risk customers
- Upsell opportunities for champions
- Win-back campaigns for lost customers

**3. Operational Optimization Recommendations**
- Vehicle-route reassignments for better utilization
- Driver workload rebalancing
- Maintenance scheduling based on usage patterns

**4. Cost Reduction Recommendations**
- Transporter negotiation targets (high-cost outliers)
- Expense audit priorities (unusual patterns)
- Route consolidation opportunities

**5. Growth Recommendations**
- New customer targeting (lookalike modeling)
- Route expansion opportunities (market gaps)
- Service expansion (based on customer requests/patterns)

---

## 6.4 Predictive Analytics

### Purpose
Forecast future outcomes and enable proactive planning

### 6.4.1 Predictive Models

**Customer Lifetime Value (CLV) Prediction**
```javascript
// Simple CLV model
const predictCLV = (customer) => {
  const avgOrderValue = customer.totalRevenue / customer.orderCount;
  const purchaseFrequency = customer.orderCount / customer.customerAge; // orders per month
  const estimatedLifespan = 24; // months (can be ML-predicted)
  const churnProbability = calculateChurnProbability(customer);
  
  const clv = avgOrderValue * purchaseFrequency * estimatedLifespan * (1 - churnProbability);
  return clv;
};

const calculateChurnProbability = (customer) => {
  // Logistic regression or decision tree
  // For now, simple heuristic based on RFM
  const recencyScore = customer.recency <= 30 ? 0 : customer.recency <= 60 ? 0.2 : 0.5;
  const frequencyScore = customer.frequency >= 10 ? 0 : customer.frequency >= 5 ? 0.2 : 0.4;
  
  return (recencyScore + frequencyScore) / 2;
};
```

**Demand Forecasting**
- Predict order volume for next 30/90 days
- Route-specific demand predictions
- Seasonal adjustments

**Vehicle Maintenance Prediction**
- Predict maintenance needs based on usage
- Estimate downtime risk
- Optimize maintenance scheduling

---

## 6.5 What-If Scenario Analysis

### Purpose
Allow users to model different business scenarios

### 6.5.1 Scenario Planning Tool

**Backend Endpoint:** `POST /api/analytics/scenario-analysis`

**Request Body:**
```javascript
{
  baselineStartDate: String,
  baselineEndDate: String,
  scenarios: [
    {
      name: String,                // "10% Price Increase"
      adjustments: {
        pricingChange: Number,     // +10
        volumeChange: Number,      // -5 (elasticity)
        costChange: Number,        // 0
        expenseChange: Number      // 0
      }
    }
  ]
}
```

**Response:**
```javascript
{
  baseline: {
    revenue: Number,
    profit: Number,
    margin: Number,
    orders: Number
  },
  
  scenarioResults: [
    {
      name: String,
      projectedRevenue: Number,
      projectedProfit: Number,
      projectedMargin: Number,
      projectedOrders: Number,
      
      changes: {
        revenueChange: Number,
        profitChange: Number,
        marginChange: Number,
        ordersChange: Number
      },
      
      recommendation: String
    }
  ]
}
```

**Use Cases:**
- "What if we increase prices by 10%?"
- "What if we lose our top customer?"
- "What if we add 5 more vehicles?"
- "What if we reduce expenses by 15%?"

---

## Redux Integration

### State Structure

```javascript
{
  masterScores: {
    data: { scoreSummary: {}, customerScores: [], transporterScores: [], criticalItems: [] },
    loading: false,
    error: null
  },
  
  aiInsights: {
    data: { insights: [], insightCategories: {} },
    loading: false,
    error: null
  },
  
  recommendations: {
    data: { pricing: [], retention: [], operational: [], growth: [] },
    loading: false,
    error: null
  },
  
  predictions: {
    data: { clv: [], demand: [], maintenance: [] },
    loading: false,
    error: null
  },
  
  scenarioAnalysis: {
    data: null,
    loading: false,
    error: null
  }
}
```

### Thunks

```javascript
export const fetchMasterScores = createAsyncThunk(/*...*/);
export const fetchAIInsights = createAsyncThunk(/*...*/);
export const dismissInsight = createAsyncThunk(/*...*/);
export const fetchRecommendations = createAsyncThunk(/*...*/);
export const fetchPredictions = createAsyncThunk(/*...*/);
export const runScenarioAnalysis = createAsyncThunk(/*...*/);
```

---

## Testing Requirements

### Unit Tests
- [ ] Insight generation logic accuracy
- [ ] Scoring algorithms consistency
- [ ] Recommendation relevance
- [ ] CLV prediction calculation
- [ ] Scenario analysis math

### Integration Tests
- [ ] AI insights API with real data
- [ ] Master scores API
- [ ] Recommendation generation
- [ ] Predictive models accuracy
- [ ] Scenario analysis API

### Validation Tests
- [ ] Insight confidence scores realistic
- [ ] Recommendations actionable and specific
- [ ] Predictions align with historical patterns
- [ ] No contradictory recommendations
- [ ] Scenario results mathematically correct

---

## Deployment Checklist - Phase 6

### Backend
- [ ] Create `/api/analytics/master-scores` endpoint
- [ ] Create `/api/analytics/ai-insights` endpoint
- [ ] Create `/api/analytics/recommendations` endpoint
- [ ] Create `/api/analytics/predictions` endpoint
- [ ] Create `/api/analytics/scenario-analysis` endpoint
- [ ] Implement InsightEngine class
- [ ] Implement recommendation algorithms
- [ ] Implement predictive models
- [ ] Add insight dismissal tracking
- [ ] Test all scoring algorithms

### Frontend
- [ ] Build `AIInsightsPanel` component
- [ ] Build `MasterScoresDashboard` component
- [ ] Build `RecommendationsPanel` component
- [ ] Build `PredictiveAnalyticsDashboard` component
- [ ] Build `ScenarioAnalysisTool` component
- [ ] Add insight expand/collapse functionality
- [ ] Implement insight dismissal
- [ ] Add visualization for predictions
- [ ] Test all interactive features

### Machine Learning (Future)
- [ ] Implement proper ML models for CLV
- [ ] Add churn prediction model (logistic regression)
- [ ] Implement demand forecasting (ARIMA/Prophet)
- [ ] Build recommendation engine (collaborative filtering)
- [ ] Add A/B testing framework for recommendations
- [ ] Implement model retraining pipeline

### Integration
- [ ] Connect insights to Redux
- [ ] Implement real-time insight updates
- [ ] Add notification system for critical insights
- [ ] Test insight generation performance
- [ ] Validate recommendation quality
- [ ] User testing for actionability

---

## Advanced Features (Post Phase 6)

### 1. Natural Language Insights
**When:** After basic insights proven valuable

- Convert insights to conversational language
- Voice-enabled dashboard queries
- Chat interface for analytics questions
- Automated insight emails/reports

### 2. Prescriptive Analytics
**When:** After predictive models validated

- Not just "what will happen" but "what should we do"
- Optimization algorithms for decision support
- Automated action execution (with approval)
- Closed-loop learning from action outcomes

### 3. Benchmark Against Industry
**When:** Access to industry data available

- Compare your metrics to industry averages
- Identify competitive advantages/gaps
- Best practice recommendations
- Market positioning analysis

### 4. Causal Analysis
**When:** Sufficient historical data accumulated

- Understand cause-effect relationships
- Impact analysis (what caused this change?)
- Attribution modeling (which action drove results?)
- Counterfactual analysis (what if we hadn't...?)

---

## End of Phase 6 Documentation

**Status:** ✅ Complete and ready for review

**Next Phase:** Phase 7 - Comparative & Predictive Analytics (Multi-org comparison, Advanced ML)

**Estimated Implementation Time:**
- Master scores consolidation: 4-6 hours
- Insight generation engine: 12-16 hours
- AI insights component: 8-10 hours
- Recommendation system: 10-12 hours
- Predictive models (basic): 8-10 hours
- Scenario analysis tool: 6-8 hours
- Testing & validation: 10-12 hours
- **Total: 58-74 hours (7-9 working days)**

**Key Success Metrics:**
- Generate 10-15 actionable insights per week
- 80%+ of insights lead to action
- Recommendation acceptance rate >60%
- Predictive accuracy (MAPE) <20%
- Reduce time-to-insight by 90% vs manual analysis