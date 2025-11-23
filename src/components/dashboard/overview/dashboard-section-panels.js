import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import { FinancialMetricsCardsEnhanced } from "./financial-metrics-cards-enhanced";
import { OperationalHealthDashboard } from "./operational-health-dashboard";
import { DashboardInsights } from "../dashboard-insights";
import { TopCustomersChart } from "./top-customers-chart";
import { RevenueChartEnhanced } from "./revenue-chart-enhanced";

export const OverviewPanel = ({
  metrics,
  metricsLoading,
  operationalHealth,
  operationalHealthLoading,
  insights,
  insightsLoading,
}) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <FinancialMetricsCardsEnhanced data={metrics} loading={metricsLoading} />
    </Grid>
    <Grid item xs={12}>
      <OperationalHealthDashboard
        data={operationalHealth}
        loading={operationalHealthLoading}
      />
    </Grid>
    <Grid item xs={12}>
      <DashboardInsights insights={insights} loading={insightsLoading} />
    </Grid>
  </Grid>
);

OverviewPanel.propTypes = {
  metrics: PropTypes.object,
  metricsLoading: PropTypes.bool,
  operationalHealth: PropTypes.object,
  operationalHealthLoading: PropTypes.bool,
  insights: PropTypes.array,
  insightsLoading: PropTypes.bool,
};

export const CustomersPanel = ({
  data,
  loading,
  period,
  startDate,
  endDate,
}) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <TopCustomersChart
        data={data}
        loading={loading}
        title="Top Customers by Profit"
        dataKey="profit"
        type="customer"
        period={period}
        startDate={startDate}
        endDate={endDate}
      />
    </Grid>
  </Grid>
);

CustomersPanel.propTypes = {
  data: PropTypes.array,
  loading: PropTypes.bool,
  period: PropTypes.string.isRequired,
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
};

export const TransportersPanel = ({
  data,
  loading,
  period,
  startDate,
  endDate,
}) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <TopCustomersChart
        data={data}
        loading={loading}
        title="Top Transporters by Profit"
        dataKey="profit"
        nameKey="transporterName"
        type="transporter"
        period={period}
        startDate={startDate}
        endDate={endDate}
      />
    </Grid>
  </Grid>
);

TransportersPanel.propTypes = {
  data: PropTypes.array,
  loading: PropTypes.bool,
  period: PropTypes.string.isRequired,
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
};

export const PerformancePanel = ({
  data,
  loading,
  period,
  groupBy,
  startDate,
  endDate,
}) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <RevenueChartEnhanced
        data={data}
        loading={loading}
        period={period}
        groupBy={groupBy}
        startDate={startDate}
        endDate={endDate}
      />
    </Grid>
  </Grid>
);

PerformancePanel.propTypes = {
  data: PropTypes.array,
  loading: PropTypes.bool,
  period: PropTypes.string.isRequired,
  groupBy: PropTypes.string.isRequired,
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
};
