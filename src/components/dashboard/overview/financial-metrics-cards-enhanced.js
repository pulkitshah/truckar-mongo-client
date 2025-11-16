import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Skeleton,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ChevronUp as TrendingUpIcon } from "../../../icons/chevron-up";
import { ChevronDown as TrendingDownIcon } from "../../../icons/chevron-down";
import PropTypes from "prop-types";
import { Chart } from "../../chart";

const MetricCard = ({
  title,
  value,
  change,
  changeLabel,
  previousValue,
  loading,
  icon: Icon,
  color = "primary",
  sparklineData = [],
  target,
  targetLabel,
}) => {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon;
  
  const targetProgress = target && value 
    ? (Number.parseFloat(value.replaceAll(/[^0-9.-]+/g, "")) / target) * 100 
    : null;

  const getSparklineColor = (colorName) => {
    if (colorName === "primary") return "#5048E5";
    if (colorName === "success") return "#14B8A6";
    if (colorName === "info") return "#3B82F6";
    return "#F59E0B";
  };

  const sparklineOptions = {
    chart: {
      type: "line",
      sparkline: {
        enabled: true,
      },
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    colors: [getSparklineColor(color)],
    tooltip: {
      enabled: false,
    },
    xaxis: {
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        show: false,
      },
    },
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" />
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Skeleton variant="text" width="40%" height={40} />
            <Skeleton variant="rectangular" width={80} height={40} />
          </Box>
          <Skeleton variant="text" width="50%" sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography color="textSecondary" variant="overline">
              {title}
            </Typography>
            <Box
              sx={{
                alignItems: "baseline",
                display: "flex",
                flexWrap: "wrap",
                mt: 0.5,
              }}
            >
              <Typography variant="h4">{value}</Typography>
              {change !== null && change !== undefined && (
                <Box
                  sx={{
                    alignItems: "center",
                    display: "flex",
                    ml: 1.5,
                    color: isPositive ? "success.main" : "error.main",
                  }}
                >
                  <TrendIcon fontSize="small" />
                  <Typography
                    color="inherit"
                    sx={{ ml: 0.25 }}
                    variant="body2"
                    fontWeight={600}
                  >
                    {Math.abs(change)}%
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          
          {sparklineData.length > 0 && (
            <Box sx={{ width: 100, height: 50, ml: 2 }}>
              <Chart
                options={sparklineOptions}
                series={[{ data: sparklineData }]}
                type="line"
                height={50}
              />
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {previousValue && (
            <Typography
              color="textSecondary"
              variant="caption"
              sx={{ display: "block" }}
            >
              {previousValue} {changeLabel}
            </Typography>
          )}
          
          {target && targetProgress !== null && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" color="textSecondary">
                  {targetLabel || "Target Progress"}
                </Typography>
                <Typography variant="caption" color="textSecondary" fontWeight={600}>
                  {targetProgress.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(targetProgress, 100)}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  bgcolor: (theme) => alpha(theme.palette[color].main, 0.1),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: `${color}.main`,
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  change: PropTypes.number,
  changeLabel: PropTypes.string,
  previousValue: PropTypes.string,
  loading: PropTypes.bool,
  icon: PropTypes.elementType,
  color: PropTypes.string,
  sparklineData: PropTypes.arrayOf(PropTypes.number),
  target: PropTypes.number,
  targetLabel: PropTypes.string,
};

export const FinancialMetricsCardsEnhanced = ({ data, loading }) => {
  const formatCurrency = (value) => {
    if (!value && value !== 0) return "₹0";
    // Use Lakhs format for amounts >= 100K
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const formatNumber = (value) => {
    if (!value && value !== 0) return "0";
    return value.toLocaleString("en-IN");
  };

  const formatPercent = (value) => {
    if (!value && value !== 0) return "0%";
    return `${value.toFixed(1)}%`;
  };

  const metrics = data || {
    totalSales: 0,
    totalProfit: 0,
    totalOrders: 0,
    profitMargin: 0,
    averageOrderValue: 0,
    expenseRatio: 0,
    salesGrowth: 0,
    profitGrowth: 0,
    ordersGrowth: 0,
    marginGrowth: 0,
    aovGrowth: 0,
    expenseRatioChange: 0,
    previousPeriod: {
      sales: 0,
      profit: 0,
      orders: 0,
      margin: 0,
      aov: 0,
      expenseRatio: 0,
    },
    trends: {
      sales: [],
      profit: [],
      orders: [],
      margin: [],
      aov: [],
      expenseRatio: [],
    },
    targets: {
      sales: null,
      profit: null,
      orders: null,
      profitMargin: null,
    },
  };

  return (
    <Grid container spacing={3}>
      {/* Sales Card */}
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard
          title="Total Sales"
          value={formatCurrency(metrics.totalSales)}
          change={metrics.salesGrowth}
          changeLabel="vs last period"
          previousValue={`${formatCurrency(metrics.previousPeriod.sales)}`}
          loading={loading}
          color="primary"
          sparklineData={metrics.trends.sales || []}
          target={metrics.targets.sales}
          targetLabel="Monthly Target"
        />
      </Grid>

      {/* Profit Card */}
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard
          title="Total Profit"
          value={formatCurrency(metrics.totalProfit)}
          change={metrics.profitGrowth}
          changeLabel="vs last period"
          previousValue={`${formatCurrency(metrics.previousPeriod.profit)}`}
          loading={loading}
          color="success"
          sparklineData={metrics.trends.profit || []}
          target={metrics.targets.profit}
          targetLabel="Profit Target"
        />
      </Grid>

      {/* Orders Card */}
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard
          title="Total Orders"
          value={formatNumber(metrics.totalOrders)}
          change={metrics.ordersGrowth}
          changeLabel="vs last period"
          previousValue={`${formatNumber(metrics.previousPeriod.orders)}`}
          loading={loading}
          color="warning"
          sparklineData={metrics.trends.orders || []}
          target={metrics.targets.orders}
          targetLabel="Orders Target"
        />
      </Grid>

      {/* Profit Margin Card */}
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard
          title="Profit Margin"
          value={formatPercent(metrics.profitMargin)}
          change={metrics.marginGrowth}
          changeLabel="vs last period"
          previousValue={`${formatPercent(metrics.previousPeriod.margin)}`}
          loading={loading}
          color="info"
          sparklineData={metrics.trends.margin || []}
          target={metrics.targets.profitMargin}
          targetLabel="Margin Target"
        />
      </Grid>

      {/* Average Order Value Card */}
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(metrics.averageOrderValue)}
          change={metrics.aovGrowth}
          changeLabel="vs last period"
          previousValue={`${formatCurrency(metrics.previousPeriod.aov)}`}
          loading={loading}
          color="secondary"
          sparklineData={metrics.trends.aov || []}
        />
      </Grid>

      {/* Expense Ratio Card */}
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard
          title="Expense Ratio"
          value={formatPercent(metrics.expenseRatio)}
          change={-metrics.expenseRatioChange} // Negative because lower is better
          changeLabel="vs last period"
          previousValue={`${formatPercent(metrics.previousPeriod.expenseRatio)}`}
          loading={loading}
          color="error"
          sparklineData={metrics.trends.expenseRatio || []}
        />
      </Grid>
    </Grid>
  );
};

FinancialMetricsCardsEnhanced.propTypes = {
  data: PropTypes.shape({
    totalSales: PropTypes.number,
    totalProfit: PropTypes.number,
    totalOrders: PropTypes.number,
    profitMargin: PropTypes.number,
    averageOrderValue: PropTypes.number,
    expenseRatio: PropTypes.number,
    salesGrowth: PropTypes.number,
    profitGrowth: PropTypes.number,
    ordersGrowth: PropTypes.number,
    marginGrowth: PropTypes.number,
    aovGrowth: PropTypes.number,
    expenseRatioChange: PropTypes.number,
    previousPeriod: PropTypes.shape({
      sales: PropTypes.number,
      profit: PropTypes.number,
      orders: PropTypes.number,
      margin: PropTypes.number,
      aov: PropTypes.number,
      expenseRatio: PropTypes.number,
    }),
    trends: PropTypes.shape({
      sales: PropTypes.arrayOf(PropTypes.number),
      profit: PropTypes.arrayOf(PropTypes.number),
      orders: PropTypes.arrayOf(PropTypes.number),
      margin: PropTypes.arrayOf(PropTypes.number),
      aov: PropTypes.arrayOf(PropTypes.number),
      expenseRatio: PropTypes.arrayOf(PropTypes.number),
    }),
    targets: PropTypes.shape({
      sales: PropTypes.number,
      profit: PropTypes.number,
      orders: PropTypes.number,
      profitMargin: PropTypes.number,
    }),
  }),
  loading: PropTypes.bool,
};
