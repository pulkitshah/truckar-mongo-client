import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Skeleton,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Grid,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Chart } from "../../chart";
import { TableChart as TableIcon } from "../../../icons/table-chart";
import { ChartBar as ChartIcon } from "../../../icons/chart-bar";
import PropTypes from "prop-types";
import moment from "moment";
import { analyticsApi } from "../../../api/analytics-api";
import { useAuth } from "../../../hooks/use-auth";

export const TopCustomersChart = ({
  data,
  loading,
  title = "Top Customers by Profit",
  dataKey = "profit",
  nameKey = "customerName",
  type = "customer", // "customer" or "transporter"
  startDate,
  endDate,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [showTable, setShowTable] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    name: null,
    orders: [],
    loading: false,
  });

  if (loading) {
    return (
      <Card>
        <CardHeader title={title} />
        <CardContent>
          <Skeleton variant="rectangular" height={300} />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [];

  const handleItemDoubleClick = async (item) => {
    const entityId = item.customerId || item.transporterId;
    const entityName = item[nameKey] || "Unknown";

    if (!entityId) return;

    setDetailsDialog({
      open: true,
      name: entityName,
      orders: [],
      loading: true,
    });

    const accountId = user?.accounts?.[0]?.account;

    try {
      let response;
      if (type === "customer") {
        response = await analyticsApi.getCustomerDetails({
          account: accountId,
          customerId: entityId,
          startDate,
          endDate,
        });
      } else {
        response = await analyticsApi.getTransporterDetails({
          account: accountId,
          transporterId: entityId,
          startDate,
          endDate,
        });
      }

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
      console.error(`Error fetching ${type} details:`, error);
      setDetailsDialog((prev) => ({ ...prev, orders: [], loading: false }));
    }
  };

  const handleCloseDialog = () => {
    setDetailsDialog({ open: false, name: null, orders: [], loading: false });
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader title={title} />
        <CardContent>
          <Box
            sx={{
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
              height: 300,
            }}
          >
            <Typography color="textSecondary" variant="body2">
              No data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const categories = chartData.map((item) => item[nameKey] || "Unknown");

  const chartOptions = {
    chart: {
      background: "transparent",
      toolbar: {
        show: false,
      },
      events: {
        // Single click instead of double-click for better UX
        dataPointSelection: (event, chartContext, config) => {
          const dataPointIndex = config.dataPointIndex;
          if (dataPointIndex >= 0 && chartData[dataPointIndex]) {
            handleItemDoubleClick(chartData[dataPointIndex]);
          }
        },
      },
    },
    // Color gradient from high to low performers
    colors: [
      (opts) => {
        const percentage =
          opts.value / Math.max(...chartData.map((d) => d[dataKey]));
        if (percentage > 0.7) return theme.palette.success.main;
        if (percentage > 0.4) return theme.palette.primary.main;
        return theme.palette.warning.main;
      },
    ],
    dataLabels: {
      enabled: true,
      formatter: (value) => `₹${(value / 100000).toFixed(1)}L`,
      style: {
        fontSize: "11px",
        colors: [theme.palette.mode === "dark" ? "#fff" : "#000"],
      },
      offsetX: 0,
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 2,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        barHeight: "70%",
        horizontal: true, // Horizontal bars for better label readability
        distributed: true, // Different color per bar
        dataLabels: {
          position: "top",
        },
      },
    },
    states: {
      active: {
        filter: {
          type: "none",
        },
      },
      hover: {
        filter: {
          type: "darken",
          value: 0.85,
        },
      },
    },
    theme: {
      mode: theme.palette.mode,
    },
    tooltip: {
      theme: theme.palette.mode,
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const item = chartData[dataPointIndex];
        return `
          <div style="padding: 12px; min-width: 200px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">
              ${item[nameKey] || "Unknown"}
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
              <span style="color: #888;">Profit:</span>
              <span style="font-weight: 600;">₹${Number(
                item[dataKey] || 0
              ).toLocaleString("en-IN")}</span>
            </div>
            ${
              item.orders
                ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                <span style="color: #888;">Orders:</span>
                <span style="font-weight: 600;">${item.orders}</span>
              </div>
            `
                : ""
            }
            ${
              item.sales
                ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                <span style="color: #888;">Sales:</span>
                <span style="font-weight: 600;">₹${Number(
                  item.sales
                ).toLocaleString("en-IN")}</span>
              </div>
            `
                : ""
            }
            ${
              item.profitMargin
                ? `
              <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span style="color: #888;">Margin:</span>
                <span style="font-weight: 600; color: ${
                  item.profitMargin > 20
                    ? "#10b981"
                    : item.profitMargin > 10
                    ? "#f59e0b"
                    : "#ef4444"
                };">
                  ${item.profitMargin.toFixed(1)}%
                </span>
              </div>
            `
                : ""
            }
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; font-size: 11px; color: #888;">
              Click to view detailed orders
            </div>
          </div>
        `;
      },
    },
    xaxis: {
      categories: categories,
      labels: {
        formatter: (value) => `₹${(value / 100000).toFixed(1)}L`,
        style: {
          colors: theme.palette.text.secondary,
          fontSize: "11px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontSize: "12px",
        },
        maxWidth: 180,
      },
    },
    legend: {
      show: false,
    },
  };

  const chartSeries = [
    {
      name: dataKey.charAt(0).toUpperCase() + dataKey.slice(1),
      data: chartData.map((item) => item[dataKey] || 0),
    },
  ];

  // Prepare donut chart data - Top 5 + Others
  const totalProfit = chartData.reduce(
    (sum, item) => sum + (item[dataKey] || 0),
    0
  );
  const top5Data = chartData.slice(0, Math.min(5, chartData.length));
  const othersProfit = chartData
    .slice(5)
    .reduce((sum, item) => sum + (item[dataKey] || 0), 0);

  const donutSeries =
    top5Data.length > 0
      ? [
          ...top5Data.map((item) => item[dataKey] || 0),
          ...(othersProfit > 0 ? [othersProfit] : []),
        ]
      : [];

  const donutLabels =
    top5Data.length > 0
      ? [
          ...top5Data.map((item) => item[nameKey] || "Unknown"),
          ...(othersProfit > 0 ? ["Others"] : []),
        ]
      : [];

  // Calculate concentration metrics
  const top3Profit = chartData
    .slice(0, Math.min(3, chartData.length))
    .reduce((sum, item) => sum + (item[dataKey] || 0), 0);
  const top3Percentage =
    totalProfit > 0 ? ((top3Profit / totalProfit) * 100).toFixed(1) : "0";

  const donutOptions = {
    chart: {
      background: "transparent",
      toolbar: {
        show: false,
      },
      selection: {
        enabled: false,
      },
      zoom: {
        enabled: false,
      },
    },
    colors: [
      theme.palette.success.main,
      theme.palette.primary.main,
      theme.palette.info.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.grey[500],
    ],
    labels: donutLabels,
    legend: {
      show: true,
      position: "bottom",
      fontSize: "11px",
      labels: {
        colors: theme.palette.text.secondary,
      },
      formatter: (seriesName, opts) => {
        const value = opts.w.globals.series[opts.seriesIndex];
        const percentage =
          totalProfit > 0 ? ((value / totalProfit) * 100).toFixed(1) : "0";
        return `${seriesName}: ${percentage}%`;
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "14px",
              fontWeight: 600,
              color: theme.palette.text.primary,
            },
            value: {
              show: true,
              fontSize: "20px",
              fontWeight: 700,
              color: theme.palette.text.primary,
              formatter: () => `${top3Percentage}%`,
            },
            total: {
              show: true,
              label: "Top 3 Share",
              fontSize: "12px",
              color: theme.palette.text.secondary,
              formatter: () => `${top3Percentage}%`,
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    states: {
      active: {
        filter: {
          type: "none",
        },
      },
      hover: {
        filter: {
          type: "darken",
          value: 0.85,
        },
      },
    },
    theme: {
      mode: theme.palette.mode,
    },
    tooltip: {
      theme: theme.palette.mode,
      y: {
        formatter: (value) => {
          const percentage = ((value / totalProfit) * 100).toFixed(1);
          return `₹${Number(value).toLocaleString("en-IN")} (${percentage}%)`;
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <IconButton onClick={() => setShowTable(!showTable)} size="small">
            {showTable ? (
              <ChartIcon fontSize="small" />
            ) : (
              <TableIcon fontSize="small" />
            )}
          </IconButton>
        }
      />
      <CardContent>
        {showTable ? (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Orders</TableCell>
                  <TableCell align="right">Sales (₹)</TableCell>
                  <TableCell align="right">Profit (₹)</TableCell>
                  <TableCell align="right">Margin %</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chartData.map((item, index) => {
                  const profitMargin =
                    item.profitMargin ||
                    (item.sales > 0
                      ? ((item[dataKey] || 0) / item.sales) * 100
                      : 0);
                  return (
                    <TableRow
                      key={item.customerId || item.transporterId}
                      sx={{
                        "&:hover": {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={index + 1}
                          size="small"
                          color={
                            index === 0
                              ? "success"
                              : index === 1
                              ? "primary"
                              : "default"
                          }
                          sx={{ minWidth: 32 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item[nameKey] || "Unknown"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.orders || item.orderCount || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.sales
                            ? `₹${(item.sales / 100000).toFixed(2)}L`
                            : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ₹{((item[dataKey] || 0) / 100000).toFixed(2)}L
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${profitMargin.toFixed(1)}%`}
                          size="small"
                          color={
                            profitMargin > 20
                              ? "success"
                              : profitMargin > 10
                              ? "warning"
                              : "error"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleItemDoubleClick(item)}
                        >
                          View Orders
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {/* Bar Chart - Ranking View */}
            <Grid item xs={12} md={8}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Ranking & Performance
                </Typography>
                <Chart
                  height={Math.max(300, chartData.length * 50)}
                  options={chartOptions}
                  series={chartSeries}
                  type="bar"
                />
              </Box>
            </Grid>

            {/* Donut Chart - Concentration View */}
            <Grid item xs={12} md={4}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Concentration Analysis
                </Typography>
                {donutSeries.length > 0 ? (
                  <>
                    <Chart
                      height={Math.max(300, chartData.length * 50)}
                      options={donutOptions}
                      series={donutSeries}
                      type="donut"
                    />
                    <Box sx={{ mt: 2, textAlign: "center" }}>
                      <Typography variant="caption" color="text.secondary">
                        {top3Percentage}% of profit from top 3{" "}
                        {type === "customer" ? "customers" : "transporters"}
                      </Typography>
                      <br />
                      <Chip
                        label={
                          parseFloat(top3Percentage) > 60
                            ? "High Concentration"
                            : parseFloat(top3Percentage) > 40
                            ? "Moderate Concentration"
                            : "Well Diversified"
                        }
                        size="small"
                        color={
                          parseFloat(top3Percentage) > 60
                            ? "error"
                            : parseFloat(top3Percentage) > 40
                            ? "warning"
                            : "success"
                        }
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 300,
                    }}
                  >
                    <Typography color="textSecondary" variant="body2">
                      Insufficient data
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        )}
      </CardContent>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Order Details - {detailsDialog.name}</DialogTitle>
        <DialogContent>
          {detailsDialog.loading ? (
            <Skeleton variant="rectangular" height={400} />
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              {detailsDialog.orders.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order No</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Consignor</TableCell>
                      <TableCell>Consignee</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Sale Rate</TableCell>
                      <TableCell align="right">Purchase Rate</TableCell>
                      <TableCell align="right">Sales (₹)</TableCell>
                      <TableCell align="right">Purchase (₹)</TableCell>
                      <TableCell align="right">Expenses (₹)</TableCell>
                      <TableCell align="right">Profit (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailsDialog.orders.map((order, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{order.orderNo}</TableCell>
                        <TableCell>
                          {moment(order.saleDate).format("DD/MM/YYYY")}
                        </TableCell>
                        <TableCell>{order.consignorName || "-"}</TableCell>
                        <TableCell>{order.consigneeName || "-"}</TableCell>
                        <TableCell align="right">
                          {order.totalQuantity?.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {order.saleRate?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          {order.purchaseRate?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          {order.sales?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          {order.purchase?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          {order.expenses?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={order.profit?.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            color={order.profit >= 0 ? "success" : "error"}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography
                  color="text.secondary"
                  align="center"
                  sx={{ py: 3 }}
                >
                  No orders found for this {type}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

TopCustomersChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      customerId: PropTypes.string,
      customerName: PropTypes.string,
      profit: PropTypes.number,
      orderCount: PropTypes.number,
    })
  ),
  loading: PropTypes.bool,
  title: PropTypes.string,
  dataKey: PropTypes.string,
  nameKey: PropTypes.string,
  type: PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
};
