import { useState } from "react";
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
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Chart } from "../../chart";
import { TableChart as TableIcon } from "../../../icons/table-chart";
import { ChartBar as ChartIcon } from "../../../icons/chart-bar";
import PropTypes from "prop-types";
import moment from "moment";
import { analyticsApi } from "../../../api/analytics-api";
import { useAuth } from "../../../hooks/use-auth";

export const RevenueChart = ({ data, loading, period = "month" }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [showTable, setShowTable] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    date: null,
    orders: [],
    loading: false,
  });

  if (loading) {
    return (
      <Card>
        <CardHeader title="Revenue & Profit Trend" />
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
    console.log(
      "Fetching details for date:",
      dateString,
      "account:",
      accountId
    );

    try {
      const response = await analyticsApi.getRevenueDetails({
        account: accountId,
        date: dateString,
        groupBy: "day", // Always use day since revenue-trend returns daily data
      });

      console.log("Revenue details response:", response);

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
    if (period === "week" || period === "month") {
      return moment(dateString).format("MMM DD");
    } else if (period === "quarter" || period === "year") {
      return moment(dateString).format("MMM YY");
    }
    return moment(dateString).format("DD/MM");
  };

  const categories = chartData.map((item) => formatDate(item.date));
  const salesData = chartData.map((item) => parseFloat(item.sales.toFixed(2)));
  const profitData = chartData.map((item) =>
    parseFloat(item.profit.toFixed(2))
  );

  const chartOptions = {
    chart: {
      background: "transparent",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
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
    colors: [theme.palette.primary.main, theme.palette.success.main],
    dataLabels: {
      enabled: false,
    },
    fill: {
      type: "gradient",
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
      size: 4,
      strokeColors: theme.palette.background.paper,
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    theme: {
      mode: theme.palette.mode,
    },
    tooltip: {
      theme: theme.palette.mode,
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
      },
    },
    yaxis: {
      labels: {
        formatter: (value) => `₹${(value / 1000).toFixed(0)}K`,
        style: {
          colors: theme.palette.text.secondary,
        },
      },
    },
  };

  const chartSeries = [
    {
      name: "Sales",
      data: salesData,
    },
    {
      name: "Profit",
      data: profitData,
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Revenue & Profit Trend"
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
                      key={index}
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
              height={300}
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
          Order Details -{" "}
          {detailsDialog.date
            ? moment(detailsDialog.date).format("MMMM DD, YYYY")
            : ""}
        </DialogTitle>
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
                  No orders found for this date
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

RevenueChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      sales: PropTypes.number.isRequired,
      profit: PropTypes.number.isRequired,
    })
  ),
  loading: PropTypes.bool,
  period: PropTypes.string,
};
