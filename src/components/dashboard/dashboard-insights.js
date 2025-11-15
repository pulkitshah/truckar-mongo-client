import { Card, CardContent, CardHeader, Box, Typography, Chip, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import PropTypes from 'prop-types';

const getInsightIcon = (type) => {
  switch (type) {
    case 'positive':
      return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
    case 'negative':
      return <TrendingDownIcon sx={{ color: 'error.main', fontSize: 20 }} />;
    case 'warning':
      return <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
    case 'improvement':
      return <TrendingUpIcon sx={{ color: 'info.main', fontSize: 20 }} />;
    default:
      return <InfoIcon sx={{ color: 'text.secondary', fontSize: 20 }} />;
  }
};

const getInsightColor = (type) => {
  switch (type) {
    case 'positive':
      return 'success';
    case 'negative':
      return 'error';
    case 'warning':
      return 'warning';
    case 'improvement':
      return 'info';
    default:
      return 'default';
  }
};

export const DashboardInsights = ({ insights = [], loading = false }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader title="Key Insights" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={40} />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card>
        <CardHeader title="Key Insights" />
        <CardContent>
          <Typography color="text.secondary" variant="body2">
            No insights available for the selected period.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Key Insights"
        subheader="AI-generated observations from your data"
      />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {insights.map((insight, index) => (
            <Box
              key={`insight-${index}-${insight.type}`}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'background.default',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ mt: 0.25 }}>{getInsightIcon(insight.type)}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {insight.message}
                </Typography>
                {insight.action && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                  >
                    → {insight.action}
                  </Typography>
                )}
              </Box>
              {insight.value && (
                <Chip
                  label={insight.value}
                  size="small"
                  color={getInsightColor(insight.type)}
                  variant="outlined"
                />
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

DashboardInsights.propTypes = {
  insights: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      message: PropTypes.string,
      action: PropTypes.string,
      value: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
};
