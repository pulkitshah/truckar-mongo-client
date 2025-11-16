import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Grid,
  IconButton,
  LinearProgress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Paper,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ChevronDown as ExpandMoreIcon } from "../../../icons/chevron-down";
import { ChevronUp as ExpandLessIcon } from "../../../icons/chevron-up";
import PropTypes from "prop-types";
import { useState } from "react";
import { Chart } from "../../chart";

// KPI Card Component
const KPICard = ({ title, value, subtitle, threshold, loading, color = "primary" }) => {
  const isAboveThreshold = threshold ? value >= threshold : true;
  const statusColor = isAboveThreshold ? "success" : "warning";

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={40} sx={{ mt: 1 }} />
          <Skeleton variant="rectangular" height={6} sx={{ mt: 1, borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography color="textSecondary" variant="overline">
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", mt: 0.5, mb: 1 }}>
          <Typography variant="h3" color={`${statusColor}.main`}>
            {value.toFixed(1)}%
          </Typography>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="textSecondary">
            {subtitle}
          </Typography>
        )}
        {threshold && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">
                Target: {threshold}%
              </Typography>
              <Typography variant="caption" color="textSecondary" fontWeight={600}>
                {value >= threshold ? "On Track" : "Below Target"}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min((value / threshold) * 100, 100)}
              sx={{
                height: 6,
                borderRadius: 1,
                bgcolor: (theme) => alpha(theme.palette[statusColor].main, 0.1),
                "& .MuiLinearProgress-bar": {
                  bgcolor: `${statusColor}.main`,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

KPICard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  subtitle: PropTypes.string,
  threshold: PropTypes.number,
  loading: PropTypes.bool,
  color: PropTypes.string,
};

// Collapsible Section Component
const CollapsibleSection = ({ title, count, children, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6">{title}</Typography>
            <Chip
              label={count}
              size="small"
              color={count > 0 ? "warning" : "default"}
              sx={{ ml: 1 }}
            />
          </Box>
        }
        action={
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        }
        sx={{ pb: 0 }}
      />
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>{children}</CardContent>
      </Collapse>
    </Card>
  );
};

CollapsibleSection.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
  defaultExpanded: PropTypes.bool,
};

// Outstanding Invoices Aging Chart
const AgingChart = ({ data }) => {
  const formatCurrency = (value) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const categories = ["0-30", "30-60", "60-90", "90+"];
  const series = categories.map((cat) => data[cat] || 0);

  const chartOptions = {
    chart: {
      type: "bar",
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: categories.map((cat) => `${cat} days`),
    },
    yaxis: {
      labels: {
        formatter: (value) => formatCurrency(value),
      },
    },
    fill: {
      opacity: 1,
      colors: ["#14B8A6", "#F59E0B", "#EF4444", "#991B1B"],
    },
    tooltip: {
      y: {
        formatter: (value) => formatCurrency(value),
      },
    },
  };

  return (
    <Chart
      options={chartOptions}
      series={[{ name: "Outstanding Amount", data: series }]}
      type="bar"
      height={300}
    />
  );
};

AgingChart.propTypes = {
  data: PropTypes.shape({
    "0-30": PropTypes.number,
    "30-60": PropTypes.number,
    "60-90": PropTypes.number,
    "90+": PropTypes.number,
  }).isRequired,
};

// Main Component
export const OperationalHealthDashboard = ({ data, loading }) => {
  const formatCurrency = (value) => {
    if (!value && value !== 0) return "₹0";
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const metrics = data || {
    documentCompletion: {
      lrCompletionRate: 0,
      invoiceCompletionRate: 0,
      fullCompletionRate: 0,
      ordersWithoutLR: 0,
      ordersWithoutInvoice: 0,
      totalOrders: 0,
      threshold: 80,
    },
    fleetUtilization: {
      utilizationRate: 0,
      activeVehicles: 0,
      totalVehicles: 0,
      idleVehicles: 0,
      threshold: 70,
    },
    driverActivity: {
      utilizationRate: 0,
      activeDrivers: 0,
      totalDrivers: 0,
      idleDrivers: 0,
    },
    pendingActions: {
      pendingLRs: {
        count: 0,
        byCustomer: [],
        threshold: 7,
      },
      pendingInvoices: {
        count: 0,
        totalAmount: 0,
        byCustomer: [],
        threshold: 15,
      },
    },
    outstandingInvoices: {
      count: 0,
      totalOutstanding: 0,
      agingSummary: {
        "0-30": 0,
        "30-60": 0,
        "60-90": 0,
        "90+": 0,
      },
      invoices: [],
      threshold: 30,
    },
  };

  if (loading) {
    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {/* KPI Cards Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <KPICard
            title="Document Completion"
            value={metrics.documentCompletion.fullCompletionRate}
            subtitle={`${metrics.documentCompletion.ordersWithoutLR} pending LRs, ${metrics.documentCompletion.ordersWithoutInvoice} pending invoices`}
            threshold={metrics.documentCompletion.threshold}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <KPICard
            title="Fleet Utilization"
            value={metrics.fleetUtilization.utilizationRate}
            subtitle={`${metrics.fleetUtilization.activeVehicles}/${metrics.fleetUtilization.totalVehicles} vehicles active`}
            threshold={metrics.fleetUtilization.threshold}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <KPICard
            title="Driver Utilization"
            value={metrics.driverActivity.utilizationRate}
            subtitle={`${metrics.driverActivity.activeDrivers}/${metrics.driverActivity.totalDrivers} drivers active`}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Pending Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <CollapsibleSection
            title={`Pending LRs (>${metrics.pendingActions.pendingLRs.threshold} days)`}
            count={metrics.pendingActions.pendingLRs.count}
            defaultExpanded={metrics.pendingActions.pendingLRs.count > 0}
          >
            {metrics.pendingActions.pendingLRs.byCustomer.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Oldest (days)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.pendingActions.pendingLRs.byCustomer.map((customer) => (
                      <TableRow key={customer.customerId || "unknown"}>
                        <TableCell>{customer.customer}</TableCell>
                        <TableCell align="right">
                          <Chip label={customer.count} size="small" color="warning" />
                        </TableCell>
                        <TableCell align="right">
                          {Math.max(...customer.items.map((i) => i.daysPending))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="textSecondary" variant="body2">
                No pending LRs
              </Typography>
            )}
          </CollapsibleSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <CollapsibleSection
            title={`Pending Invoices (>${metrics.pendingActions.pendingInvoices.threshold} days)`}
            count={metrics.pendingActions.pendingInvoices.count}
            defaultExpanded={metrics.pendingActions.pendingInvoices.count > 0}
          >
            {metrics.pendingActions.pendingInvoices.byCustomer.length > 0 ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Total Amount: {formatCurrency(metrics.pendingActions.pendingInvoices.totalAmount)}
                  </Typography>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metrics.pendingActions.pendingInvoices.byCustomer.map((customer) => (
                        <TableRow key={customer.customerId || "unknown"}>
                          <TableCell>{customer.customer}</TableCell>
                          <TableCell align="right">
                            <Chip label={customer.count} size="small" color="warning" />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(customer.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Typography color="textSecondary" variant="body2">
                No pending invoices
              </Typography>
            )}
          </CollapsibleSection>
        </Grid>
      </Grid>

      {/* Outstanding Invoices */}
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="h6">Outstanding Invoices (Aging Analysis)</Typography>
              <Box>
                <Chip
                  label={`${metrics.outstandingInvoices.count} invoices`}
                  size="small"
                  color={metrics.outstandingInvoices.count > 0 ? "error" : "default"}
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={formatCurrency(metrics.outstandingInvoices.totalOutstanding)}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Box>
            </Box>
          }
        />
        <CardContent>
          {metrics.outstandingInvoices.count > 0 ? (
            <AgingChart data={metrics.outstandingInvoices.agingSummary} />
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="textSecondary" variant="body2">
                No outstanding invoices
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

OperationalHealthDashboard.propTypes = {
  data: PropTypes.shape({
    documentCompletion: PropTypes.shape({
      lrCompletionRate: PropTypes.number,
      invoiceCompletionRate: PropTypes.number,
      fullCompletionRate: PropTypes.number,
      ordersWithoutLR: PropTypes.number,
      ordersWithoutInvoice: PropTypes.number,
      totalOrders: PropTypes.number,
      threshold: PropTypes.number,
    }),
    fleetUtilization: PropTypes.shape({
      utilizationRate: PropTypes.number,
      activeVehicles: PropTypes.number,
      totalVehicles: PropTypes.number,
      idleVehicles: PropTypes.number,
      threshold: PropTypes.number,
    }),
    driverActivity: PropTypes.shape({
      utilizationRate: PropTypes.number,
      activeDrivers: PropTypes.number,
      totalDrivers: PropTypes.number,
      idleDrivers: PropTypes.number,
    }),
    pendingActions: PropTypes.shape({
      pendingLRs: PropTypes.shape({
        count: PropTypes.number,
        byCustomer: PropTypes.array,
        threshold: PropTypes.number,
      }),
      pendingInvoices: PropTypes.shape({
        count: PropTypes.number,
        totalAmount: PropTypes.number,
        byCustomer: PropTypes.array,
        threshold: PropTypes.number,
      }),
    }),
    outstandingInvoices: PropTypes.shape({
      count: PropTypes.number,
      totalOutstanding: PropTypes.number,
      agingSummary: PropTypes.object,
      invoices: PropTypes.array,
      threshold: PropTypes.number,
    }),
  }),
  loading: PropTypes.bool,
};
