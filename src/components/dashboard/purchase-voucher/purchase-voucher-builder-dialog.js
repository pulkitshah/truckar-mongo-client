import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  TextField,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { dataFormatter, formatNumber } from "../../../utils/amount-calculation";

const formatCurrency = (value) => dataFormatter(Number(value) || 0, "currency");
const ORDER_RANGE_FULL = "full";
const ORDER_RANGE_FIRST = "first";
const ORDER_RANGE_SECOND = "second";
const ORDER_RANGE_CUSTOM = "custom";

const getOrderKey = (order) => order?.orderId || order?._id || order?.id || "";

const normalizeOrders = (orders = []) =>
  orders
    .map((order) => ({
      ...order,
      orderId: getOrderKey(order),
      payable: Number(order?.payable ?? order?.purchaseAmount ?? 0),
      purchaseDate: order?.purchaseDate ? new Date(order.purchaseDate) : null,
    }))
    .filter((order) => Boolean(order.orderId));

export const PurchaseVoucherBuilderDialog = ({
  open,
  onClose,
  onContinue,
  transporter,
  orders = [],
}) => {
  const normalizedOrders = useMemo(
    () => normalizeOrders(orders),
    [orders]
  );

  const defaultMonth = useMemo(() => {
    if (!normalizedOrders.length) {
      return moment().startOf("month").toDate();
    }
    const latestOrder = normalizedOrders.reduce((latest, order) => {
      if (!order.purchaseDate) {
        return latest;
      }
      if (!latest) {
        return order.purchaseDate;
      }
      return order.purchaseDate > latest ? order.purchaseDate : latest;
    }, null);
    const baseDate = latestOrder || new Date();
    return moment(baseDate).startOf("month").toDate();
  }, [normalizedOrders]);

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedRange, setSelectedRange] = useState(ORDER_RANGE_FULL);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  useEffect(() => {
    if (open) {
      setSelectedMonth(defaultMonth);
      setSelectedRange(ORDER_RANGE_FULL);
      setSelectedOrderIds([]);
    }
  }, [open, defaultMonth]);

  const ordersForMonth = useMemo(() => {
    if (!normalizedOrders.length) {
      return [];
    }

    return normalizedOrders.filter((order) => {
      if (!order.purchaseDate) {
        return false;
      }
      return moment(order.purchaseDate).isSame(selectedMonth, "month");
    });
  }, [normalizedOrders, selectedMonth]);

  const autoSelectionIds = useMemo(() => {
    if (!ordersForMonth.length) {
      return [];
    }

    if (selectedRange === ORDER_RANGE_FULL) {
      return ordersForMonth.map((order) => order.orderId);
    }

    if (selectedRange === ORDER_RANGE_FIRST) {
      return ordersForMonth
        .filter((order) => {
          if (!order.purchaseDate) {
            return false;
          }
          return moment(order.purchaseDate).date() <= 15;
        })
        .map((order) => order.orderId);
    }

    if (selectedRange === ORDER_RANGE_SECOND) {
      return ordersForMonth
        .filter((order) => {
          if (!order.purchaseDate) {
            return false;
          }
          return moment(order.purchaseDate).date() > 15;
        })
        .map((order) => order.orderId);
    }

    return [];
  }, [ordersForMonth, selectedRange]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (selectedRange === ORDER_RANGE_CUSTOM) {
      setSelectedOrderIds((prev) =>
        prev.filter((id) => ordersForMonth.some((order) => order.orderId === id))
      );
      return;
    }

    const areArraysEqual = (a, b) => {
      if (a.length !== b.length) {
        return false;
      }
      const setA = new Set(a);
      const setB = new Set(b);
      if (setA.size !== setB.size) {
        return false;
      }
      for (const value of setA) {
        if (!setB.has(value)) {
          return false;
        }
      }
      return true;
    };

    setSelectedOrderIds((prev) =>
      areArraysEqual(prev, autoSelectionIds) ? prev : autoSelectionIds
    );
  }, [autoSelectionIds, open, ordersForMonth, selectedRange]);

  const effectiveSelectedIds =
    selectedRange === ORDER_RANGE_CUSTOM ? selectedOrderIds : autoSelectionIds;

  const selectedOrders = useMemo(() => {
    if (!effectiveSelectedIds.length) {
      return [];
    }

    const idSet = new Set(effectiveSelectedIds);
    return ordersForMonth.filter((order) => idSet.has(order.orderId));
  }, [effectiveSelectedIds, ordersForMonth]);

  const totalAmount = useMemo(() => {
    return selectedOrders.reduce((sum, order) => sum + order.payable, 0);
  }, [selectedOrders]);

  const handleToggleOrder = (orderId) => {
    setSelectedRange(ORDER_RANGE_CUSTOM);
    setSelectedOrderIds((prev) => {
      const idSet = new Set(prev);
      if (idSet.has(orderId)) {
        idSet.delete(orderId);
      } else {
        idSet.add(orderId);
      }
      return Array.from(idSet);
    });
  };

  const handleContinue = () => {
    if (!selectedOrders.length) {
      return;
    }

    onContinue?.({
      orders: selectedOrders,
      period: selectedMonth,
      range: selectedRange,
    });
  };

  const monthLabel = useMemo(
    () => moment(selectedMonth).format("MMMM YYYY"),
    [selectedMonth]
  );

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={onClose}>
      <DialogTitle>Build voucher for transporter</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Transporter
            </Typography>
            <Typography variant="h6">
              {transporter?.name || "Select a transporter"}
            </Typography>
            {transporter?.city ? (
              <Typography color="text.secondary" variant="body2">
                {typeof transporter.city === "string"
                  ? transporter.city
                  : transporter.city?.description || transporter.city?.name || ""}
              </Typography>
            ) : null}
          </Box>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <DatePicker
                views={["year", "month"]}
                label="Voucher period"
                value={selectedMonth}
                onChange={(value) => value && setSelectedMonth(value)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <ToggleButtonGroup
                exclusive
                value={selectedRange}
                onChange={(event, newValue) => {
                  if (!newValue) {
                    return;
                  }
                  setSelectedRange(newValue);
                }}
                size="small"
              >
                <ToggleButton value={ORDER_RANGE_FULL}>Full month</ToggleButton>
                <ToggleButton value={ORDER_RANGE_FIRST}>1st – 15th</ToggleButton>
                <ToggleButton value={ORDER_RANGE_SECOND}>16th – end</ToggleButton>
                <ToggleButton value={ORDER_RANGE_CUSTOM}>Manual</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Purchases in {monthLabel}
            </Typography>
            {!ordersForMonth.length ? (
              <Box
                sx={{
                  alignItems: "center",
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: 160,
                  p: 3,
                }}
              >
                <Typography variant="body1">No purchases in this period.</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                  Try selecting a different month to continue.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Tooltip title="Toggle all">
                          <Checkbox
                            indeterminate={
                              effectiveSelectedIds.length > 0 &&
                              effectiveSelectedIds.length < ordersForMonth.length
                            }
                            checked={
                              ordersForMonth.length > 0 &&
                              effectiveSelectedIds.length === ordersForMonth.length
                            }
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedRange(ORDER_RANGE_CUSTOM);
                                setSelectedOrderIds(
                                  ordersForMonth.map((order) => order.orderId)
                                );
                              } else {
                                setSelectedRange(ORDER_RANGE_CUSTOM);
                                setSelectedOrderIds([]);
                              }
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>Order #</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Payable</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ordersForMonth.map((order) => {
                      const id = order.orderId;
                      const isSelected = effectiveSelectedIds.includes(id);
                      const dateLabel = moment(order.purchaseDate).isValid()
                        ? moment(order.purchaseDate).format("DD MMM YYYY")
                        : "-";
                      const normalizedStatus = (order.status || "").toLowerCase();

                      return (
                        <TableRow key={id} hover selected={isSelected}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleOrder(id)}
                            />
                          </TableCell>
                          <TableCell>{order.orderNo || "-"}</TableCell>
                          <TableCell>{dateLabel}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(order.payable)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {(normalizedStatus && normalizedStatus !== "pending"
                                ? normalizedStatus
                                : "pending"
                              ).toUpperCase()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>

          <Divider />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Selected orders
              </Typography>
              <Typography variant="h6">
                {formatNumber(selectedOrders.length)} order(s)
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total payable
              </Typography>
              <Typography variant="h6">
                {formatCurrency(totalAmount)}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Back</Button>
        <Button
          variant="contained"
          onClick={handleContinue}
          disabled={!selectedOrders.length}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

PurchaseVoucherBuilderDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onContinue: PropTypes.func,
  transporter: PropTypes.object,
  orders: PropTypes.arrayOf(PropTypes.object),
};
