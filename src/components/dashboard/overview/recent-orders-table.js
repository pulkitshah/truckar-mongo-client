import {
  Box,
  Card,
  CardHeader,
  Divider,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { SeverityPill } from "../../severity-pill";
import moment from "moment";
import PropTypes from "prop-types";

const statusMap = {
  pending: {
    color: "warning",
    label: "Pending",
  },
  complete: {
    color: "success",
    label: "Complete",
  },
  canceled: {
    color: "error",
    label: "Canceled",
  },
  rejected: {
    color: "error",
    label: "Rejected",
  },
};

export const RecentOrdersTable = ({ data, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader title="Recent Orders" />
        <Divider />
        <Box sx={{ p: 3 }}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton
              key={item}
              variant="rectangular"
              height={40}
              sx={{ mb: 1 }}
            />
          ))}
        </Box>
      </Card>
    );
  }

  const orders = data || [];

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader title="Recent Orders" />
        <Divider />
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            py: 4,
          }}
        >
          <Typography color="textSecondary" variant="body2">
            No recent orders
          </Typography>
        </Box>
      </Card>
    );
  }

  const formatCurrency = (value) => {
    if (!value && value !== 0) return "₹0";
    return `₹${(value / 100000).toFixed(2)}L`;
  };

  return (
    <Card>
      <CardHeader title="Recent Orders" />
      <Divider />
      <Box sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => {
              const status = statusMap[order.status] || statusMap.pending;

              return (
                <TableRow
                  key={order._id}
                  sx={{
                    "&:last-child td": {
                      border: 0,
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      #{order.orderNo}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {moment(order.saleDate).format("DD MMM YYYY")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.customerName || "N/A"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {order.vehicleNumber || "N/A"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(order.saleAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <SeverityPill color={status.color}>
                      {status.label}
                    </SeverityPill>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
};

RecentOrdersTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      orderNo: PropTypes.number,
      saleDate: PropTypes.string,
      customerName: PropTypes.string,
      vehicleNumber: PropTypes.string,
      saleAmount: PropTypes.number,
      status: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
};
