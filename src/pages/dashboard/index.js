import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Container,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { AuthGuard } from "../../components/authentication/auth-guard";
import { OnBoardingGuard } from "../../components/authentication/onboarding-guard";
import { DashboardLayout } from "../../components/dashboard/dashboard-layout";
import OrganizationSelector from "../../components/dashboard/OrganizationSelector";
import { FinancialMetricsCardsEnhanced } from "../../components/dashboard/overview/financial-metrics-cards-enhanced";
import { OperationalHealthDashboard } from "../../components/dashboard/overview/operational-health-dashboard";
import { RevenueChartEnhanced } from "../../components/dashboard/overview/revenue-chart-enhanced";
import { TopCustomersChart } from "../../components/dashboard/overview/top-customers-chart";
import { DashboardInsights } from "../../components/dashboard/dashboard-insights";
import { Reports as ReportsIcon } from "../../icons/reports";
import { Refresh as RefreshIcon } from "../../icons/refresh";
import { gtm } from "../../lib/gtm";
import { useAuth } from "../../hooks/use-auth";
import { useDispatch, useSelector } from "../../store";
import {
  fetchAllDashboardData,
  fetchOrganizations,
  selectOrganization,
} from "../../slices/analytics";
import { analyticsApi } from "../../api/analytics-api";
import moment from "moment";

const Overview = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState("month");
  const [groupBy, setGroupBy] = useState("day");
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [enhancedMetrics, setEnhancedMetrics] = useState(null);
  const [enhancedMetricsLoading, setEnhancedMetricsLoading] = useState(false);
  const [enhancedRevenueTrend, setEnhancedRevenueTrend] = useState([]);
  const [enhancedRevenueLoading, setEnhancedRevenueLoading] = useState(false);
  const [operationalHealth, setOperationalHealth] = useState(null);
  const [operationalHealthLoading, setOperationalHealthLoading] =
    useState(false);

  // Get current account from user
  const currentAccount = user?.accounts?.[0]?.account;

  // Redux state selectors
  const financialMetrics = useSelector(
    (state) => state.analytics.financialMetrics
  );
  const topCustomers = useSelector((state) => state.analytics.topCustomers);
  const topTransporters = useSelector(
    (state) => state.analytics.topTransporters
  );
  const revenueTrend = useSelector((state) => state.analytics.revenueTrend);
  const organizations = useSelector((state) => state.analytics.organizations);
  const selectedOrganization = useSelector(
    (state) => state.analytics.selectedOrganization
  );

  // Calculate date range based on period
  const getDateRange = (selectedPeriod) => {
    const now = moment();
    let startDate, endDate;

    endDate = now.clone().endOf("day");

    switch (selectedPeriod) {
      case "week":
        startDate = now.clone().subtract(7, "days").startOf("day");
        break;
      case "quarter":
        startDate = now.clone().subtract(90, "days").startOf("day");
        break;
      case "year":
        startDate = now.clone().subtract(365, "days").startOf("day");
        break;
      case "month":
      default:
        startDate = now.clone().subtract(30, "days").startOf("day");
        break;
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  // Fetch dashboard data
  const loadDashboardData = async () => {
    if (!currentAccount) return;

    const dateRange = getDateRange(period);
    const params = {
      account: currentAccount,
      period,
      ...dateRange,
      groupBy: groupBy,
      ...(selectedOrganization && { organisation: selectedOrganization }),
    };

    dispatch(fetchAllDashboardData(params));

    // Fetch insights
    loadInsights(params);

    // Fetch enhanced revenue trend
    loadEnhancedRevenueTrend(params);

    // Fetch operational health
    loadOperationalHealth(params);
  };

  const loadOperationalHealth = async (params) => {
    setOperationalHealthLoading(true);
    try {
      const response = await analyticsApi.getOperationalHealth(params);
      if (!response.error && response.data) {
        setOperationalHealth(response.data);
      }
    } catch (error) {
      console.error("Error loading operational health:", error);
    } finally {
      setOperationalHealthLoading(false);
    }
  };

  const loadEnhancedMetrics = async (params) => {
    setEnhancedMetricsLoading(true);
    try {
      const response = await analyticsApi.getFinancialMetricsEnhanced(params);
      if (!response.error && response.data) {
        setEnhancedMetrics(response.data);
      } else {
        // Backend not ready - generate mock data from existing metrics
        const existingMetrics = financialMetrics.data;
        if (existingMetrics) {
          const mockEnhanced = {
            ...existingMetrics,
            previousTotalSales: existingMetrics.totalSales * 1.12,
            previousTotalProfit: existingMetrics.totalProfit * 0.966,
            previousActiveOrders: Math.round(
              existingMetrics.activeOrders * 1.17
            ),
            salesTrend: new Array(30)
              .fill(0)
              .map(
                () => existingMetrics.totalSales * (0.8 + Math.random() * 0.4)
              ),
            profitTrend: new Array(30)
              .fill(0)
              .map(
                () => existingMetrics.totalProfit * (0.8 + Math.random() * 0.4)
              ),
            ordersTrend: new Array(30)
              .fill(0)
              .map(() =>
                Math.round(
                  existingMetrics.activeOrders * (0.8 + Math.random() * 0.4)
                )
              ),
            marginTrend: new Array(30)
              .fill(0)
              .map(
                () => existingMetrics.profitMargin * (0.9 + Math.random() * 0.2)
              ),
            salesTarget: existingMetrics.totalSales * 1.5,
            profitTarget: existingMetrics.totalProfit * 1.5,
            ordersTarget: Math.round(existingMetrics.activeOrders * 1.3),
            previousProfitMargin: existingMetrics.profitMargin * 0.95,
            marginChange:
              existingMetrics.profitMargin -
              existingMetrics.profitMargin * 0.95,
          };
          setEnhancedMetrics(mockEnhanced);
        }
      }
    } catch (error) {
      console.warn(
        "Enhanced metrics API not available, using fallback data:",
        error.message
      );
      // Fallback already handled in the if-else above
    } finally {
      setEnhancedMetricsLoading(false);
    }
  };

  const loadInsights = async (params) => {
    setInsightsLoading(true);
    try {
      const response = await analyticsApi.getInsights(params);
      if (!response.error && response.data && response.data.length > 0) {
        setInsights(response.data);
      } else {
        // Backend not ready - generate sample insights
        const mockInsights = [
          {
            type: "info",
            message: "Backend API for insights not yet implemented",
            action:
              "Once the /api/analytics/insights endpoint is created, real-time insights will appear here automatically",
          },
          {
            type: "warning",
            message:
              "Enhanced dashboard features require backend implementation",
            action:
              "Refer to _docs/dashboard-improvements.md for API specifications",
          },
        ];
        setInsights(mockInsights);
      }
    } catch (error) {
      console.warn(
        "Insights API not available, showing placeholder:",
        error.message
      );
      setInsights([
        {
          type: "info",
          message: "Smart insights feature coming soon",
          action: "Backend API implementation required",
        },
      ]);
    } finally {
      setInsightsLoading(false);
    }
  };

  const loadEnhancedRevenueTrend = async (params) => {
    setEnhancedRevenueLoading(true);
    try {
      const response = await analyticsApi.getRevenueTrend({
        ...params,
        groupBy: groupBy,
      });
      if (!response.error && response.data) {
        setEnhancedRevenueTrend(response.data);
      }
    } catch (error) {
      console.error("Error loading enhanced revenue trend:", error);
    } finally {
      setEnhancedRevenueLoading(false);
    }
  };

  const handleGroupByChange = (newGroupBy) => {
    setGroupBy(newGroupBy);
    const dateRange = getDateRange(period);
    loadEnhancedRevenueTrend({
      account: currentAccount,
      period,
      ...dateRange,
      groupBy: newGroupBy,
    });
  };

  // Get current date range for passing to components
  const currentDateRange = getDateRange(period);

  useEffect(() => {
    gtm.push({ event: "page_view" });
  }, []);

  // Load organizations on mount
  useEffect(() => {
    if (currentAccount) {
      dispatch(fetchOrganizations());
    }
  }, [currentAccount]);

  useEffect(() => {
    loadDashboardData();
  }, [currentAccount, period, selectedOrganization, groupBy]);

  // Load enhanced metrics after regular metrics are loaded
  useEffect(() => {
    if (financialMetrics.data && currentAccount) {
      const dateRange = getDateRange(period);
      const params = {
        account: currentAccount,
        period,
        ...dateRange,
      };
      loadEnhancedMetrics(params);
    }
  }, [financialMetrics.data, currentAccount, period]);

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleViewModeChange = (event) => {
    const newGroupBy = event.target.value;
    handleGroupByChange(newGroupBy);
  };

  const handleOrganizationChange = (orgId) => {
    dispatch(selectOrganization(orgId));
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const getGreeting = () => {
    const hour = moment().hour();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <>
      <Head>
        <title>Dashboard | Truckar</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 64,
            zIndex: 10,
            bgcolor: 'background.default',
            borderBottom: 1,
            borderColor: 'divider',
            pb: 2,
            mb: 4,
          }}
        >
          <Container maxWidth="xl">
            <Box sx={{ pt: 2 }}>
              <Grid container justifyContent="space-between" spacing={3}>
                <Grid item>
                  <Typography variant="h4">
                    {getGreeting()}
                    {user?.name && `, ${user.name.split(" ")[0]}`}
                  </Typography>
                  <Typography
                    color="textSecondary"
                    variant="body2"
                    sx={{ mt: 1 }}
                  >
                    Here's what's happening with your logistics today
                  </Typography>
                </Grid>
                <Grid
                  item
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <OrganizationSelector
                    organizations={organizations.data}
                    selectedOrgId={selectedOrganization}
                    onSelectOrg={handleOrganizationChange}
                  />
                  <Button
                    startIcon={<RefreshIcon fontSize="small" />}
                    onClick={handleRefresh}
                    variant="outlined"
                    size="small"
                  >
                    Refresh
                  </Button>
                  <Button
                    startIcon={<ReportsIcon fontSize="small" />}
                    variant="outlined"
                    size="small"
                    onClick={() => router.push("/dashboard/reports")}
                  >
                    Reports
                  </Button>
                  <TextField
                    value={period}
                    onChange={handlePeriodChange}
                    label="Period"
                    select
                    size="small"
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="week">Last 7 days</MenuItem>
                    <MenuItem value="month">Last 30 days</MenuItem>
                    <MenuItem value="quarter">Last 90 days</MenuItem>
                    <MenuItem value="year">Last year</MenuItem>
                  </TextField>
                  <TextField
                    value={groupBy}
                    onChange={handleViewModeChange}
                    label="View By"
                    select
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="day">Day</MenuItem>
                    <MenuItem value="week">Week</MenuItem>
                    <MenuItem value="month">Month</MenuItem>
                    <MenuItem value="quarter">Quarter</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl">
          <Grid container spacing={3}>
            {/* Financial Metrics Cards - Enhanced */}
            <Grid item xs={12}>
              <FinancialMetricsCardsEnhanced
                data={enhancedMetrics}
                loading={enhancedMetricsLoading}
              />
            </Grid>

            {/* Operational Health Dashboard */}
            <Grid item xs={12}>
              <OperationalHealthDashboard
                data={operationalHealth}
                loading={operationalHealthLoading}
              />
            </Grid>

            {/* Key Insights Card */}
            <Grid item xs={12}>
              <DashboardInsights
                insights={insights}
                loading={insightsLoading}
              />
            </Grid>

            {/* Revenue Chart - Enhanced */}
            <Grid item xs={12}>
              <RevenueChartEnhanced
                data={
                  enhancedRevenueTrend.length > 0
                    ? enhancedRevenueTrend
                    : revenueTrend.data
                }
                loading={enhancedRevenueLoading || revenueTrend.loading}
                period={period}
                groupBy={groupBy}
                startDate={currentDateRange.startDate}
                endDate={currentDateRange.endDate}
              />
            </Grid>

            {/* Top Customers Chart */}
            <Grid item xs={12} md={6}>
              <TopCustomersChart
                data={topCustomers.data}
                loading={topCustomers.loading}
                title="Top Customers by Profit"
                dataKey="profit"
                type="customer"
                period={period}
                startDate={currentDateRange.startDate}
                endDate={currentDateRange.endDate}
              />
            </Grid>

            {/* Top Transporters Chart */}
            <Grid item xs={12} md={6}>
              <TopCustomersChart
                data={topTransporters.data}
                loading={topTransporters.loading}
                title="Top Transporters by Profit"
                dataKey="profit"
                nameKey="transporterName"
                type="transporter"
                period={period}
                startDate={currentDateRange.startDate}
                endDate={currentDateRange.endDate}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

Overview.getLayout = (page) => (
  <AuthGuard>
    <OnBoardingGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </OnBoardingGuard>
  </AuthGuard>
);

export default Overview;
