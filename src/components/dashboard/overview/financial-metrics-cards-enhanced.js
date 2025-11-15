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
    return `₹${(value / 100000).toFixed(2)}L`;
  };

  const formatNumber = (value) => {
    if (!value && value !== 0) return "0";
    return value.toLocaleString("en-IN");
  };

  const metrics = data || {
    totalSales: 0,
    totalProfit: 0,
    profitMargin: 0,
    activeOrders: 0,
    salesGrowth: 0,
    profitGrowth: 0,
    ordersGrowth: 0,
    previousTotalSales: 0,
    previousTotalProfit: 0,
    previousActiveOrders: 0,
    salesTrend: [],
    profitTrend: [],
    ordersTrend: [],
    salesTarget: null,
    profitTarget: null,
    ordersTarget: null,
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Sales"
          value={formatCurrency(metrics.totalSales)}
          change={metrics.salesGrowth}
          changeLabel="last period"
          previousValue={`${formatCurrency(metrics.previousTotalSales)}`}
          loading={loading}
          color="primary"
          sparklineData={metrics.salesTrend || []}
          target={metrics.salesTarget}
          targetLabel="Monthly Target"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Active Orders"
          value={formatNumber(metrics.activeOrders)}
          change={metrics.ordersGrowth}
          changeLabel="last period"
          previousValue={`${formatNumber(metrics.previousActiveOrders)}`}
          loading={loading}
          color="warning"
          sparklineData={metrics.ordersTrend || []}
          target={metrics.ordersTarget}
          targetLabel="Target"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Profit"
          value={formatCurrency(metrics.totalProfit)}
          change={metrics.profitGrowth}
          changeLabel="last period"
          previousValue={`${formatCurrency(metrics.previousTotalProfit)}`}
          loading={loading}
          color="success"
          sparklineData={metrics.profitTrend || []}
          target={metrics.profitTarget}
          targetLabel="Profit Target"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Profit Margin"
          value={`${metrics.profitMargin?.toFixed(1) || 0}%`}
          change={metrics.marginChange}
          changeLabel="last period"
          previousValue={metrics.previousProfitMargin ? `${metrics.previousProfitMargin.toFixed(1)}%` : null}
          loading={loading}
          color="info"
          sparklineData={metrics.marginTrend || []}
        />
      </Grid>
    </Grid>
  );
};

FinancialMetricsCardsEnhanced.propTypes = {
  data: PropTypes.shape({
    totalSales: PropTypes.number,
    totalProfit: PropTypes.number,
    profitMargin: PropTypes.number,
    activeOrders: PropTypes.number,
    salesGrowth: PropTypes.number,
    profitGrowth: PropTypes.number,
    ordersGrowth: PropTypes.number,
    marginChange: PropTypes.number,
    previousTotalSales: PropTypes.number,
    previousTotalProfit: PropTypes.number,
    previousActiveOrders: PropTypes.number,
    previousProfitMargin: PropTypes.number,
    salesTrend: PropTypes.arrayOf(PropTypes.number),
    profitTrend: PropTypes.arrayOf(PropTypes.number),
    ordersTrend: PropTypes.arrayOf(PropTypes.number),
    marginTrend: PropTypes.arrayOf(PropTypes.number),
    salesTarget: PropTypes.number,
    profitTarget: PropTypes.number,
    ordersTarget: PropTypes.number,
  }),
  loading: PropTypes.bool,
};
