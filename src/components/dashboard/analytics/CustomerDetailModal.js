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
import { Close as CloseIcon, TrendingUp, TrendingDown } from '@mui/icons-material';

const CustomerDetailModal = ({ open, onClose, customer }) => {
  if (!customer) return null;

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

  const getRecencyStatusColor = (status) => {
    const colors = {
      active: 'success',
      recent: 'info',
      dormant: 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">{customer.customerName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {customer.customerCity?.description || customer.customerCity || 'Location not specified'}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              label={`${getTierIcon(customer.scoreTier)} ${customer.scoreTier}`}
              color={getTierColor(customer.scoreTier)}
              sx={{ textTransform: 'capitalize', fontWeight: 600 }}
            />
            <Chip
              label={customer.recencyStatus}
              color={getRecencyStatusColor(customer.recencyStatus)}
              size="small"
              sx={{ textTransform: 'capitalize' }}
            />
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Health Score Breakdown */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Customer Health Score: {customer.healthScore}/100
            </Typography>
            <LinearProgress
              variant="determinate"
              value={customer.healthScore}
              sx={{ height: 10, borderRadius: 5, mb: 2 }}
              color={
                customer.healthScore >= 75
                  ? 'success'
                  : customer.healthScore >= 40
                  ? 'warning'
                  : 'error'
              }
            />

            <Grid container spacing={2}>
              <Grid item xs={6} sm={2.4}>
                <Typography variant="caption" color="text.secondary">
                  Frequency (30%)
                </Typography>
                <Typography variant="h6">
                  {customer.scoreBreakdown.frequencyScore}/30
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {customer.orderCount} orders
                </Typography>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Typography variant="caption" color="text.secondary">
                  Profit (25%)
                </Typography>
                <Typography variant="h6">
                  {customer.scoreBreakdown.profitabilityScore}/25
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {formatCurrency(customer.totalProfit)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Typography variant="caption" color="text.secondary">
                  Growth (20%)
                </Typography>
                <Typography variant="h6">
                  {customer.scoreBreakdown.growthScore}/20
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {customer.orderGrowth >= 0 ? '+' : ''}{customer.orderGrowth}%
                </Typography>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Typography variant="caption" color="text.secondary">
                  Recency (15%)
                </Typography>
                <Typography variant="h6">
                  {customer.scoreBreakdown.recencyScore}/15
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {Math.round(customer.daysSinceLastOrder)}d ago
                </Typography>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Typography variant="caption" color="text.secondary">
                  Payment (10%)
                </Typography>
                <Typography variant="h6">
                  {customer.scoreBreakdown.paymentScore}/10
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {customer.totalOutstanding > 0 ? formatCurrency(customer.totalOutstanding) + ' due' : 'All clear'}
                </Typography>
              </Grid>
            </Grid>
            
            {/* Explanation */}
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Typography variant="caption" color="info.dark">
                💡 <strong>How it works:</strong> Champion customers order frequently, generate good profit, 
                and pay on time. Growing customers show positive trends. At-risk customers need attention.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Business Performance
            </Typography>
            <Divider sx={{ my: 1 }} />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Orders
                </Typography>
                <Typography variant="h6">{customer.orderCount}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Order Growth
                </Typography>
                <Box display="flex" alignItems="center" gap={0.5}>
                  {customer.orderGrowth >= 0 ? (
                    <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
                  ) : (
                    <TrendingDown sx={{ color: 'error.main', fontSize: 20 }} />
                  )}
                  <Typography
                    variant="h6"
                    color={customer.orderGrowth >= 0 ? 'success.main' : 'error.main'}
                  >
                    {customer.orderGrowth >= 0 ? '+' : ''}
                    {customer.orderGrowth}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Days Since Last Order
                </Typography>
                <Typography
                  variant="h6"
                  color={
                    customer.daysSinceLastOrder <= 7
                      ? 'success.main'
                      : customer.daysSinceLastOrder <= 30
                      ? 'text.primary'
                      : 'error.main'
                  }
                >
                  {Math.round(customer.daysSinceLastOrder)}d
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Profit
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(customer.totalProfit)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Avg Profit/Order
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(customer.averageProfitPerOrder)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Profit Margin
                </Typography>
                <Typography
                  variant="h6"
                  color={customer.profitMargin >= 15 ? 'success.main' : 'text.primary'}
                >
                  {customer.profitMargin.toFixed(1)}%
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Payment Behavior */}
        {customer.totalOutstanding > 0 && (
          <Card sx={{ mb: 3, bgcolor: 'warning.lighter' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom fontWeight={600} color="warning.dark">
                💳 Payment Status
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Outstanding Amount
                  </Typography>
                  <Typography variant="h6" color="warning.dark">
                    {formatCurrency(customer.totalOutstanding)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Unpaid Invoices
                  </Typography>
                  <Typography variant="h6" color="warning.dark">
                    {customer.outstandingInvoiceCount}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Risk Flags */}
        {customer.riskFlags && customer.riskFlags.length > 0 && (
          <Card sx={{ bgcolor: 'error.lighter' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom fontWeight={600} color="error.main">
                ⚠️ Risk Flags
              </Typography>
              <Box sx={{ mt: 1 }}>
                {customer.riskFlags.map((flag, index) => (
                  <Chip
                    key={index}
                    label={flag.replace(/_/g, ' ')}
                    size="small"
                    color="error"
                    sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }}
                  />
                ))}
              </Box>
              
              {/* Recommendations */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="caption" fontWeight={600}>
                  Recommended Actions:
                </Typography>
                <Box component="ul" sx={{ mt: 0.5, pl: 2, mb: 0 }}>
                  {customer.riskFlags.includes('declining_orders') && (
                    <Typography component="li" variant="caption">
                      Review recent communication and engagement strategy
                    </Typography>
                  )}
                  {customer.riskFlags.includes('late_payments') && (
                    <Typography component="li" variant="caption">
                      Follow up on outstanding invoices and review payment terms
                    </Typography>
                  )}
                  {customer.riskFlags.includes('low_margin') && (
                    <Typography component="li" variant="caption">
                      Analyze cost structure and consider pricing adjustments
                    </Typography>
                  )}
                  {customer.riskFlags.includes('inactive') && (
                    <Typography component="li" variant="caption">
                      Reach out to re-engage this customer
                    </Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailModal;
