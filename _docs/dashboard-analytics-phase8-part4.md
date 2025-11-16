# Phase 8: Executive Summary & Automated Reporting (Part 4 of 4)

## 8.4 Frontend Components & Final Integration

### Purpose
Complete the executive intelligence layer with React components, alert system, and Redux integration

---

### 8.4.1 Executive Dashboard Component

```javascript
// /src/components/dashboard/ExecutiveDashboard.js

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Button,
  LinearProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  ShoppingCart,
  People,
  LocalShipping,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  MoreVert,
  Download,
  Email
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExecutiveSummary } from '../../slices/analyticsSlice';
import { Chart } from '../chart';

export default function ExecutiveDashboard({ account, organisation }) {
  const dispatch = useDispatch();
  const { executiveSummary, loading, error } = useSelector(state => state.analytics);
  const [period, setPeriod] = useState('mtd');
  const [compareWith, setCompareWith] = useState('previous_period');
  const [anchorEl, setAnchorEl] = useState(null);
  
  useEffect(() => {
    if (account && organisation) {
      dispatch(fetchExecutiveSummary({
        account,
        organisation,
        period,
        compareWith
      }));
    }
  }, [dispatch, account, organisation, period, compareWith]);
  
  const handleRefresh = () => {
    dispatch(fetchExecutiveSummary({
      account,
      organisation,
      period,
      compareWith
    }));
  };
  
  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }
  
  if (!executiveSummary) {
    return null;
  }
  
  const { overview, financialHealth, operationalHealth, customerHealth, criticalAlerts, topInsights, quickActions } = executiveSummary;
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Executive Dashboard
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
            size="small"
          >
            <ToggleButton value="today">Today</ToggleButton>
            <ToggleButton value="wtd">WTD</ToggleButton>
            <ToggleButton value="mtd">MTD</ToggleButton>
            <ToggleButton value="qtd">QTD</ToggleButton>
            <ToggleButton value="ytd">YTD</ToggleButton>
          </ToggleButtonGroup>
          
          <IconButton onClick={handleRefresh} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>
      
      {/* Critical Alerts Banner */}
      {criticalAlerts && criticalAlerts.length > 0 && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small">
              View All
            </Button>
          }
        >
          <Typography variant="subtitle2" fontWeight="bold">
            {criticalAlerts.filter(a => a.severity === 'critical').length} Critical Alerts Require Attention
          </Typography>
        </Alert>
      )}
      
      {/* KPI Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Revenue"
            value={`₹${(overview.revenue.current / 100000).toFixed(2)}L`}
            change={overview.revenue.change}
            trend={overview.revenue.trend}
            icon={<AttachMoney />}
            color="#1976d2"
            target={overview.revenue.target}
            achievement={overview.revenue.achievementPercentage}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Profit"
            value={`₹${(overview.profit.current / 100000).toFixed(2)}L`}
            change={overview.profit.change}
            trend={overview.profit.trend}
            icon={<TrendingUp />}
            color="#2e7d32"
            target={overview.profit.target}
            achievement={overview.profit.achievementPercentage}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Orders"
            value={overview.orders.current}
            change={overview.orders.change}
            trend={overview.orders.trend}
            icon={<ShoppingCart />}
            color="#ed6c02"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Customers"
            value={overview.customers.current}
            change={overview.customers.change}
            trend={overview.customers.trend}
            icon={<People />}
            color="#9c27b0"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Fleet"
            value={overview.fleet.current}
            change={overview.fleet.change}
            trend={overview.fleet.trend}
            icon={<LocalShipping />}
            color="#0288d1"
          />
        </Grid>
      </Grid>
      
      {/* Health Scores */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <HealthScoreCard
            title="Financial Health"
            score={financialHealth.score}
            status={financialHealth.status}
            indicators={financialHealth.indicators}
            color="#1976d2"
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <HealthScoreCard
            title="Operational Health"
            score={operationalHealth.score}
            status={operationalHealth.status}
            indicators={operationalHealth.indicators}
            color="#2e7d32"
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <HealthScoreCard
            title="Customer Health"
            score={customerHealth.score}
            status={customerHealth.status}
            indicators={customerHealth.indicators}
            color="#9c27b0"
          />
        </Grid>
      </Grid>
      
      {/* Insights and Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Top Insights
              </Typography>
              {topInsights && topInsights.map((insight, index) => (
                <InsightItem key={index} insight={insight} />
              ))}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Quick Actions
              </Typography>
              {quickActions && quickActions.map((action, index) => (
                <ActionItem key={index} action={action} />
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// KPI Card Component
function KPICard({ title, value, change, trend, icon, color, target, achievement }) {
  const isPositive = change >= 0;
  
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Avatar sx={{ bgcolor: color, width: 32, height: 32 }}>
            {icon}
          </Avatar>
        </Box>
        
        <Typography variant="h5" fontWeight="bold" mb={1}>
          {value}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            size="small"
            label={`${isPositive ? '+' : ''}${change.toFixed(1)}%`}
            color={isPositive ? 'success' : 'error'}
            icon={isPositive ? <TrendingUp /> : <TrendingDown />}
          />
          {trend && (
            <Typography variant="caption" color="text.secondary">
              {trend}
            </Typography>
          )}
        </Box>
        
        {target && (
          <Box mt={2}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Target
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {achievement.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(achievement, 100)} 
              sx={{ 
                height: 6, 
                borderRadius: 3,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: achievement >= 100 ? 'success.main' : 'primary.main'
                }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Health Score Card Component
function HealthScoreCard({ title, score, status, indicators, color }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };
  
  const getScoreColor = (score) => {
    if (score >= 80) return '#2e7d32';
    if (score >= 60) return '#ed6c02';
    return '#d32f2f';
  };
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {title}
        </Typography>
        
        <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
          <Box position="relative" display="inline-flex">
            <CircularProgress
              variant="determinate"
              value={score}
              size={120}
              thickness={4}
              sx={{ color: getScoreColor(score) }}
            />
            <Box
              position="absolute"
              top={0}
              left={0}
              bottom={0}
              right={0}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
            >
              <Typography variant="h4" fontWeight="bold">
                {score}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                out of 100
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box display="flex" justifyContent="center" mb={2}>
          <Chip
            label={status.toUpperCase()}
            color={getStatusColor(status)}
            size="small"
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {indicators && indicators.map((indicator, index) => (
          <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
            <Typography variant="body2" color="text.secondary">
              {indicator.label}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {indicator.value}
            </Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

// Insight Item Component
function InsightItem({ insight }) {
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };
  
  return (
    <Box mb={2} p={2} sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
      <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
        <Chip
          label={insight.category}
          size="small"
          variant="outlined"
        />
        <Chip
          label={insight.impact}
          size="small"
          color={getImpactColor(insight.impact)}
        />
      </Box>
      <Typography variant="body2" fontWeight="bold" mb={0.5}>
        {insight.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {insight.message}
      </Typography>
    </Box>
  );
}

// Action Item Component
function ActionItem({ action }) {
  return (
    <Box 
      mb={2} 
      p={2} 
      sx={{ 
        bgcolor: 'grey.50', 
        borderRadius: 1,
        borderLeft: 3,
        borderColor: action.priority === 'high' ? 'error.main' : 
                     action.priority === 'medium' ? 'warning.main' : 'info.main'
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Typography variant="body2" fontWeight="bold">
          {action.action}
        </Typography>
        <Box display="flex" gap={0.5}>
          <Chip label={action.priority} size="small" />
          <Chip label={action.effort} size="small" variant="outlined" />
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Impact: {action.impact}
      </Typography>
    </Box>
  );
}
```

---

### 8.4.2 Report Builder UI Component

```javascript
// /src/components/dashboard/ReportBuilder.js

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Autocomplete,
  Switch,
  FormControlLabel,
  Divider,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add,
  Delete,
  Save,
  PlayArrow,
  Schedule,
  GetApp
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { 
  createReportTemplate, 
  listReportTemplates, 
  executeReport 
} from '../../slices/reportsSlice';

export default function ReportBuilder({ account, organisation }) {
  const dispatch = useDispatch();
  const [activeStep, setActiveStep] = useState(0);
  const [template, setTemplate] = useState({
    name: '',
    description: '',
    reportType: 'financial',
    configuration: {
      dateRange: {
        type: 'relative',
        relative: 'mtd'
      },
      filters: {
        organisations: [organisation],
        customers: [],
        routes: [],
        vehicles: []
      },
      metrics: [],
      groupBy: 'none',
      visualizations: [],
      sortBy: {
        field: 'totalRevenue',
        order: 'desc'
      },
      comparison: {
        enabled: false,
        compareWith: 'previous_period'
      }
    },
    schedule: {
      enabled: false,
      frequency: 'weekly',
      dayOfWeek: 1,
      time: '09:00',
      timezone: 'Asia/Kolkata',
      recipients: [],
      format: 'pdf'
    }
  });
  
  const steps = ['Basic Info', 'Filters & Metrics', 'Visualization', 'Schedule'];
  
  const reportTypes = [
    { value: 'financial', label: 'Financial Report' },
    { value: 'operational', label: 'Operational Report' },
    { value: 'customer', label: 'Customer Report' },
    { value: 'route', label: 'Route Performance' },
    { value: 'fleet', label: 'Fleet Performance' },
    { value: 'custom', label: 'Custom Report' }
  ];
  
  const metricOptions = {
    financial: [
      { category: 'revenue', metric: 'totalRevenue', displayName: 'Total Revenue', format: 'currency' },
      { category: 'profit', metric: 'totalProfit', displayName: 'Total Profit', format: 'currency' },
      { category: 'margin', metric: 'profitMargin', displayName: 'Profit Margin', format: 'percentage' },
      { category: 'orders', metric: 'orderCount', displayName: 'Order Count', format: 'number' }
    ],
    operational: [
      { category: 'orders', metric: 'orderCount', displayName: 'Total Orders', format: 'number' },
      { category: 'fleet', metric: 'vehicleCount', displayName: 'Vehicle Count', format: 'number' },
      { category: 'customers', metric: 'customerCount', displayName: 'Customer Count', format: 'number' },
      { category: 'compliance', metric: 'documentCompletion', displayName: 'Document Completion', format: 'percentage' }
    ],
    customer: [
      { category: 'revenue', metric: 'totalRevenue', displayName: 'Revenue', format: 'currency' },
      { category: 'orders', metric: 'orderCount', displayName: 'Orders', format: 'number' },
      { category: 'value', metric: 'avgOrderValue', displayName: 'Avg Order Value', format: 'currency' }
    ]
  };
  
  const groupByOptions = [
    { value: 'none', label: 'No Grouping' },
    { value: 'day', label: 'By Day' },
    { value: 'week', label: 'By Week' },
    { value: 'month', label: 'By Month' },
    { value: 'quarter', label: 'By Quarter' },
    { value: 'customer', label: 'By Customer' },
    { value: 'route', label: 'By Route' },
    { value: 'vehicle', label: 'By Vehicle' },
    { value: 'organisation', label: 'By Organisation' }
  ];
  
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleSave = async () => {
    await dispatch(createReportTemplate({
      account,
      ...template
    }));
  };
  
  const handleExecute = async () => {
    // Execute report immediately
    await dispatch(executeReport({
      templateId: template._id,
      dateRangeOverride: null
    }));
  };
  
  const addMetric = (metric) => {
    setTemplate(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        metrics: [...prev.configuration.metrics, metric]
      }
    }));
  };
  
  const removeMetric = (index) => {
    setTemplate(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        metrics: prev.configuration.metrics.filter((_, i) => i !== index)
      }
    }));
  };
  
  const addRecipient = (email) => {
    setTemplate(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        recipients: [...prev.schedule.recipients, { email, name: email }]
      }
    }));
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Report Builder
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Card>
        <CardContent>
          {/* Step 1: Basic Info */}
          {activeStep === 0 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Report Name"
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={template.description}
                    onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Report Type</InputLabel>
                    <Select
                      value={template.reportType}
                      onChange={(e) => setTemplate({ ...template, reportType: e.target.value })}
                    >
                      {reportTypes.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Date Range</InputLabel>
                    <Select
                      value={template.configuration.dateRange.relative}
                      onChange={(e) => setTemplate({
                        ...template,
                        configuration: {
                          ...template.configuration,
                          dateRange: {
                            type: 'relative',
                            relative: e.target.value
                          }
                        }
                      })}
                    >
                      <MenuItem value="today">Today</MenuItem>
                      <MenuItem value="yesterday">Yesterday</MenuItem>
                      <MenuItem value="last7days">Last 7 Days</MenuItem>
                      <MenuItem value="last30days">Last 30 Days</MenuItem>
                      <MenuItem value="mtd">Month to Date</MenuItem>
                      <MenuItem value="lastMonth">Last Month</MenuItem>
                      <MenuItem value="qtd">Quarter to Date</MenuItem>
                      <MenuItem value="ytd">Year to Date</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Step 2: Filters & Metrics */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" mb={2}>
                Select Metrics
              </Typography>
              
              <Grid container spacing={2} mb={3}>
                {metricOptions[template.reportType]?.map((metric, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        border: template.configuration.metrics.some(m => m.metric === metric.metric) ? 2 : 0,
                        borderColor: 'primary.main'
                      }}
                      onClick={() => {
                        const exists = template.configuration.metrics.some(m => m.metric === metric.metric);
                        if (exists) {
                          const index = template.configuration.metrics.findIndex(m => m.metric === metric.metric);
                          removeMetric(index);
                        } else {
                          addMetric(metric);
                        }
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        {metric.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {metric.category} • {metric.format}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" mb={2}>
                Selected Metrics
              </Typography>
              
              <List>
                {template.configuration.metrics.map((metric, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => removeMetric(index)}>
                        <Delete />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={metric.displayName}
                      secondary={`${metric.category} • ${metric.format}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {/* Step 3: Visualization */}
          {activeStep === 2 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Group By</InputLabel>
                    <Select
                      value={template.configuration.groupBy}
                      onChange={(e) => setTemplate({
                        ...template,
                        configuration: {
                          ...template.configuration,
                          groupBy: e.target.value
                        }
                      })}
                    >
                      {groupByOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={template.configuration.sortBy.field}
                      onChange={(e) => setTemplate({
                        ...template,
                        configuration: {
                          ...template.configuration,
                          sortBy: {
                            ...template.configuration.sortBy,
                            field: e.target.value
                          }
                        }
                      })}
                    >
                      {template.configuration.metrics.map(metric => (
                        <MenuItem key={metric.metric} value={metric.metric}>
                          {metric.displayName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={template.configuration.comparison.enabled}
                        onChange={(e) => setTemplate({
                          ...template,
                          configuration: {
                            ...template.configuration,
                            comparison: {
                              ...template.configuration.comparison,
                              enabled: e.target.checked
                            }
                          }
                        })}
                      />
                    }
                    label="Enable Period Comparison"
                  />
                </Grid>
                
                {template.configuration.comparison.enabled && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Compare With</InputLabel>
                      <Select
                        value={template.configuration.comparison.compareWith}
                        onChange={(e) => setTemplate({
                          ...template,
                          configuration: {
                            ...template.configuration,
                            comparison: {
                              ...template.configuration.comparison,
                              compareWith: e.target.value
                            }
                          }
                        })}
                      >
                        <MenuItem value="previous_period">Previous Period</MenuItem>
                        <MenuItem value="previous_year">Previous Year</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
          
          {/* Step 4: Schedule */}
          {activeStep === 3 && (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={template.schedule.enabled}
                    onChange={(e) => setTemplate({
                      ...template,
                      schedule: {
                        ...template.schedule,
                        enabled: e.target.checked
                      }
                    })}
                  />
                }
                label="Enable Scheduled Delivery"
              />
              
              {template.schedule.enabled && (
                <Grid container spacing={3} mt={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Frequency</InputLabel>
                      <Select
                        value={template.schedule.frequency}
                        onChange={(e) => setTemplate({
                          ...template,
                          schedule: {
                            ...template.schedule,
                            frequency: e.target.value
                          }
                        })}
                      >
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="quarterly">Quarterly</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Format</InputLabel>
                      <Select
                        value={template.schedule.format}
                        onChange={(e) => setTemplate({
                          ...template,
                          schedule: {
                            ...template.schedule,
                            format: e.target.value
                          }
                        })}
                      >
                        <MenuItem value="pdf">PDF</MenuItem>
                        <MenuItem value="excel">Excel</MenuItem>
                        <MenuItem value="email">Email Only</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="time"
                      label="Time"
                      value={template.schedule.time}
                      onChange={(e) => setTemplate({
                        ...template,
                        schedule: {
                          ...template.schedule,
                          time: e.target.value
                        }
                      })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" mb={1}>
                      Recipients
                    </Typography>
                    {template.schedule.recipients.map((recipient, index) => (
                      <Chip
                        key={index}
                        label={recipient.email}
                        onDelete={() => {
                          setTemplate({
                            ...template,
                            schedule: {
                              ...template.schedule,
                              recipients: template.schedule.recipients.filter((_, i) => i !== index)
                            }
                          });
                        }}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                    <TextField
                      size="small"
                      placeholder="Add email"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value) {
                          addRecipient(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
          
          {/* Navigation Buttons */}
          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            
            <Box display="flex" gap={2}>
              {activeStep === steps.length - 1 ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<PlayArrow />}
                    onClick={handleExecute}
                  >
                    Run Now
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                  >
                    Save Template
                  </Button>
                </>
              ) : (
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
```

---

### 8.4.3 Alert Notification System

```javascript
// /src/components/dashboard/AlertCenter.js

import React, { useEffect, useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Badge,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import {
  Notifications,
  Close,
  Error as ErrorIcon,
  Warning,
  Info
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAlerts, markAlertAsRead } from '../../slices/alertsSlice';

export default function AlertCenter({ account, organisation }) {
  const dispatch = useDispatch();
  const { alerts, unreadCount } = useSelector(state => state.alerts);
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  useEffect(() => {
    if (account && organisation) {
      dispatch(fetchAlerts({ account, organisation }));
    }
  }, [dispatch, account, organisation]);
  
  const handleToggle = () => {
    setOpen(!open);
  };
  
  const handleMarkAsRead = (alertId) => {
    dispatch(markAlertAsRead(alertId));
  };
  
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <Warning color="warning" />;
      case 'medium':
        return <Info color="info" />;
      default:
        return <Info />;
    }
  };
  
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };
  
  const filteredAlerts = tabValue === 0 
    ? alerts 
    : alerts.filter(a => !a.read);
  
  return (
    <>
      <IconButton color="inherit" onClick={handleToggle}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>
      
      <Drawer
        anchor="right"
        open={open}
        onClose={handleToggle}
        PaperProps={{ sx: { width: 400 } }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Alerts & Notifications
            </Typography>
            <IconButton onClick={handleToggle}>
              <Close />
            </IconButton>
          </Box>
          
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="All" />
            <Tab label={`Unread (${unreadCount})`} />
          </Tabs>
          
          <List sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            {filteredAlerts.map((alert, index) => (
              <React.Fragment key={alert._id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    bgcolor: alert.read ? 'transparent' : 'action.hover',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getSeverityIcon(alert.severity)}
                        <Chip
                          label={alert.type}
                          size="small"
                          color={getSeverityColor(alert.severity)}
                        />
                      </Box>
                      {!alert.read && (
                        <Button
                          size="small"
                          onClick={() => handleMarkAsRead(alert._id)}
                        >
                          Mark Read
                        </Button>
                      )}
                    </Box>
                    
                    <Typography variant="subtitle2" fontWeight="bold" mb={0.5}>
                      {alert.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {alert.message}
                    </Typography>
                    
                    {alert.actionRequired && (
                      <Typography variant="caption" color="error" display="block" mb={1}>
                        Action Required: {alert.actionRequired}
                      </Typography>
                    )}
                    
                    <Typography variant="caption" color="text.secondary">
                      {new Date(alert.timestamp).toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                </ListItem>
                {index < filteredAlerts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            
            {filteredAlerts.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">
                  No alerts to display
                </Typography>
              </Box>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
```

---

### 8.4.4 Redux Integration

```javascript
// /src/slices/analyticsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchExecutiveSummary = createAsyncThunk(
  'analytics/fetchExecutiveSummary',
  async ({ account, organisation, period, compareWith }) => {
    const response = await fetch(
      `/api/analytics/executive-summary?account=${account}&organisation=${organisation}&period=${period}&compareWith=${compareWith}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch executive summary');
    }
    return response.json();
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    executiveSummary: null,
    loading: false,
    error: null
  },
  reducers: {
    clearExecutiveSummary: (state) => {
      state.executiveSummary = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExecutiveSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExecutiveSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.executiveSummary = action.payload;
      })
      .addCase(fetchExecutiveSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { clearExecutiveSummary } = analyticsSlice.actions;
export default analyticsSlice.reducer;
```

```javascript
// /src/slices/reportsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const createReportTemplate = createAsyncThunk(
  'reports/createTemplate',
  async (templateData) => {
    const response = await fetch('/api/reports/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateData)
    });
    if (!response.ok) {
      throw new Error('Failed to create report template');
    }
    return response.json();
  }
);

export const listReportTemplates = createAsyncThunk(
  'reports/listTemplates',
  async ({ account, reportType }) => {
    const url = `/api/reports/templates?account=${account}${reportType ? `&reportType=${reportType}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch report templates');
    }
    return response.json();
  }
);

export const executeReport = createAsyncThunk(
  'reports/execute',
  async ({ templateId, dateRangeOverride }) => {
    const response = await fetch('/api/reports/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, dateRangeOverride })
    });
    if (!response.ok) {
      throw new Error('Failed to execute report');
    }
    return response.json();
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    templates: [],
    currentReport: null,
    loading: false,
    error: null
  },
  reducers: {
    clearCurrentReport: (state) => {
      state.currentReport = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createReportTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReportTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.templates.push(action.payload);
      })
      .addCase(createReportTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(listReportTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(executeReport.fulfilled, (state, action) => {
        state.currentReport = action.payload;
      });
  }
});

export const { clearCurrentReport } = reportsSlice.actions;
export default reportsSlice.reducer;
```

```javascript
// /src/slices/alertsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchAlerts = createAsyncThunk(
  'alerts/fetch',
  async ({ account, organisation }) => {
    // In a real implementation, this would fetch from the executive summary
    // and store alerts in a separate collection
    const response = await fetch(
      `/api/analytics/executive-summary?account=${account}&organisation=${organisation}&period=mtd`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch alerts');
    }
    const data = await response.json();
    return data.criticalAlerts || [];
  }
);

export const markAlertAsRead = createAsyncThunk(
  'alerts/markAsRead',
  async (alertId) => {
    // In a real implementation, this would update the alert status in the database
    return alertId;
  }
);

const alertsSlice = createSlice({
  name: 'alerts',
  initialState: {
    alerts: [],
    unreadCount: 0,
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.alerts = action.payload.map(alert => ({
          ...alert,
          _id: alert.title + alert.message, // Temporary ID
          read: false,
          timestamp: new Date()
        }));
        state.unreadCount = state.alerts.length;
      })
      .addCase(markAlertAsRead.fulfilled, (state, action) => {
        const alert = state.alerts.find(a => a._id === action.payload);
        if (alert) {
          alert.read = true;
          state.unreadCount = state.alerts.filter(a => !a.read).length;
        }
      });
  }
});

export default alertsSlice.reducer;
```

---

### 8.4.5 Store Configuration Update

```javascript
// Add to /src/store/index.js

import analyticsReducer from '../slices/analyticsSlice';
import reportsReducer from '../slices/reportsSlice';
import alertsReducer from '../slices/alertsSlice';

const store = configureStore({
  reducer: {
    // ... existing reducers
    analytics: analyticsReducer,
    reports: reportsReducer,
    alerts: alertsReducer
  }
});
```

---

### 8.4.6 Cron Job Setup

```javascript
// /scripts/scheduledReports.js

import cron from 'node-cron';
import { runScheduledReports } from '../lib/reportScheduler';

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Running scheduled reports check...');
  try {
    const result = await runScheduledReports();
    console.log(`Processed ${result.processed} reports`);
  } catch (error) {
    console.error('Scheduled reports error:', error);
  }
});

console.log('Scheduled reports cron job started');
```

---

## 8.4.7 Testing Requirements

### Unit Tests
1. Executive Summary API
   - Health score calculations
   - Alert generation logic
   - Period calculations
   - Comparison logic

2. Report Generation
   - PDF generation with various report types
   - Excel generation with formatting
   - Email template rendering

3. Report Scheduler
   - Next run calculation for all frequencies
   - Due report detection
   - Error handling and retry logic

### Integration Tests
1. End-to-end report creation and execution
2. Scheduled report delivery
3. Alert notification flow
4. Multi-tenant data isolation

---

## 8.4.8 Deployment Checklist

### Environment Variables
```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
SMTP_FROM=reports@truckar.com

# Scheduler
ENABLE_SCHEDULED_REPORTS=true
REPORT_SCHEDULER_INTERVAL=15 # minutes
```

### Dependencies
```json
{
  "dependencies": {
    "pdfkit": "^0.13.0",
    "exceljs": "^4.3.0",
    "nodemailer": "^6.9.0",
    "node-cron": "^3.0.2"
  }
}
```

### Database Indexes
```javascript
// ReportTemplate indexes
db.reporttemplates.createIndex({ account: 1, createdBy: 1 });
db.reporttemplates.createIndex({ account: 1, reportType: 1 });
db.reporttemplates.createIndex({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });
```

### Cron Job Setup (Production)
```bash
# Add to PM2 ecosystem.config.js
{
  name: 'scheduled-reports',
  script: './scripts/scheduledReports.js',
  instances: 1,
  exec_mode: 'fork',
  cron_restart: '0 * * * *'
}
```

---

## End of Phase 8 (Complete)

**Phase 8 Summary:**

**Part 1:** Executive Summary API
- Multi-dimensional health scoring
- KPI tracking with targets
- Critical alert generation
- Predictive insights

**Part 2:** Custom Report Builder
- Flexible report templates
- 6 report type implementations
- Dynamic metric selection
- Scheduling configuration

**Part 3:** Automated Delivery
- PDF generation (pdfkit)
- Excel export (ExcelJS)
- Email service (nodemailer)
- Cron-based scheduler

**Part 4:** Frontend & Integration
- Executive Dashboard component
- Report Builder UI
- Alert notification system
- Complete Redux integration
- Testing requirements
- Deployment guide

**Total Lines:** Part 1 (1450) + Part 2 (1470) + Part 3 (1460) + Part 4 (1480) = **5,860 lines**

---

## Next Steps

1. **Implementation Priority:**
   - Phase 1: Foundation & Multi-org selector
   - Phase 2: Customer analytics
   - Phase 3: Route analytics
   - Phase 4: Time-series & forecasting
   - Phase 5: Fleet & operations
   - Phase 6: Scoring & recommendations
   - Phase 7: ML predictions & benchmarking
   - Phase 8: Executive intelligence & reporting

2. **Quick Wins (Implement First):**
   - Multi-org selector
   - Financial metric cards
   - Customer health scoring
   - Route profitability analysis
   - Basic time-series charts

3. **Advanced Features (Later):**
   - ML predictions
   - Multi-org comparison
   - Executive summary dashboard
   - Automated report scheduling

**All 8 Phases Documentation Complete!** 🎉
**Total: 21,580+ lines of comprehensive planning**