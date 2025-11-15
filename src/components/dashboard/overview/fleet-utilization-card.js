import {
  Box,
  Card,
  CardContent,
  LinearProgress,
  Skeleton,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Truck as TruckIcon } from "../../../icons/truck";
import PropTypes from "prop-types";

export const FleetUtilizationCard = ({ data, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={40} sx={{ mt: 1 }} />
          <Skeleton variant="rectangular" height={8} sx={{ mt: 2 }} />
          <Skeleton variant="text" width="50%" sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    );
  }

  const metrics = data || {
    totalVehicles: 0,
    activeVehicles: 0,
    utilizationPercentage: 0,
  };

  const utilizationColor =
    metrics.utilizationPercentage >= 80
      ? "success"
      : metrics.utilizationPercentage >= 60
      ? "warning"
      : "error";

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography color="textSecondary" variant="overline">
              Fleet Utilization
            </Typography>
            <Box
              sx={{
                alignItems: "baseline",
                display: "flex",
                mt: 1,
              }}
            >
              <Typography variant="h4">
                {metrics.activeVehicles}/{metrics.totalVehicles}
              </Typography>
              <Typography color="textSecondary" sx={{ ml: 1 }} variant="body2">
                vehicles active
              </Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                value={metrics.utilizationPercentage}
                variant="determinate"
                color={utilizationColor}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  backgroundColor: (theme) =>
                    alpha(theme.palette[utilizationColor].main, 0.12),
                }}
              />
            </Box>
            <Typography
              color="textSecondary"
              variant="caption"
              sx={{ mt: 1, display: "block" }}
            >
              {metrics.utilizationPercentage.toFixed(1)}% utilization
            </Typography>
          </Box>
          <Box
            sx={{
              alignItems: "center",
              backgroundColor: (theme) =>
                alpha(theme.palette.primary.main, 0.08),
              borderRadius: 2,
              display: "flex",
              height: 56,
              justifyContent: "center",
              width: 56,
              ml: 2,
            }}
          >
            <TruckIcon
              sx={{
                color: "primary.main",
                fontSize: 32,
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

FleetUtilizationCard.propTypes = {
  data: PropTypes.shape({
    totalVehicles: PropTypes.number,
    activeVehicles: PropTypes.number,
    utilizationPercentage: PropTypes.number,
  }),
  loading: PropTypes.bool,
};
