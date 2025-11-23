import PropTypes from "prop-types";
import { Chip } from "@mui/material";

const statusConfig = {
  pending: {
    label: "Pending",
    color: "warning",
  },
  done: {
    label: "Done",
    color: "success",
  },
};

export const PurchaseVoucherStatusChip = ({ status }) => {
  const config = statusConfig[status] || statusConfig.pending;
  return <Chip color={config.color} label={config.label} size="small" />;
};

PurchaseVoucherStatusChip.propTypes = {
  status: PropTypes.string,
};
