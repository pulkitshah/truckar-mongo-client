import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Skeleton,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Chart } from "../../chart";
import { TableChart as TableIcon } from "../../../icons/table-chart";
import { ChartBar as ChartIcon } from "../../../icons/chart-bar";
import PropTypes from "prop-types";
import moment from "moment";
import { analyticsApi } from "../../../api/analytics-api";
import { useAuth } from "../../../hooks/use-auth";

export const RevenueChartEnhanced = ({ 
  data, 
  loading, 
  period = "month",
  startDate,
  endDate,
  onGroupByChange,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [showTable, setShowTable] = useState(false);
  const [groupBy, setGroupBy] = useState("day");
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    date: null,
    orders: [],
    loading: false,
  });

  // Fetch comparison data when comparison mode is enabled
  useEffect(() => {
    if (showComparison && !comparisonLoading && user?.accounts?.[0]?.account) {
      fetchComparisonData();
    }
  }, [showComparison, groupBy, startDate, endDate]);

  const fetchComparisonData = async () => {
    setComparisonLoading(true);
    const accountId = user?.accounts?.[0]?.account;

    try {
      const response = await analyticsApi.getRevenueTrendWithComparison({
        account: accountId,
        period,
        startDate,
        endDate,
        groupBy,
        comparison: true,
      });

      if (!response.error && response.data) {
        setComparisonData(response.data.previous || []);
      }
    } catch (error) {
      console.error("Error fetching comparison data:", error);
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleGroupByChange = (event, newGroupBy) => {
    if (newGroupBy !== null) {
      setGroupBy(newGroupBy);
      if (onGroupByChange) {
        onGroupByChange(newGroupBy);
      }
    }
  };

  const handleComparisonToggle = (event) => {
    setShowComparison(event.target.checked);
    if (!event.target.checked) {
      setComparisonData(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader 
          title="Revenue & Profit Trend"
          subheader="Analyze performance over time"
        />
        <CardContent>
          <Skeleton variant="rectangular" height={300} />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [];

  const handleRowDoubleClick = async (dateString) => {
    setDetailsDialog({
      open: true,
      date: dateString,
      orders: [],
      loading: true,
    });

    const accountId = user?.accounts?.[0]?.account;

    try {
      const response = await analyticsApi.getRevenueDetails({
        account: accountId,
        date: dateString,
        groupBy: groupBy,
      });

      if (!response.error && response.data?.data) {
        setDetailsDialog((prev) => ({
          ...prev,
          orders: response.data.data,
          loading: false,
        }));
      } else {
        setDetailsDialog((prev) => ({ ...prev, orders: [], loading: false }));
      }
    } catch (error) {
      console.error("Error fetching revenue details:", error);
      setDetailsDialog((prev) => ({ ...prev, orders: [], loading: false }));
    }
  };

  const handleCloseDialog = () => {
    setDetailsDialog({ open: false, date: null, orders: [], loading: false });
  };

  const formatDate = (dateString) => {
    if (groupBy === "day") {
      return moment(dateString).format("MMM DD");
    } else if (groupBy === "week") {
      return moment(dateString).format("MMM DD");
    } else if (groupBy === "month") {
      return moment(dateString).format("MMM YY");
    } else if (groupBy === "quarter") {
      return moment(dateString).format("[Q]Q YYYY");
    }
    return moment(dateString).format("DD/MM");
  };

  const categories = chartData.map((item) => formatDate(item.date));
  const salesData = chartData.map((item) => Number.parseFloat(item.sales.toFixed(2)));
  const profitData = chartData.map((item) => Number.parseFloat(item.profit.toFixed(2)));

  // Calculate moving averages for day view
  const calculateMovingAverage = (data, window = 7) => {
    return data.map((val, idx, arr) => {
      const start = Math.max(0, idx - window + 1);
      const subset = arr.slice(start, idx + 1);
      return subset.reduce((a, b) => a + b, 0) / subset.length;
    });
  };

  const chartSeries = [
    {
      name: "Sales",
      data: salesData,
      type: "area",
    },
    {
      name: "Profit",
      data: profitData,
      type: "area",
    },
  ];

  // Add moving average for day view
  if (groupBy === "day" && salesData.length > 7) {
    const movingAverageSeries = [
      {
        name: "Sales (7-day avg)",
        data: calculateMovingAverage(salesData, 7),
        type: "line",
      },
      {
        name: "Profit (7-day avg)",
        data: calculateMovingAverage(profitData, 7),
        type: "line",
      },
    ];
    chartSeries.push(...movingAverageSeries);
  }

  // Add comparison data if enabled
  if (showComparison && comparisonData && comparisonData.length > 0) {
    const prevSalesData = comparisonData.map((item) => Number.parseFloat(item.sales.toFixed(2)));
    const prevProfitData = comparisonData.map((item) => Number.parseFloat(item.profit.toFixed(2)));
    
    const comparisonSeries = [
      {
        name: "Sales (Previous)",
        data: prevSalesData,
        type: "line",
      },
      {
        name: "Profit (Previous)",
        data: prevProfitData,
        type: "line",
      },
    ];
    chartSeries.push(...comparisonSeries);
  }

  const chartOptions = {
    chart: {
      background: "transparent",
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: {
        enabled: true,
      },
      events: {
        dataPointSelection: (event, chartContext, config) => {
          const dataPointIndex = config.dataPointIndex;
          if (dataPointIndex >= 0 && chartData[dataPointIndex]) {
            handleRowDoubleClick(chartData[dataPointIndex].date);
          }
        },
      },
    },
    colors: [
      theme.palette.primary.main, 
      theme.palette.success.main,
      theme.palette.primary.light,
      theme.palette.success.light,
      theme.palette.error.main,
      theme.palette.warning.main,
    ],
    dataLabels: {
      enabled: false,
    },
    fill: {
      type: ["gradient", "gradient", "solid", "solid", "solid", "solid"],
      gradient: {
        opacityFrom: 0.5,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 2,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
    },
    markers: {
      size: [4, 4, 0, 0, 3, 3],
      strokeColors: theme.palette.background.paper,
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2, 2, 2, 2, 2],
      dashArray: [0, 0, 5, 5, 8, 8],
    },
    theme: {
      mode: theme.palette.mode,
    },
    tooltip: {
      theme: theme.palette.mode,
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => `₹${value.toLocaleString("en-IN")}`,
      },
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      categories: categories,
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        },
        rotate: groupBy === "day" ? -45 : 0,
      },
    },
    yaxis: {
      labels: {
        formatter: (value) => {
          if (value >= 100000) {
            return `₹${(value / 100000).toFixed(1)}L`;
          }
          return `₹${(value / 1000).toFixed(0)}K`;
        },
        style: {
          colors: theme.palette.text.secondary,
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader
        title="Revenue & Profit Trend"
        subheader="Analyze performance over time with flexible granularity"
        action={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <IconButton onClick={() => setShowTable(!showTable)} size="small">
              {showTable ? (
                <ChartIcon fontSize="small" />
              ) : (
                <TableIcon fontSize="small" />
              )}
            </IconButton>
          </Box>
        }
      />
      <CardContent>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <ToggleButtonGroup
            value={groupBy}
            exclusive
            onChange={handleGroupByChange}
            size="small"
            aria-label="time aggregation"
          >
            <ToggleButton value="day" aria-label="day view">
              Day
            </ToggleButton>
            <ToggleButton value="week" aria-label="week view">
              Week
            </ToggleButton>
            <ToggleButton value="month" aria-label="month view">
              Month
            </ToggleButton>
            <ToggleButton value="quarter" aria-label="quarter view">
              Quarter
            </ToggleButton>
          </ToggleButtonGroup>

          <FormControlLabel
            control={
              <Switch
                checked={showComparison}
                onChange={handleComparisonToggle}
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Compare to previous period
              </Typography>
            }
          />
        </Box>

        {showTable ? (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Sales (₹)</TableCell>
                  <TableCell align="right">Profit (₹)</TableCell>
                  <TableCell align="right">Margin %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chartData.map((item, index) => {
                  const sales = item.sales;
                  const profit = item.profit;
                  const margin =
                    sales > 0 ? ((profit / sales) * 100).toFixed(2) : 0;
                  return (
                    <TableRow
                      key={`row-${item.date}-${index}`}
                      onClick={() => handleRowDoubleClick(item.date)}
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                    >
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell align="right">
                        {sales.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell align="right">
                        {profit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell align="right">{margin}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box sx={{ cursor: "pointer" }}>
            <Chart
              height={350}
              options={chartOptions}
              series={chartSeries}
              type="area"
            />
          </Box>
        )}
      </CardContent>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Order Details - {detailsDialog.date && formatDate(detailsDialog.date)}
        </DialogTitle>
        <DialogContent>
          {detailsDialog.loading && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography>Loading orders...</Typography>
            </Box>
          )}
          {!detailsDialog.loading && detailsDialog.orders.length === 0 && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                No orders found for this date
              </Typography>
            </Box>
          )}
          {!detailsDialog.loading && detailsDialog.orders.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order No</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Consignor</TableCell>
                  <TableCell>Consignee</TableCell>
                  <TableCell align="right">Sales</TableCell>
                  <TableCell align="right">Profit</TableCell>
                  <TableCell align="right">Margin</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailsDialog.orders.map((order, idx) => (
                  <TableRow key={`order-${order.orderNo || idx}`}>
                    <TableCell>{order.orderNo}</TableCell>
                    <TableCell>
                      {moment(order.saleDate).format("DD/MM/YYYY")}
                    </TableCell>
                    <TableCell>{order.consignorName}</TableCell>
                    <TableCell>{order.consigneeName}</TableCell>
                    <TableCell align="right">
                      ₹{order.sales?.toLocaleString("en-IN") || 0}
                    </TableCell>
                    <TableCell align="right">
                      ₹{order.profit?.toLocaleString("en-IN") || 0}
                    </TableCell>
                    <TableCell align="right">
                      {order.sales > 0
                        ? ((order.profit / order.sales) * 100).toFixed(1)
                        : 0}
                      %
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

RevenueChartEnhanced.propTypes = {
  data: PropTypes.array,
  loading: PropTypes.bool,
  period: PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  onGroupByChange: PropTypes.func,
};
