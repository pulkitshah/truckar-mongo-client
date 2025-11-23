import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Grid,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Divider,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const TransporterDetailModal = ({ open, onClose, transporter }) => {
  if (!transporter) return null;

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">{transporter.transporterName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {transporter.transporterCity?.description || transporter.transporterCity || 'Location not specified'}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              label={`${getTierIcon(transporter.partnershipTier)} ${transporter.partnershipTier}`}
              color={getTierColor(transporter.partnershipTier)}
              sx={{ textTransform: 'capitalize', fontWeight: 600 }}
            />
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Partnership Score Breakdown */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Partnership Score: {transporter.partnershipScore}/100
            </Typography>
            <LinearProgress
              variant="determinate"
              value={transporter.partnershipScore}
              sx={{ height: 10, borderRadius: 5, mb: 2 }}
              color={
                transporter.partnershipScore >= 75
                  ? 'success'
                  : transporter.partnershipScore >= 40
                  ? 'warning'
                  : 'error'
              }
            />

            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Volume Score (40%)
                </Typography>
                <Typography variant="h6">
                  {transporter.scoreBreakdown.volumeScore}/40
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Based on {transporter.orderCount} orders
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Reliability (30%)
                </Typography>
                <Typography variant="h6">
                  {transporter.scoreBreakdown.reliabilityScore}/30
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Docs + Cost consistency
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Cost Score (20%)
                </Typography>
                <Typography variant="h6">
                  {transporter.scoreBreakdown.costCompetitivenessScore}/20
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  vs. market average
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Tenure (10%)
                </Typography>
                <Typography variant="h6">
                  {transporter.scoreBreakdown.tenureScore}/10
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {Math.round(transporter.monthsActive)}mo partnership
                </Typography>
              </Grid>
            </Grid>
            
            {/* Explanation */}
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Typography variant="caption" color="info.dark">
                💡 <strong>How it works:</strong> Higher order volume and longer partnership increase trust. 
                Good documentation habits and consistent pricing show reliability.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Performance Metrics
            </Typography>
            <Divider sx={{ my: 1 }} />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Orders
                </Typography>
                <Typography variant="h6">{transporter.orderCount}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Profit
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(transporter.totalProfit)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Profit Margin
                </Typography>
                <Typography
                  variant="h6"
                  color={transporter.profitMargin >= 10 ? 'success.main' : 'text.primary'}
                >
                  {transporter.profitMargin.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Average Cost
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(transporter.avgCost)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Sales
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(transporter.totalSales)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Partnership Duration
                </Typography>
                <Typography variant="h6">
                  {Math.round(transporter.monthsActive)} months
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Reliability Metrics */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Reliability & Quality
            </Typography>
            <Divider sx={{ my: 1 }} />

            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">Document Completion</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {transporter.docCompletionRate.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={transporter.docCompletionRate}
                  color={
                    transporter.docCompletionRate >= 80
                      ? 'success'
                      : transporter.docCompletionRate >= 60
                      ? 'warning'
                      : 'error'
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">Cost Consistency</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {transporter.costConsistency.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={transporter.costConsistency}
                  color={transporter.costConsistency >= 70 ? 'success' : 'warning'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Days Since Last Order
                  </Typography>
                  <Typography
                    variant="h6"
                    color={
                      transporter.daysSinceLastOrder <= 7
                        ? 'success.main'
                        : transporter.daysSinceLastOrder <= 30
                        ? 'text.primary'
                        : 'error.main'
                    }
                  >
                    {Math.round(transporter.daysSinceLastOrder)}d
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    LR Completion Rate
                  </Typography>
                  <Typography variant="h6">
                    {transporter.lrCompletionRate.toFixed(0)}%
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            
            {/* Explanation */}
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.lighter', borderRadius: 1 }}>
              <Typography variant="caption" color="success.dark">
                ✅ <strong>What this means:</strong> Transporters with complete documentation (LR + invoices) 
                and consistent pricing are more reliable partners for your business.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Risk Flags */}
        {transporter.riskFlags && transporter.riskFlags.length > 0 && (
          <Card sx={{ bgcolor: 'warning.lighter' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom fontWeight={600} color="warning.main">
                ⚠️ Risk Flags
              </Typography>
              <Box sx={{ mt: 1 }}>
                {transporter.riskFlags.map((flag, index) => (
                  <Chip
                    key={index}
                    label={flag.replace(/_/g, ' ')}
                    size="small"
                    color="warning"
                    sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransporterDetailModal;
