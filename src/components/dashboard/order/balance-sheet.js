import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useAuth } from "../../../hooks/use-auth";
import { orderApi } from "../../../api/order-api";
import { dataFormatter, formatNumber } from "../../../utils/amount-calculation";

const SummaryTile = ({ title, value, helper }) => (
  <Card>
    <CardContent>
      <Typography color="text.secondary" variant="subtitle2">
        {title}
      </Typography>
      <Typography sx={{ mt: 1 }} variant="h5">
        {value}
      </Typography>
      {helper ? (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          {helper}
        </Typography>
      ) : null}
    </CardContent>
  </Card>
);

const formatCurrency = (amount) => {
  const value = Number.isFinite(amount) ? amount : 0;
  return dataFormatter(value, "currency");
};

const renderPartyCell = (party) => (
  <Box>
    <Typography variant="subtitle2">{party.name}</Typography>
    {party.city ? (
      <Typography color="text.secondary" variant="body2">
        {party.city}
      </Typography>
    ) : null}
    {party.mobile ? (
      <Typography color="text.secondary" variant="body2">
        {party.mobile}
      </Typography>
    ) : null}
  </Box>
);

const BalanceSheet = () => {
  const { account } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });

  const formatAmountWithCount = (amount, count) => {
    const formattedAmount = formatCurrency(amount);
    if (!count) {
      return formattedAmount;
    }
    return `${formattedAmount} (${formatNumber(count)})`;
  };

  useEffect(() => {
    if (!account?._id) {
      return;
    }

    let isMounted = true;
    setState({ loading: true, error: null, data: null });

    const fetchData = async () => {
      try {
        const response = await orderApi.getBalanceSheet({
          account: account._id,
        });

        if (!isMounted) {
          return;
        }

        if (response.error) {
          setState({ loading: false, error: response.error, data: null });
          return;
        }

        setState({ loading: false, error: null, data: response.data });
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setState({
          loading: false,
          error:
            err?.message ||
            "Something went wrong while loading balance sheet data.",
          data: null,
        });
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [account?._id]);

  if (state.loading) {
    return (
      <Box
        sx={{
          alignItems: "center",
          display: "flex",
          height: "100%",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (state.error) {
    return <Alert severity="error">{state.error}</Alert>;
  }

  const totals = state.data?.totals || {};
  const receivables = state.data?.receivables || [];
  const payables = state.data?.payables || [];
  const pendingVoucherHelper = formatCurrency(
    totals.totalPendingVoucherAmount || 0
  );

  return (
    <Box sx={{ height: "100%", overflow: "auto", pr: 1 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryTile
            title="Total Receivable"
            value={formatCurrency(totals.totalReceivable || 0)}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryTile
            title="Total Payable"
            value={formatCurrency(totals.totalPayable || 0)}
            helper={`Pending vouchers: ${pendingVoucherHelper}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryTile
            title="Net Outstanding"
            value={formatCurrency(totals.netOutstanding || 0)}
            helper="Receivable - Payable"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryTile
            title="Pending Items"
            value={`${formatNumber(
              totals.totalPendingDeliveries || 0
            )} / ${formatNumber(
              totals.totalPendingPurchaseOrders || 0
            )} / ${formatNumber(totals.totalPendingPurchaseVouchers || 0)}`}
            helper="Deliveries / Purchase Orders / Pending Vouchers"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: "100%" }}>
            <CardHeader
              title="Receivables"
              subheader="Customers with pending deliveries"
            />
            <Divider />
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Pending Deliveries</TableCell>
                    <TableCell align="right">Sale Amount</TableCell>
                    <TableCell align="right">Advance</TableCell>
                    <TableCell align="right">Receivable</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receivables.length === 0 ? (
                    <TableRow>
                      <TableCell align="center" colSpan={6}>
                        <Typography color="text.secondary" variant="body2">
                          All caught up! No pending receivables.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    receivables.map((party) => (
                      <TableRow key={party.partyId} hover>
                        <TableCell>{renderPartyCell(party)}</TableCell>
                        <TableCell align="right">{party.ordersCount}</TableCell>
                        <TableCell align="right">
                          {party.pendingDeliveries}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(party.totalSaleAmount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(party.saleAdvance)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(party.receivable)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: "100%" }}>
            <CardHeader
              title="Payables"
              subheader="Transporters with pending purchase orders"
            />
            <Divider />
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Transporter</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Pending Purchase</TableCell>
                    <TableCell align="right">Purchase Amount</TableCell>
                    <TableCell align="right">Advance</TableCell>
                    <TableCell align="right">Voucher Paid</TableCell>
                    <TableCell align="right">Pending Vouchers</TableCell>
                    <TableCell align="right">Payable</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payables.length === 0 ? (
                    <TableRow>
                      <TableCell align="center" colSpan={8}>
                        <Typography color="text.secondary" variant="body2">
                          No outstanding payables.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payables.map((party) => (
                      <TableRow key={party.partyId} hover>
                        <TableCell>{renderPartyCell(party)}</TableCell>
                        <TableCell align="right">{party.ordersCount}</TableCell>
                        <TableCell align="right">
                          {party.pendingPurchaseOrders}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(party.totalPurchaseAmount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(party.purchaseAdvance)}
                        </TableCell>
                        <TableCell align="right">
                          {formatAmountWithCount(
                            party.voucherDoneAmount,
                            party.voucherDoneCount
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {formatAmountWithCount(
                            party.voucherPendingAmount,
                            party.voucherPendingCount
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(party.payable)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BalanceSheet;
