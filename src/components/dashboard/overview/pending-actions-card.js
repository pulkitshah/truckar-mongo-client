import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ExclamationCircle as AlertCircleIcon } from "../../../icons/exclamation-circle";
import { DocumentText as FileTextIcon } from "../../../icons/document-text";
import { DocumentText } from "../../../icons/document-text";
import { CurrencyDollar as DollarSignIcon } from "../../../icons/currency-dollar";
import PropTypes from "prop-types";

const PendingActionItem = ({ icon: Icon, label, value, color = "warning" }) => {
  const formatCurrency = (val) => {
    if (!val && val !== 0) return "₹0";
    return `₹${(val / 100000).toFixed(2)}L`;
  };

  const displayValue =
    typeof value === "number" && label.includes("Outstanding")
      ? formatCurrency(value)
      : value;

  return (
    <ListItem
      sx={{
        px: 3,
        py: 1.5,
      }}
    >
      <Box
        sx={{
          alignItems: "center",
          backgroundColor: (theme) => alpha(theme.palette[color].main, 0.08),
          borderRadius: 1,
          display: "flex",
          height: 48,
          justifyContent: "center",
          width: 48,
          mr: 2,
        }}
      >
        <Icon
          sx={{
            color: `${color}.main`,
            fontSize: 24,
          }}
        />
      </Box>
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          variant: "body2",
          color: "textSecondary",
        }}
      />
      <Typography color="textPrimary" variant="h6" sx={{ fontWeight: 600 }}>
        {displayValue}
      </Typography>
    </ListItem>
  );
};

export const PendingActionsCard = ({ data, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader title="Pending Actions" />
        <Divider />
        <CardContent>
          <List disablePadding>
            {[1, 2, 3, 4].map((item) => (
              <Box key={item} sx={{ px: 3, py: 1.5 }}>
                <Skeleton variant="rectangular" height={48} />
              </Box>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  }

  const metrics = data || {
    pendingLRs: 0,
    uninvoicedDeliveries: 0,
    outstandingAmount: 0,
    pendingPayments: 0,
  };

  const hasActions =
    metrics.pendingLRs > 0 ||
    metrics.uninvoicedDeliveries > 0 ||
    metrics.outstandingAmount > 0 ||
    metrics.pendingPayments > 0;

  return (
    <Card>
      <CardHeader title="Pending Actions" />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        {!hasActions ? (
          <Box
            sx={{
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
              py: 4,
            }}
          >
            <Typography color="textSecondary" variant="body2">
              No pending actions
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {metrics.pendingLRs > 0 && (
              <PendingActionItem
                icon={FileTextIcon}
                label="Deliveries Pending LR"
                value={metrics.pendingLRs}
                color="warning"
              />
            )}
            {metrics.uninvoicedDeliveries > 0 && (
              <PendingActionItem
                icon={DocumentText}
                label="Uninvoiced Deliveries"
                value={metrics.uninvoicedDeliveries}
                color="error"
              />
            )}
            {metrics.outstandingAmount > 0 && (
              <PendingActionItem
                icon={DollarSignIcon}
                label="Outstanding Invoices"
                value={metrics.outstandingAmount}
                color="info"
              />
            )}
            {metrics.pendingPayments > 0 && (
              <PendingActionItem
                icon={AlertCircleIcon}
                label="Transporter Payments Due"
                value={metrics.pendingPayments}
                color="error"
              />
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

PendingActionsCard.propTypes = {
  data: PropTypes.shape({
    pendingLRs: PropTypes.number,
    uninvoicedDeliveries: PropTypes.number,
    outstandingAmount: PropTypes.number,
    pendingPayments: PropTypes.number,
  }),
  loading: PropTypes.bool,
};
