import { useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Skeleton,
} from '@mui/material';
import { useDispatch, useSelector } from '../../../store';
import { fetchCustomerPerformanceMatrix } from '../../../slices/analytics';
import { Chart } from '../../chart';

/**
 * Customer Performance Matrix - Bubble Chart
 * X-axis: Order Count (Frequency)
 * Y-axis: Total Profit (Monetary)
 * Bubble size: Average Order Value
 * Color: Profit Margin
 */
const CustomerPerformanceMatrix = ({ params }) => {
  const dispatch = useDispatch();
  const { customerPerformanceMatrix } = useSelector((state) => state.analytics);

  useEffect(() => {
    if (params?.account) {
      dispatch(fetchCustomerPerformanceMatrix(params));
    }
  }, [dispatch, params]);

  if (customerPerformanceMatrix.loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </CardContent>
      </Card>
    );
  }

  if (!customerPerformanceMatrix.data?.customers?.length) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Customer Performance Matrix
          </Typography>
          <Typography color="text.secondary">
            No customer data available for the selected period
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { customers, summary } = customerPerformanceMatrix.data;

  // Prepare chart data
  const chartSeries = [
    {
      name: 'Customers',
      data: customers.map((customer) => ({
        x: customer.orderCount,
        y: customer.totalProfit,
        z: customer.averageOrderValue,
        customerId: customer.customerId,
        customerName: customer.customerName,
        profitMargin: customer.profitMargin,
        totalSales: customer.totalSales,
      })),
    },
  ];

  const formatCurrency = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${(value / 1000).toFixed(0)}K`;
  };

  const chartOptions = {
    chart: {
      type: 'bubble',
      height: 400,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: false,
          reset: true,
        },
      },
    },
    xaxis: {
      title: {
        text: 'Order Count (Frequency)',
        style: {
          fontSize: '12px',
          fontWeight: 600,
        },
      },
      labels: {
        formatter: (val) => Math.round(val),
      },
    },
    yaxis: {
      title: {
        text: 'Total Profit',
        style: {
          fontSize: '12px',
          fontWeight: 600,
        },
      },
      labels: {
        formatter: (val) => formatCurrency(val),
      },
    },
    dataLabels: {
      enabled: false,
    },
    fill: {
      opacity: 0.8,
    },
    colors: ['#10B981'],
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const customer = w.config.series[seriesIndex].data[dataPointIndex];
        return `
          <div style="padding: 12px; background: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${customer.customerName}</div>
            <div style="font-size: 12px; color: #666;">Orders: ${customer.x}</div>
            <div style="font-size: 12px; color: #666;">Profit: ${formatCurrency(customer.y)}</div>
            <div style="font-size: 12px; color: #666;">Avg Order: ${formatCurrency(customer.z)}</div>
            <div style="font-size: 12px; color: #666;">Margin: ${customer.profitMargin.toFixed(1)}%</div>
          </div>
        `;
      },
    },
    legend: {
      show: false,
    },
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Customer Performance Matrix
        </Typography>

        {/* Chart */}
        <Box sx={{ height: 400, mb: 3 }}>
          <Chart
            type="bubble"
            series={chartSeries}
            options={chartOptions}
            height={400}
          />
        </Box>

        {/* Quadrant Labels */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'success.lighter',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                👑 Champions
              </Typography>
              <Typography variant="caption" color="text.secondary">
                High Volume + High Profit
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'info.lighter',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                ⭐ Stars
              </Typography>
              <Typography variant="caption" color="text.secondary">
                High Profit + Growing Volume
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'warning.lighter',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                🌱 Potential
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Low Profit + Low Volume
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'error.lighter',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                ⚠️ Risky
              </Typography>
              <Typography variant="caption" color="text.secondary">
                High Volume + Low Profit
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Summary Stats */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Total Customers
              </Typography>
              <Typography variant="h6">{summary.totalCustomers}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Avg Orders/Customer
              </Typography>
              <Typography variant="h6">
                {summary.avgOrdersPerCustomer.toFixed(1)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Avg Profit/Customer
              </Typography>
              <Typography variant="h6">
                {formatCurrency(summary.avgProfitPerCustomer)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Top Customer Profit
              </Typography>
              <Typography variant="h6">
                {formatCurrency(summary.topCustomerProfit)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CustomerPerformanceMatrix;
