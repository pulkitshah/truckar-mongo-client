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
        dataPointSelection: (event, chartContext, config) => {
          const dataPointIndex = config.dataPointIndex;
          if (dataPointIndex >= 0 && chartData[dataPointIndex]) {
            handleItemDoubleClick(chartData[dataPointIndex]);
          }
        },
      },
    },
    colors: [theme.palette.primary.main],
    dataLabels: {
      enabled: false,
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
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "70%",
        horizontal: false,
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
          value: 0.9,
        },
      },
    },
    theme: {
      mode: theme.palette.mode,
    },
    tooltip: {
      theme: theme.palette.mode,
      y: {
        formatter: (value) => `₹${Number(value).toLocaleString("en-IN")}`,
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
        rotate: -45,
        rotateAlways: categories.length > 5,
      },
    },
    yaxis: {
      labels: {
        formatter: (value) => `₹${Number(value).toLocaleString("en-IN")}`,
        style: {
          colors: theme.palette.text.secondary,
        },
      },
    },
  };

  const chartSeries = [
    {
      name: dataKey.charAt(0).toUpperCase() + dataKey.slice(1),
      data: chartData.map((item) => item[dataKey] || 0),
    },
  ];

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
                  <TableCell>Name</TableCell>
                  <TableCell align="right">
                    {dataKey.charAt(0).toUpperCase() + dataKey.slice(1)} (₹)
                  </TableCell>
                  <TableCell align="right">Order Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chartData.map((item) => (
                  <TableRow
                    key={item.customerId || item.transporterId}
                    onClick={() => handleItemDoubleClick(item)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <TableCell>{item[nameKey] || "Unknown"}</TableCell>
                    <TableCell align="right">
                      {Number(item[dataKey] || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell align="right">{item.orderCount || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Chart
            height={300}
            options={chartOptions}
            series={chartSeries}
            type="bar"
          />
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
