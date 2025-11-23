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
  Collapse,
  Alert,
  AlertTitle,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Info as InfoIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from '../../../store';
import { fetchTransporterScoring } from '../../../slices/analytics';
import TransporterDetailModal from './TransporterDetailModal';

const TransporterScoringTable = ({ params }) => {
  const dispatch = useDispatch();
  const { transporterScoring } = useSelector((state) => state.analytics);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (params?.account) {
      dispatch(fetchTransporterScoring(params));
    }
  }, [dispatch, params]);

  const formatCurrency = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${(value / 1000).toFixed(0)}K`;
  };

  const getTierColor = (tier) => {
    const colors = {
      strategic: 'success',
      reliable: 'info',
      growing: 'primary',
      conditional: 'warning',
      'at-risk': 'error',
    };
    return colors[tier] || 'default';
  };

  const getTierIcon = (tier) => {
    const icons = {
      strategic: '🤝',
      reliable: '✅',
      growing: '📊',
      conditional: '⚠️',
      'at-risk': '🚫',
    };
    return icons[tier] || '';
  };

  const columns = [
    {
      field: 'transporterName',
      headerName: 'Transporter',
      width: 200,
      renderCell: (params) => {
        const city = params.row.transporterCity;
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
      field: 'partnershipScore',
      headerName: 'Partnership Score',
      width: 180,
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
                <div>Volume: {params.row.scoreBreakdown.volumeScore}/40</div>
                <div>
                  Reliability: {params.row.scoreBreakdown.reliabilityScore}/30
                </div>
                <div>
                  Cost: {params.row.scoreBreakdown.costCompetitivenessScore}/20
                </div>
                <div>Tenure: {params.row.scoreBreakdown.tenureScore}/10</div>
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
      field: 'partnershipTier',
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
      field: 'avgCost',
      headerName: 'Avg Cost',
      width: 110,
      align: 'right',
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'profitMargin',
      headerName: 'Margin',
      width: 90,
      align: 'right',
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.value >= 10 ? 'success.main' : 'text.primary'}
        >
          {params.value.toFixed(1)}%
        </Typography>
      ),
    },
    {
      field: 'docCompletionRate',
      headerName: 'Doc Completion',
      width: 130,
      align: 'right',
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.value >= 80 ? 'success.main' : params.value >= 60 ? 'warning.main' : 'error.main'}
        >
          {params.value.toFixed(0)}%
        </Typography>
      ),
    },
    {
      field: 'costConsistency',
      headerName: 'Cost Consistency',
      width: 140,
      align: 'right',
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.value >= 70 ? 'success.main' : 'warning.main'}
        >
          {params.value.toFixed(0)}%
        </Typography>
      ),
    },
    {
      field: 'monthsActive',
      headerName: 'Tenure',
      width: 100,
      align: 'right',
      renderCell: (params) => (
        <Typography variant="body2">
          {Math.round(params.value)}mo
        </Typography>
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

  if (transporterScoring.loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={600} />
        </CardContent>
      </Card>
    );
  }

  if (!transporterScoring.data?.transporters?.length) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Transporter Partnership Scoring
          </Typography>
          <Typography color="text.secondary">
            No transporter data available for the selected period
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { transporters, summary } = transporterScoring.data;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Transporter Partnership Scoring</Typography>
          <Chip 
            icon={showGuide ? <ExpandLessIcon /> : <InfoIcon />}
            label={showGuide ? "Hide Guide" : "Show Metrics Guide"}
            onClick={() => setShowGuide(!showGuide)}
            color="primary"
            variant="outlined"
            sx={{ cursor: 'pointer' }}
          />
        </Box>

        {/* Metrics Guide */}
        <Collapse in={showGuide}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>📊 What These Metrics Mean</AlertTitle>
            <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0, '& li': { mb: 0.5 } }}>
              <li><strong>Partnership Score:</strong> Overall quality (0-100). Volume 40% + Reliability 30% + Cost 20% + Tenure 10%</li>
              <li><strong>Tier:</strong> Strategic (best), Reliable, Growing, Conditional, or At-Risk</li>
              <li><strong>Doc Completion:</strong> % of orders with both LR and Invoice</li>
              <li><strong>Cost Consistency:</strong> How predictable their pricing is (higher is better)</li>
              <li><strong>Tenure:</strong> Months since first order together</li>
              <li><strong>Alerts:</strong> Warnings like poor docs, inconsistent pricing, low profit, or inactivity</li>
            </Box>
          </Alert>
        </Collapse>

        {/* Summary chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            <Chip
              label={`🤝 ${summary.strategicCount || 0} Strategic`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              label={`✅ ${summary.reliableCount || 0} Reliable`}
              size="small"
              color="info"
              variant="outlined"
            />
            <Chip
              label={`🚫 ${summary.atRiskCount || 0} At Risk`}
              size="small"
              color="error"
              variant="outlined"
            />
            <Chip
              label={`Avg: ${summary.avgPartnershipScore || 0}`}
              size="small"
              variant="outlined"
            />
          </Box>

        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={transporters || []}
            columns={columns}
            getRowId={(row) => row.transporterId}
            loading={transporterScoring.loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
            disableRowSelectionOnClick
            onRowClick={(params) => setSelectedTransporter(params.row)}
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
        <TransporterDetailModal
          open={!!selectedTransporter}
          onClose={() => setSelectedTransporter(null)}
          transporter={selectedTransporter}
        />
      </CardContent>
    </Card>
  );
};

export default TransporterScoringTable;
