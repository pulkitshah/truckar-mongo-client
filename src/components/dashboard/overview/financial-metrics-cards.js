import {
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ChevronUp as TrendingUpIcon } from "../../../icons/chevron-up";
import { ChevronDown as TrendingDownIcon } from "../../../icons/chevron-down";
import PropTypes from "prop-types";

const MetricCard = ({
  title,
  value,
  change,
  changeLabel,
  loading,
  icon: Icon,
  color = "primary",
}) => {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={40} sx={{ mt: 1 }} />
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
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography color="textSecondary" variant="overline">
              {title}
            </Typography>
            <Box
              sx={{
                alignItems: "center",
                display: "flex",
                flexWrap: "wrap",
                mt: 1,
              }}
            >
              <Typography variant="h4">{value}</Typography>
              {change !== null && change !== undefined && (
                <Box
                  sx={{
                    alignItems: "center",
                    display: "flex",
                    ml: 2,
                    color: isPositive ? "success.main" : "error.main",
                  }}
                >
                  <TrendIcon fontSize="small" />
                  <Typography
                    color="inherit"
                    sx={{ ml: 0.5 }}
                    variant="subtitle2"
                  >
                    {Math.abs(change)}%
                  </Typography>
                </Box>
              )}
            </Box>
            {changeLabel && (
              <Typography
                color="textSecondary"
                variant="caption"
                sx={{ mt: 1 }}
              >
                {changeLabel}
              </Typography>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                alignItems: "center",
                backgroundColor: (theme) =>
                  alpha(theme.palette[color].main, 0.08),
                borderRadius: 2,
                display: "flex",
                height: 56,
                justifyContent: "center",
                width: 56,
              }}
            >
              <Icon
                sx={{
                  color: `${color}.main`,
                  fontSize: 32,
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
  loading: PropTypes.bool,
  icon: PropTypes.elementType,
  color: PropTypes.string,
};

export const FinancialMetricsCards = ({ data, loading }) => {
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
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Sales"
          value={formatCurrency(metrics.totalSales)}
          change={metrics.salesGrowth}
          changeLabel="vs previous period"
          loading={loading}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Profit"
          value={formatCurrency(metrics.totalProfit)}
          change={metrics.profitGrowth}
          changeLabel="vs previous period"
          loading={loading}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Profit Margin"
          value={`${metrics.profitMargin?.toFixed(1) || 0}%`}
          change={null}
          loading={loading}
          color="info"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Active Orders"
          value={formatNumber(metrics.activeOrders)}
          change={metrics.ordersGrowth}
          changeLabel="vs previous period"
          loading={loading}
          color="warning"
        />
      </Grid>
    </Grid>
  );
};

FinancialMetricsCards.propTypes = {
  data: PropTypes.shape({
    totalSales: PropTypes.number,
    totalProfit: PropTypes.number,
    profitMargin: PropTypes.number,
    activeOrders: PropTypes.number,
    salesGrowth: PropTypes.number,
    profitGrowth: PropTypes.number,
    ordersGrowth: PropTypes.number,
  }),
  loading: PropTypes.bool,
};
