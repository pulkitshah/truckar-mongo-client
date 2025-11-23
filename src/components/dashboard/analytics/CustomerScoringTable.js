import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
  Skeleton,
  ClickAwayListener,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Info as InfoIcon,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { useDispatch, useSelector } from '../../../store';
import { fetchCustomerScoring } from '../../../slices/analytics';
import CustomerDetailModal from './CustomerDetailModal';

const CustomerScoringTable = ({ params }) => {
  const dispatch = useDispatch();
  const { customerScoring } = useSelector((state) => state.analytics);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openTooltips, setOpenTooltips] = useState({});

  useEffect(() => {
    if (params?.account) {
      dispatch(fetchCustomerScoring(params));
    }
  }, [dispatch, params]);

  const handleTooltipToggle = (key) => {
    setOpenTooltips(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTooltipClose = (key) => {
    setOpenTooltips(prev => ({
      ...prev,
      [key]: false
    }));
  };

  const formatCurrency = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${(value / 1000).toFixed(0)}K`;
  };

  const getTierColor = (tier) => {
    const colors = {
      champion: 'success',
      valuable: 'info',
      growing: 'primary',
      average: 'default',
      'at-risk': 'error',
    };
    return colors[tier] || 'default';
  };

  const getTierIcon = (tier) => {
    const icons = {
      champion: '🏆',
      valuable: '⭐',
      growing: '📈',
      average: '👤',
      'at-risk': '⚠️',
    };
    return icons[tier] || '';
  };

  const columns = [
    {
      field: 'customerName',
      headerName: 'Customer',
      width: 200,
      renderCell: (params) => {
        const city = params.row.customerCity;
        const cityText = typeof city === 'string' ? city : (city?.description || city?.place_id || '');
        return (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {params.value}
            </Typography>
            {cityText && (
              <Typography variant="caption" color="text.secondary">
                {cityText}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: 'healthScore',
      headerName: 'Health Score',
      width: 180,
      renderHeader: () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>Health Score</Typography>
          <ClickAwayListener onClickAway={() => handleTooltipClose('health')}>
            <Tooltip 
              title="Customer relationship health (0-100). Based on: Frequency (30%), Profitability (25%), Growth (20%), Recency (15%), and Payment (10%)"
              open={openTooltips['health'] || false}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              arrow
              placement="top"
            >
              <IconButton 
                size="small" 
                onClick={() => handleTooltipToggle('health')}
                sx={{ p: 0.5 }}
              >
                <InfoIcon fontSize="small" sx={{ color: 'primary.main' }} />
              </IconButton>
            </Tooltip>
          </ClickAwayListener>
        </Box>
      ),
      renderCell: (params) => (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            width: '100%',
          }}
        >
          <Typography variant="body2" fontWeight={700}>
            {params.value}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={params.value}
              sx={{ height: 8, borderRadius: 4 }}
              color={
                params.value >= 75
                  ? 'success'
                  : params.value >= 40
                  ? 'warning'
                  : 'error'
              }
            />
          </Box>
          <Tooltip
            title={
              <Box>
                <div>Frequency: {params.row.scoreBreakdown.frequencyScore}/30</div>
                <div>
                  Profit: {params.row.scoreBreakdown.profitabilityScore}/25
                </div>
                <div>Growth: {params.row.scoreBreakdown.growthScore}/20</div>
                <div>Recency: {params.row.scoreBreakdown.recencyScore}/15</div>
                <div>Payment: {params.row.scoreBreakdown.paymentScore}/10</div>
              </Box>
            }
          >
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      field: 'scoreTier',
      headerName: 'Tier',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={`${getTierIcon(params.value)} ${params.value}`}
          color={getTierColor(params.value)}
          size="small"
          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
        />
      ),
    },
    {
      field: 'orderCount',
      headerName: 'Orders',
      width: 90,
      align: 'right',
    },
    {
      field: 'totalProfit',
      headerName: 'Total Profit',
      width: 120,
      align: 'right',
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'averageProfitPerOrder',
      headerName: 'Avg Profit',
      width: 110,
      align: 'right',
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'profitMargin',
      headerName: 'Margin',
      width: 90,
      align: 'right',
      renderHeader: () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>Margin</Typography>
          <ClickAwayListener onClickAway={() => handleTooltipClose('margin')}>
            <Tooltip 
              title="Profit as percentage of sales. Higher margin = more profitable customer"
              open={openTooltips['margin'] || false}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              arrow
              placement="top"
            >
              <IconButton 
                size="small" 
                onClick={() => handleTooltipToggle('margin')}
                sx={{ p: 0.5 }}
              >
                <InfoIcon fontSize="small" sx={{ color: 'primary.main' }} />
              </IconButton>
            </Tooltip>
          </ClickAwayListener>
        </Box>
      ),
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.value >= 15 ? 'success.main' : 'text.primary'}
        >
          {params.value.toFixed(1)}%
        </Typography>
      ),
    },
    {
      field: 'orderGrowth',
      headerName: 'Growth',
      width: 110,
      align: 'right',
      renderHeader: () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>Growth</Typography>
          <ClickAwayListener onClickAway={() => handleTooltipClose('growth')}>
            <Tooltip 
              title="Change in order volume compared to previous period. Positive = growing business"
              open={openTooltips['growth'] || false}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              arrow
              placement="top"
            >
              <IconButton 
                size="small" 
                onClick={() => handleTooltipToggle('growth')}
                sx={{ p: 0.5 }}
              >
                <InfoIcon fontSize="small" sx={{ color: 'primary.main' }} />
              </IconButton>
            </Tooltip>
          </ClickAwayListener>
        </Box>
      ),
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {params.value >= 0 ? (
            <TrendingUp sx={{ color: 'success.main', fontSize: 18 }} />
          ) : (
            <TrendingDown sx={{ color: 'error.main', fontSize: 18 }} />
          )}
          <Typography
            variant="body2"
            color={params.value >= 0 ? 'success.main' : 'error.main'}
          >
            {params.value >= 0 ? '+' : ''}
            {params.value}%
          </Typography>
        </Box>
      ),
    },
    {
      field: 'daysSinceLastOrder',
      headerName: 'Last Order',
      width: 110,
      align: 'right',
      renderHeader: () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>Last Order</Typography>
          <ClickAwayListener onClickAway={() => handleTooltipClose('lastOrder')}>
            <Tooltip 
              title="Days since their most recent order. Lower = more active customer"
              open={openTooltips['lastOrder'] || false}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              arrow
              placement="top"
            >
              <IconButton 
                size="small" 
                onClick={() => handleTooltipToggle('lastOrder')}
                sx={{ p: 0.5 }}
              >
                <InfoIcon fontSize="small" sx={{ color: 'primary.main' }} />
              </IconButton>
            </Tooltip>
          </ClickAwayListener>
        </Box>
      ),
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={
            params.value <= 7
              ? 'success.main'
              : params.value <= 30
              ? 'text.primary'
              : 'error.main'
          }
        >
          {Math.round(params.value)}d ago
        </Typography>
      ),
    },
    {
      field: 'totalOutstanding',
      headerName: 'Outstanding',
      width: 120,
      align: 'right',
      renderCell: (params) => (
        <Tooltip title={`${params.row.outstandingInvoiceCount} unpaid invoices`}>
          <Typography
            variant="body2"
            color={params.value > 0 ? 'warning.main' : 'text.secondary'}
          >
            {formatCurrency(params.value)}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'riskFlags',
      headerName: 'Alerts',
      width: 100,
      renderCell: (params) =>
        params.value.length > 0 ? (
          <Tooltip title={params.value.join(', ')}>
            <Chip
              label={`${params.value.length} alert${params.value.length > 1 ? 's' : ''}`}
              size="small"
              color="warning"
            />
          </Tooltip>
        ) : null,
    },
  ];

  if (customerScoring.loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={600} />
        </CardContent>
      </Card>
    );
  }

  if (!customerScoring.data?.customers?.length) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Customer Health & Scoring
          </Typography>
          <Typography color="text.secondary">
            No customer data available for the selected period
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { customers, summary } = customerScoring.data;

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="h6">Customer Health & Scoring</Typography>

          {/* Summary chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`🏆 ${summary.championCount || 0} Champions`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              label={`⭐ ${summary.valuableCount || 0} Valuable`}
              size="small"
              color="info"
              variant="outlined"
            />
            <Chip
              label={`⚠️ ${summary.atRiskCount || 0} At Risk`}
              size="small"
              color="error"
              variant="outlined"
            />
            <Chip
              label={`Avg: ${summary.avgHealthScore || 0}`}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>

        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={customers || []}
            columns={columns}
            getRowId={(row) => row.customerId}
            loading={customerScoring.loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
            disableRowSelectionOnClick
            onRowClick={(params) => setSelectedCustomer(params.row)}
            sx={{
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              },
            }}
          />
        </Box>

        {/* Detail Modal */}
        <CustomerDetailModal
          open={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
        />
      </CardContent>
    </Card>
  );
};

export default CustomerScoringTable;
