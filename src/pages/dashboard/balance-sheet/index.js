import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import moment from "moment";
import { toast } from "react-hot-toast";
import { orderApi } from "../../../api/order-api";
import { invoiceApi } from "../../../api/invoice-api";
import { purchaseVoucherApi } from "../../../api/purchase-voucher-api";
import { AuthGuard } from "../../../components/authentication/auth-guard";
import { OnBoardingGuard } from "../../../components/authentication/onboarding-guard";
import { DashboardLayout } from "../../../components/dashboard/dashboard-layout";
import { PurchaseVoucherDialog } from "../../../components/dashboard/purchase-voucher/purchase-voucher-dialog";
import { PurchaseVoucherStatusChip } from "../../../components/dashboard/purchase-voucher/purchase-voucher-status-chip";
import { PurchaseVoucherPdf } from "../../../components/dashboard/purchase-voucher/purchase-voucher-pdf";
import { PurchaseVoucherBuilderDialog } from "../../../components/dashboard/purchase-voucher/purchase-voucher-builder-dialog";
import { useAuth } from "../../../hooks/use-auth";
import { useMounted } from "../../../hooks/use-mounted";
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

const formatCurrency = (value) => dataFormatter(Number(value) || 0, "currency");
const formatNumberSafe = (value) => formatNumber(Number(value) || 0);
const capitalize = (value) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
const normalizeStatus = (status) => String(status || "").toLowerCase();
const DONE_STATUSES = new Set(["done", "paid", "complete", "completed", "received"]);
const isStatusDone = (status) => DONE_STATUSES.has(normalizeStatus(status));
const getPartyId = (party) => {
  if (!party) {
    return null;
  }
  if (typeof party === "string") {
    return party;
  }
  if (typeof party === "object") {
    return party._id || party.id || null;
  }
  return null;
};
const getTransporterId = (transporter) => {
  if (!transporter) {
    return null;
  }
  if (typeof transporter === "string") {
    return transporter;
  }
  if (typeof transporter === "object") {
    return transporter.value || transporter._id || transporter.id || null;
  }
  return null;
};
const getOrganisationId = (organisation) => {
  if (!organisation) {
    return null;
  }
  if (typeof organisation === "string") {
    return organisation;
  }
  if (typeof organisation === "object") {
    return organisation.value || organisation._id || organisation.id || null;
  }
  return null;
};
const toMonthStartUtc = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
};
const getOrderOrganisation = (order = {}) => {
  if (order?.organisation && typeof order.organisation === "object") {
    return order.organisation;
  }
  if (
    order?.vehicle?.organisation &&
    typeof order.vehicle.organisation === "object"
  ) {
    return order.vehicle.organisation;
  }
  return null;
};
const getOrderVehicleNumber = (order = {}) => {
  if (!order) {
    return null;
  }
  if (order.vehicleNumber) {
    return order.vehicleNumber;
  }
  const vehicle = order.vehicle || {};
  return (
    vehicle.registrationNumber ||
    vehicle.licensePlate ||
    vehicle.number ||
    vehicle.name ||
    vehicle.code ||
    null
  );
};
const getOrderQuantity = (order = {}) => {
  if (!order) {
    return null;
  }

  if (Array.isArray(order.deliveries) && order.deliveries.length > 0) {
    const total = order.deliveries.reduce((sum, delivery) => {
      const quantity = Number(delivery?.billQuantity || 0);
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);
    if (total) {
      return total;
    }
  }

  const fallback =
    order.quantity ??
    order.purchaseQuantity ??
    order.saleQuantity ??
    order.totalQuantity ??
    order.dispatchQuantity ??
    null;

  if (fallback === null || fallback === undefined) {
    return null;
  }

  const parsed = Number(fallback);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeLinkedOrdersForPdf = (orders = []) => {
  if (!Array.isArray(orders)) {
    return [];
  }

  return orders.map((order) => {
    const quantityValue = getOrderQuantity(order);
    const quantity =
      quantityValue === null || quantityValue === undefined
        ? null
        : Number(quantityValue);
    const safeQuantity = Number.isFinite(quantity) ? quantity : null;

    const payableAmount = Number(order.payable ?? order.purchaseAmount ?? order.payableAmount ?? 0);
    const purchaseAmount = Number(order.purchaseAmount ?? order.payable ?? order.purchaseAmountRaw ?? 0);

    return {
      ...order,
      quantity: safeQuantity,
      purchaseQuantity: safeQuantity,
      saleQuantity: safeQuantity,
      totalQuantity: safeQuantity,
      payable: Number.isFinite(payableAmount) ? payableAmount : 0,
      purchaseAmount: Number.isFinite(purchaseAmount) ? purchaseAmount : 0,
      vehicleNumber: order.vehicleNumber || getOrderVehicleNumber(order),
      organisation: getOrderOrganisation(order) || order.organisation || null,
    };
  });
};
const renderPartyCell = (party = {}) => (
  <Box>
    <Typography variant="subtitle2">{party.name || "Unknown"}</Typography>
    {party.city ? (
      <Typography color="text.secondary" variant="body2">
        {typeof party.city === "string"
          ? party.city
          : party.city?.name || party.city?.description || ""}
      </Typography>
    ) : null}
    {party.mobile ? (
      <Typography color="text.secondary" variant="body2">
        {party.mobile}
      </Typography>
    ) : null}
  </Box>
);
const groupItemsByMonth = (items, getDate) => {
  const groups = new Map();
  items.forEach((item) => {
    const rawDate = getDate(item);
    const date = rawDate ? moment(rawDate) : null;
    const key = date && date.isValid() ? date.format("YYYY-MM") : "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label:
          key === "unknown"
            ? "No date"
            : date.startOf("month").format("MMMM YYYY"),
        items: [],
      });
    }
    groups.get(key).items.push(item);
  });
  return Array.from(groups.values());
};
const enrichVoucher = (voucher) => ({
  ...voucher,
  amount: Number(voucher.amount) || 0,
  transporter: voucher.transporter || {},
  period: voucher.period || null,
  voucherDate: voucher.voucherDate || null,
  paymentDate: voucher.paymentDate || null,
  status: voucher.status || "pending",
  reference: voucher.reference || "",
  notes: voucher.notes || "",
});

const getVoucherDisplayId = (voucher = {}) => {
  const rawId =
    voucher.code ||
    voucher.voucherNumber ||
    voucher.referenceNumber ||
    voucher.serialNumber ||
    voucher._id ||
    voucher.id;

  if (!rawId) {
    return "-";
  }

  const value = String(rawId).trim();
  if (value.length <= 10) {
    return value;
  }

  return `${value.slice(0, 4)}…${value.slice(-4)}`;
};

const buildVoucherFileName = (voucher = {}, transporterName = "") => {
  const namePart = String(transporterName || "transporter")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const baseDate = voucher.period || voucher.voucherDate || new Date();
  const monthPart = moment(baseDate).isValid()
    ? moment(baseDate).format("MMM-YYYY").toLowerCase()
    : "period";

  const safeName = namePart || "transporter";
  return `${safeName}_${monthPart}_purchase_voucher.pdf`;
};

const sectionContainerSx = {
  mb: 3,
  p: { xs: 2.5, md: 3 },
  borderRadius: 3,
  boxShadow: 0,
  border: "1px solid",
  borderColor: "divider",
  backgroundColor: "background.paper",
};

const BalanceSheetPage = () => {
  const router = useRouter();
  const { account } = useAuth();
  const isMounted = useMounted();
  const accountId = account?._id;

  const [currentTab, setCurrentTab] = useState("summary");
  const [balanceState, setBalanceState] = useState({
    loading: true,
    error: null,
    data: null,
  });
  const [voucherState, setVoucherState] = useState({
    loading: true,
    error: null,
    data: [],
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [selectedTransporterId, setSelectedTransporterId] = useState("all");
  const [updatingOrders, setUpdatingOrders] = useState([]);
  const [updatingInvoices, setUpdatingInvoices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [isSavingVoucher, setIsSavingVoucher] = useState(false);
  const [dialogInitialValues, setDialogInitialValues] = useState(null);
  const [voucherMeta, setVoucherMeta] = useState({});
  const [voucherBuilderState, setVoucherBuilderState] = useState({
    open: false,
    transporter: null,
    orders: [],
  });
  const [voucherPreviewState, setVoucherPreviewState] = useState({
    open: false,
    voucher: null,
    orders: [],
    organisation: null,
  });

  const isClient = typeof window !== "undefined";

  const tabs = useMemo(
    () => [
      { label: "Summary", value: "summary" },
      { label: "Receivables", value: "receivables" },
      { label: "Payables", value: "payables" },
    ],
    []
  );

  const isOrderUpdating = useCallback(
    (orderId) => updatingOrders.includes(orderId),
    [updatingOrders]
  );

  const isInvoiceUpdating = useCallback(
    (invoiceId) => updatingInvoices.includes(invoiceId),
    [updatingInvoices]
  );

  const fetchBalance = useCallback(async () => {
    if (!accountId) {
      setBalanceState((prev) => {
        if (prev.loading === false) {
          return prev;
        }
        return { ...prev, loading: false };
      });
      return;
    }

    setBalanceState((prev) => {
      if (prev.loading === true && prev.error === null) {
        return prev;
      }
      return { ...prev, loading: true, error: null };
    });

    try {
      const response = await orderApi.getBalanceSheet({ account: accountId });

      if (!isMounted()) {
        return;
      }

      if (response.error) {
        setBalanceState((prev) => {
          if (prev.error === response.error && prev.loading === false) {
            return prev;
          }
          return { loading: false, error: response.error, data: null };
        });
        return;
      }

      setBalanceState((prev) => {
        if (prev.loading === false && prev.error === null && prev.data === response.data) {
          return prev;
        }
        return { loading: false, error: null, data: response.data };
      });
    } catch (error) {
      if (!isMounted()) {
        return;
      }
      setBalanceState((prev) => {
        const errorMessage =
          error?.message || "Failed to load balance sheet. Please try again.";
        if (prev.loading === false && prev.error === errorMessage) {
          return prev;
        }
        return {
          loading: false,
          error: errorMessage,
          data: null,
        };
      });
    }
  }, [accountId, isMounted]);

  const fetchVouchers = useCallback(async () => {
    if (!accountId) {
      setVoucherState((prev) => {
        if (prev.loading === false) {
          return prev;
        }
        return { ...prev, loading: false };
      });
      return;
    }

    setVoucherState((prev) => {
      if (prev.loading === true && prev.error === null) {
        return prev;
      }
      return { ...prev, loading: true, error: null };
    });

    try {
      const response = await purchaseVoucherApi.getPurchaseVouchers({
        account: accountId,
      });

      if (!isMounted()) {
        return;
      }

      if (response.error) {
        setVoucherState((prev) => {
          if (prev.loading === false && prev.error === response.error) {
            return prev;
          }
          return { loading: false, error: response.error, data: [] };
        });
        return;
      }

      setVoucherState((prev) => {
        const normalizedData = Array.isArray(response.data)
          ? response.data
          : [];
        if (
          prev.loading === false &&
          prev.error === null &&
          prev.data === normalizedData
        ) {
          return prev;
        }
        return {
          loading: false,
          error: null,
          data: normalizedData,
        };
      });
    } catch (error) {
      if (!isMounted()) {
        return;
      }
      setVoucherState((prev) => {
        const errorMessage =
          error?.message || "Failed to load vouchers. Please try again.";
        if (prev.loading === false && prev.error === errorMessage) {
          return prev;
        }
        return {
          loading: false,
          error: errorMessage,
          data: [],
        };
      });
    }
  }, [accountId, isMounted]);

  useEffect(() => {
    fetchBalance();
    fetchVouchers();
  }, [fetchBalance, fetchVouchers]);

  const balanceData = balanceState.data || {};
  const totals = balanceData.totals || {};
  const receivables = balanceData.receivables || [];
  const payables = balanceData.payables || [];
  const ordersWithoutInvoice = balanceData.ordersWithoutInvoice || [];
  const invoices = balanceData.invoices || [];
  const payableOrders = balanceData.payableOrders || [];

  const vouchers = useMemo(() => {
    if (!Array.isArray(voucherState.data)) {
      return [];
    }

    return voucherState.data
      .map((voucher) => enrichVoucher(voucher))
      .sort((a, b) => {
        const aDate = new Date(a.voucherDate || a.period || 0).getTime();
        const bDate = new Date(b.voucherDate || b.period || 0).getTime();
        return bDate - aDate;
      });
  }, [voucherState.data]);

  const filteredVouchers = useMemo(() => {
    if (selectedTransporterId === "all") {
      return vouchers;
    }

    return vouchers.filter(
      (voucher) => getPartyId(voucher.transporter) === selectedTransporterId
    );
  }, [selectedTransporterId, vouchers]);

  const voucherAggregates = useMemo(() => {
    const totalAmount = filteredVouchers.reduce(
      (sum, voucher) => sum + (Number(voucher.amount) || 0),
      0
    );

    const latestVoucherDate = filteredVouchers.reduce((latest, voucher) => {
      const current = new Date(
        voucher.voucherDate || voucher.paymentDate || voucher.period || 0
      ).getTime();
      return current > latest ? current : latest;
    }, 0);

    return {
      totalAmount,
      count: filteredVouchers.length,
      latestDate: latestVoucherDate ? new Date(latestVoucherDate) : null,
    };
  }, [filteredVouchers]);

  const totalVoucherAmount = vouchers.reduce(
    (sum, voucher) => sum + (Number(voucher.amount) || 0),
    0
  );
  const totalVoucherCount = vouchers.length;
  const voucherVolumeSummary = `${formatCurrency(
    totalVoucherAmount
  )} (${formatNumberSafe(totalVoucherCount)})`;

  const latestVoucherDateLabel = voucherAggregates.latestDate
    ? moment(voucherAggregates.latestDate).format("DD MMM YYYY")
    : "-";

  const receivablePartyOptions = useMemo(
    () =>
      receivables.map((party) => ({
        id: party.partyId,
        name: party.name,
        city: party.city,
      })),
    [receivables]
  );

  const payablePartyOptions = useMemo(
    () =>
      payables.map((party) => ({
        id: party.partyId,
        name: party.name,
        city: party.city,
      })),
    [payables]
  );

  const summaryOutstandingInvoiceCount = invoices.filter(
    (invoice) => normalizeStatus(invoice.paymentStatus) !== "paid"
  ).length;

  const filteredOrdersWithoutInvoice = useMemo(() => {
    if (selectedCustomerId === "all") {
      return ordersWithoutInvoice;
    }
    return ordersWithoutInvoice.filter(
      (order) => getPartyId(order.customer) === selectedCustomerId
    );
  }, [ordersWithoutInvoice, selectedCustomerId]);

  const filteredPendingInvoices = useMemo(() => {
    const pending = invoices.filter(
      (invoice) => normalizeStatus(invoice.paymentStatus) !== "paid"
    );
    if (selectedCustomerId === "all") {
      return pending;
    }
    return pending.filter(
      (invoice) => getPartyId(invoice.customer) === selectedCustomerId
    );
  }, [invoices, selectedCustomerId]);

  const filteredPaidInvoices = useMemo(() => {
    const paid = invoices.filter(
      (invoice) => normalizeStatus(invoice.paymentStatus) === "paid"
    );
    if (selectedCustomerId === "all") {
      return paid;
    }
    return paid.filter(
      (invoice) => getPartyId(invoice.customer) === selectedCustomerId
    );
  }, [invoices, selectedCustomerId]);

  const totalPendingPayableOrders = useMemo(() => {
    let count = 0;
    for (const order of payableOrders) {
      if (!isStatusDone(order.status)) {
        count += 1;
      }
    }
    return count;
  }, [payableOrders]);

  const selectedTransporterOrders = useMemo(() => {
    if (selectedTransporterId === "all") {
      return payableOrders;
    }
    return payableOrders.filter(
      (order) => getPartyId(order.transporter) === selectedTransporterId
    );
  }, [payableOrders, selectedTransporterId]);

  const pendingTransporterOrders = useMemo(
    () => selectedTransporterOrders.filter((order) => !isStatusDone(order.status)),
    [selectedTransporterOrders]
  );

  const payableAggregates = useMemo(() => {
    const stats = {
      pendingAmount: 0,
      pendingCount: 0,
      doneAmount: 0,
      doneCount: 0,
      totalAmount: 0,
    };

    for (const order of selectedTransporterOrders) {
      const amount = Number(order.payable || order.purchaseAmount || 0) || 0;
      stats.totalAmount += amount;
      if (isStatusDone(order.status)) {
        stats.doneAmount += amount;
        stats.doneCount += 1;
      } else {
        stats.pendingAmount += amount;
        stats.pendingCount += 1;
      }
    }

    return stats;
  }, [selectedTransporterOrders]);

  const currentTransporter = useMemo(() => {
    if (selectedTransporterId === "all") {
      return null;
    }

    const withTransporter = selectedTransporterOrders.find((order) => order.transporter);
    return withTransporter ? withTransporter.transporter : null;
  }, [selectedTransporterId, selectedTransporterOrders]);

  const filteredInvoiceAggregates = useMemo(() => {
    const pendingAmount = filteredPendingInvoices.reduce(
      (sum, invoice) => sum + (Number(invoice.outstandingAmount) || 0),
      0
    );
    const totalAmount = [...filteredPendingInvoices, ...filteredPaidInvoices].reduce(
      (sum, invoice) => sum + (Number(invoice.totalAmount) || 0),
      0
    );
    const count = filteredPendingInvoices.length + filteredPaidInvoices.length;

    return {
      outstandingAmount: pendingAmount,
      outstandingCount: filteredPendingInvoices.length,
      totalAmount,
      paidCount: filteredPaidInvoices.length,
      count,
      averageAmount: count ? totalAmount / count : 0,
    };
  }, [filteredPendingInvoices, filteredPaidInvoices]);

  const totalPendingReceivableOrders = ordersWithoutInvoice.length;

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVoucher(null);
    setDialogInitialValues(null);
  };

  const settleOrdersForVoucher = useCallback(async (orders, paymentDate) => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return;
    }

    try {
      await Promise.all(
        orders
          .map((order) => order.orderId)
          .filter(Boolean)
          .map((orderId) =>
            orderApi.updateOrderStatus({
              _id: orderId,
              purchasePaymentStatus: "done",
              purchasePaymentDate: paymentDate,
            })
          )
      );
    } catch (error) {
      console.error("[BalanceSheet] Failed to update purchase payment status", error);
    }
  }, []);

  const handleCreateVoucher = useCallback(
    async (values) => {
      if (!accountId) {
        toast.error("Account missing. Please refresh and try again.");
        return false;
      }

      setIsSavingVoucher(true);

      try {
        const organisationId = getOrganisationId(values.organisation);
        const periodDate = toMonthStartUtc(values.period);
        if (!periodDate) {
          toast.error("Select a valid month for the voucher.");
          return false;
        }
        const payload = {
          account: accountId,
          transporter: getTransporterId(values.transporter),
          amount: Number(values.amount) || 0,
          period: periodDate,
          voucherDate: values.voucherDate,
          status: "done",
          paymentDate: values.paymentDate || new Date(),
          reference: values.reference,
          notes: values.notes,
        };

        if (organisationId) {
          payload.organisation = organisationId;
        }

        const response = await purchaseVoucherApi.createPurchaseVoucher(
          payload
        );

        if (response.error) {
          toast.error(response.error);
          return false;
        }

        if (response.data?._id) {
          setVoucherMeta((prev) => ({
            ...prev,
            [response.data._id]: {
              linkedOrders: (values.linkedOrders || []).map((order) => ({
                ...order,
                payable: Number(order.payable ?? order.payableAmount ?? order.purchaseAmount ?? 0),
                purchaseAmount: Number(order.purchaseAmount ?? order.payable ?? 0),
                quantity:
                  order.quantity ??
                  order.purchaseQuantity ??
                  order.saleQuantity ??
                  order.totalQuantity ??
                  order.dispatchQuantity ??
                  null,
              })),
              transporter: values.transporter || null,
              organisation: values.organisation || null,
            },
          }));
        }

        toast.success("Entry added.");
        await settleOrdersForVoucher(values.linkedOrders, payload.paymentDate);
        await Promise.all([fetchBalance(), fetchVouchers()]);
        return true;
      } catch (error) {
        toast.error(error?.message || "Failed to add entry.");
        return false;
      } finally {
        setIsSavingVoucher(false);
      }
    },
    [accountId, fetchBalance, fetchVouchers, settleOrdersForVoucher]
  );

  const handleUpdateVoucher = useCallback(
    async (id, values, successMessage = "Entry updated.") => {
      if (!id) {
        return null;
      }

      setIsSavingVoucher(true);

      try {
        const organisationId = getOrganisationId(values.organisation);
        const periodDate = toMonthStartUtc(values.period);
        if (!periodDate) {
          toast.error("Select a valid month for the voucher.");
          return null;
        }
        const payload = {
          transporter: getTransporterId(values.transporter),
          amount: Number(values.amount) || 0,
          period: periodDate,
          voucherDate: values.voucherDate,
          status: "done",
          paymentDate: values.paymentDate || new Date(),
          reference: values.reference,
          notes: values.notes,
        };

        if (organisationId) {
          payload.organisation = organisationId;
        }

        const response = await purchaseVoucherApi.updatePurchaseVoucher(
          id,
          payload
        );

        if (response.error) {
          toast.error(response.error);
          return null;
        }

        setVoucherMeta((prev) => ({
          ...prev,
          [id]: {
            linkedOrders: (values.linkedOrders || prev[id]?.linkedOrders || []).map((order) => ({
              ...order,
              payable: Number(order.payable ?? order.payableAmount ?? order.purchaseAmount ?? 0),
              purchaseAmount: Number(order.purchaseAmount ?? order.payable ?? 0),
              quantity:
                order.quantity ??
                order.purchaseQuantity ??
                order.saleQuantity ??
                order.totalQuantity ??
                order.dispatchQuantity ??
                null,
            })),
            transporter:
              values.transporter || prev[id]?.transporter || null,
            organisation:
              values.organisation || prev[id]?.organisation || null,
          },
        }));

        toast.success(successMessage);
        await Promise.all([fetchBalance(), fetchVouchers()]);
        return response.data;
      } catch (error) {
        toast.error(error?.message || "Failed to update entry.");
        return null;
      } finally {
        setIsSavingVoucher(false);
      }
    },
    [fetchBalance, fetchVouchers]
  );

  const handleSubmitDialog = useCallback(
    async (values) => {
      if (editingVoucher?._id) {
        const result = await handleUpdateVoucher(
          editingVoucher._id,
          {
            ...values,
            transporter: values.transporter || editingVoucher.transporter,
            organisation:
              values.organisation || editingVoucher.organisation || null,
          },
          "Entry saved."
        );
        if (result) {
          handleCloseDialog();
          return true;
        }
        return false;
      } else {
        const created = await handleCreateVoucher(values);
        if (created) {
          handleCloseDialog();
          return true;
        }
        return false;
      }
    },
    [editingVoucher, handleCreateVoucher, handleUpdateVoucher]
  );

  const updateOrderPayment = async (orderId, payload, successMessage) => {
    setUpdatingOrders((prev) => [...prev, orderId]);
    const response = await orderApi.updateOrderStatus({
      _id: orderId,
      ...payload,
    });
    setUpdatingOrders((prev) => prev.filter((id) => id !== orderId));

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success(successMessage);
    fetchBalance();
  };

  const handleToggleSalePayment = async (order) => {
    if (!order?.orderId) {
      return;
    }
    const nextStatus = isStatusDone(order.status) ? "pending" : "done";
    await updateOrderPayment(
      order.orderId,
      {
        salePaymentStatus: nextStatus,
        salePaymentDate: nextStatus === "done" ? new Date() : null,
      },
      nextStatus === "done"
        ? "Marked as payment received."
        : "Marked as pending receivable."
    );
  };

  const handleTogglePurchasePayment = async (order) => {
    if (!order?.orderId) {
      return;
    }
    const nextStatus = isStatusDone(order.status) ? "pending" : "done";
    await updateOrderPayment(
      order.orderId,
      {
        purchasePaymentStatus: nextStatus,
        purchasePaymentDate: nextStatus === "done" ? new Date() : null,
      },
      nextStatus === "done"
        ? "Marked as payment given."
        : "Marked as pending payable."
    );
  };

  const handleOpenVoucherBuilder = useCallback(() => {
    if (selectedTransporterId === "all") {
      toast.error("Select a transporter to build a voucher.");
      return;
    }

    if (!pendingTransporterOrders.length) {
      toast.error("No pending purchases found for the selected transporter.");
      return;
    }

    setVoucherBuilderState({
      open: true,
      transporter: currentTransporter,
      orders: pendingTransporterOrders,
    });
  }, [currentTransporter, pendingTransporterOrders, selectedTransporterId]);

  const handleCloseVoucherBuilder = useCallback(() => {
    setVoucherBuilderState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleStartVoucherFromOrder = useCallback(
    ({ orders: orderList, transporter, period }) => {
      if (!Array.isArray(orderList) || orderList.length === 0) {
        return;
      }

      const normalizedOrders = orderList.map((order) => {
        const organisation = getOrderOrganisation(order);
        const quantityValue = getOrderQuantity(order);
        const quantity =
          quantityValue === null || quantityValue === undefined
            ? null
            : Number(quantityValue);
        const safeQuantity = Number.isFinite(quantity) ? quantity : null;

        const payableAmount = Number(order.payable ?? order.purchaseAmount ?? 0);
        const purchaseAmount = Number(order.purchaseAmount ?? order.payable ?? 0);

        return {
          orderId: order.orderId || order._id || order.id,
          orderNo: order.orderNo,
          payable: Number.isFinite(payableAmount) ? payableAmount : 0,
          purchaseAmount: Number.isFinite(purchaseAmount)
            ? purchaseAmount
            : 0,
          purchaseDate: order.purchaseDate || order.saleDate || null,
          status: order.status || "pending",
          quantity: safeQuantity,
          purchaseQuantity: safeQuantity,
          saleQuantity: safeQuantity,
          totalQuantity: safeQuantity,
          payableAmount: Number.isFinite(payableAmount)
            ? payableAmount
            : null,
          purchaseAmountRaw: Number.isFinite(purchaseAmount)
            ? purchaseAmount
            : null,
          vehicleNumber: getOrderVehicleNumber(order),
          vehicle: order.vehicle || null,
          organisation,
        };
      });

      const totalAmount = normalizedOrders.reduce((sum, current) => {
        const orderAmount =
          Number(current.payable || 0) || Number(current.purchaseAmount || 0);
        return sum + orderAmount;
      }, 0);

      const baseDate =
        period || normalizedOrders[0].purchaseDate || orderList[0]?.saleDate || new Date();
      const periodDate = period
        ? moment(period).startOf("month").toDate()
        : moment(baseDate).startOf("month").toDate();

      setDialogInitialValues({
        transporter: transporter || orderList[0]?.transporter || null,
        organisation: getOrderOrganisation(orderList[0]) || null,
        period: periodDate,
        voucherDate: new Date(),
        paymentDate: new Date(),
        amount: totalAmount ? Number(totalAmount.toFixed(2)) : "",
        linkedOrders: normalizedOrders,
        reference:
          normalizedOrders.length === 1
            ? normalizedOrders[0].orderNo || ""
            : "",
      });
      setEditingVoucher(null);
      setDialogOpen(true);
    },
    []
  );

  const handleVoucherBuilderContinue = useCallback(
    ({ orders: selectedOrders, period }) => {
      if (!selectedOrders?.length) {
        return;
      }

      setVoucherBuilderState((prev) => ({ ...prev, open: false }));
      handleStartVoucherFromOrder({
        orders: selectedOrders,
        transporter: voucherBuilderState.transporter,
        period,
      });
    },
    [handleStartVoucherFromOrder, voucherBuilderState.transporter]
  );

  const handleOpenVoucherPreview = useCallback((voucher, orders) => {
    setVoucherPreviewState({
      open: true,
      voucher,
      orders: Array.isArray(orders) ? orders : [],
      organisation: voucher?.organisation || null,
    });
  }, []);

  const handleCloseVoucherPreview = useCallback(() => {
    setVoucherPreviewState({
      open: false,
      voucher: null,
      orders: [],
      organisation: null,
    });
  }, []);

  const renderPayables = () => {
    const canBuildVoucher =
      selectedTransporterId !== "all" && pendingTransporterOrders.length > 0;
    const transporterDisplayName =
      selectedTransporterId === "all"
        ? "All transporters"
        : currentTransporter?.name || "Selected transporter";

    return (
      <Box sx={{ mt: 3 }}>
        <Paper sx={sectionContainerSx}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="h5">Transporter dues</Typography>
              <Typography color="text.secondary" variant="body2">
                Review outstanding purchases per transporter and build vouchers for a single party at a time.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Transporter</InputLabel>
                <Select
                  label="Transporter"
                  value={selectedTransporterId}
                  onChange={(event) => setSelectedTransporterId(event.target.value)}
                >
                  <MenuItem value="all">All Transporters</MenuItem>
                  {payablePartyOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                      {option.city ? ` • ${option.city}` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Refresh">
                <span>
                  <IconButton
                    onClick={fetchBalance}
                    disabled={balanceState.loading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip
                title={
                  canBuildVoucher
                    ? "Create a voucher from the selected transporter purchases"
                    : "Select a transporter with pending purchases"
                }
              >
                <span>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    disabled={!canBuildVoucher}
                    onClick={handleOpenVoucherBuilder}
                  >
                    Create Voucher
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
          {selectedTransporterId === "all" ? (
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mt: 2 }}
            >
              Select a transporter to focus on their purchases and generate a voucher.
            </Typography>
          ) : null}
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="subtitle2">
                    Outstanding payable
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {formatCurrency(payableAggregates.pendingAmount)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    {formatNumberSafe(payableAggregates.pendingCount)} order(s) pending voucher
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="subtitle2">
                    Already settled
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {formatCurrency(payableAggregates.doneAmount)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    {formatNumberSafe(payableAggregates.doneCount)} marked as paid
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="subtitle2">
                    Total purchases
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {formatCurrency(payableAggregates.totalAmount)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    {transporterDisplayName}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            {renderOrdersTable({
              orders: pendingTransporterOrders,
              type: "payable",
              allowToggle: false,
              emptyTitle:
                selectedTransporterId === "all"
                  ? "Select a transporter to review dues"
                  : "No purchases found",
              emptySubtitle:
                selectedTransporterId === "all"
                  ? "Use the transporter dropdown to view their outstanding purchases."
                  : "There are no purchases matching the current selection for this transporter.",
            })}
          </Box>
        </Paper>

        <Paper sx={sectionContainerSx}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="h5">Purchase vouchers</Typography>
              <Typography color="text.secondary" variant="body2">
                Share completed vouchers with transporters and maintain an auditable trail.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Tooltip title="Refresh vouchers">
                <span>
                  <IconButton
                    onClick={fetchVouchers}
                    disabled={voucherState.loading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setDialogInitialValues(null);
                  setEditingVoucher(null);
                  setDialogOpen(true);
                }}
              >
                Add Entry
              </Button>
            </Stack>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="subtitle2">
                    Filtered Amount
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {formatCurrency(voucherAggregates.totalAmount)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    {selectedTransporterId === "all"
                      ? "All transporters"
                      : "Current transporter only"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="subtitle2">
                    Voucher Count
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {formatNumberSafe(voucherAggregates.count)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    Total created: {voucherVolumeSummary}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="subtitle2">
                    Latest Voucher
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {latestVoucherDateLabel}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    Stay up to date with the most recent payment confirmation.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            {renderVoucherTable({
              vouchers: filteredVouchers,
              emptyTitle: "No vouchers yet",
              emptySubtitle:
                "Create purchase vouchers once transporter payments are settled.",
            })}
          </Box>
        </Paper>
      </Box>
    );
  };

  const handleToggleInvoicePayment = async (invoice) => {
    if (!invoice?.invoiceId) {
      return;
    }

    const isPaid = normalizeStatus(invoice.paymentStatus) === "paid";
    const nextStatus = isPaid ? "unpaid" : "paid";

    setUpdatingInvoices((prev) => [...prev, invoice.invoiceId]);
    const response = await invoiceApi.updatePaymentStatus({
      invoiceId: invoice.invoiceId,
      paymentStatus: nextStatus,
      paidAmount: nextStatus === "paid" ? Number(invoice.totalAmount) || 0 : 0,
    });
    setUpdatingInvoices((prev) =>
      prev.filter((id) => id !== invoice.invoiceId)
    );

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success(
      nextStatus === "paid"
        ? "Invoice marked as paid."
        : "Invoice marked as unpaid."
    );
    fetchBalance();
  };

  const renderOrdersTable = ({
    orders,
    type,
    allowToggle = true,
    emptyTitle,
    emptySubtitle,
  }) => {
    const isReceivable = type === "receivable";
    const baseColumns = 8;
    const columnCount = baseColumns + (allowToggle ? 1 : 0);

    if (balanceState.loading) {
      return (
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            height: "50vh",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (balanceState.error) {
      return <Alert severity="error">{balanceState.error}</Alert>;
    }

    if (!orders.length) {
      const defaultTitle = isReceivable
        ? "No orders pending invoicing"
        : "No payables pending";
      const defaultSubtitle = isReceivable
        ? "All orders here either have invoices or are fully settled."
        : "Everything for this list looks settled.";

      return (
        <Box
          sx={{
            alignItems: "center",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 220,
            p: 4,
          }}
        >
          <Typography variant="h6">{emptyTitle || defaultTitle}</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
            {emptySubtitle || defaultSubtitle}
          </Typography>
        </Box>
      );
    }

    const groupedOrders = groupItemsByMonth(orders, (order) =>
      isReceivable ? order.saleDate : order.purchaseDate
    );

    return (
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {allowToggle ? <TableCell padding="checkbox">Paid</TableCell> : null}
              <TableCell>Order #</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>{isReceivable ? "Customer" : "Transporter"}</TableCell>
              {isReceivable ? (
                <TableCell align="right">Days After Billing</TableCell>
              ) : null}
              <TableCell align="right">
                {isReceivable ? "Sale Amount" : "Purchase Amount"}
              </TableCell>
              <TableCell align="right">Advance</TableCell>
              <TableCell align="right">Outstanding</TableCell>
              {isReceivable ? null : <TableCell>Payment Date</TableCell>}
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedOrders.map((group) => (
              <Fragment key={`order-month-${group.key}`}>
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    sx={{
                      backgroundColor: "background.default",
                      fontWeight: 600,
                    }}
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.items.map((order) => {
                  const isDone = isStatusDone(order.status);
                  const isBusy = isOrderUpdating(order.orderId);
                  const amount = isReceivable
                    ? order.saleAmount
                    : order.purchaseAmount;
                  const advance = isReceivable
                    ? order.saleAdvance
                    : order.purchaseAdvance;
                  const outstanding = isReceivable
                    ? order.receivable
                    : order.payable;
                  const party = isReceivable ? order.customer : order.transporter;
                  const date = isReceivable ? order.saleDate : order.purchaseDate;
                  const daysAfterBilling =
                    isReceivable && date
                      ? Math.max(moment().diff(moment(date), "days"), 0)
                      : null;
                  const normalizedStatus = normalizeStatus(order.status);
                  const chipLabel = isDone
                    ? capitalize(normalizedStatus || "done")
                    : "Pending";

                  return (
                    <TableRow key={order.orderId} hover selected={isDone}>
                      {allowToggle ? (
                        <TableCell padding="checkbox">
                          <Checkbox
                            color={isReceivable ? "success" : "primary"}
                            checked={isDone}
                            onChange={() =>
                              isReceivable
                                ? handleToggleSalePayment(order)
                                : handleTogglePurchasePayment(order)
                            }
                            disabled={isBusy}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>{order.orderNo || "-"}</TableCell>
                      <TableCell>
                        {date ? moment(date).format("DD MMM YYYY") : "-"}
                      </TableCell>
                      <TableCell>{renderPartyCell(party)}</TableCell>
                      {isReceivable ? (
                        <TableCell align="right">
                          {daysAfterBilling == null
                            ? "-"
                            : formatNumberSafe(daysAfterBilling)}
                        </TableCell>
                      ) : null}
                      <TableCell align="right">
                        {formatCurrency(amount)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(advance)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(outstanding)}
                      </TableCell>
                      {isReceivable ? null : (
                        <TableCell>
                          {order.paymentDate
                            ? moment(order.paymentDate).format("DD MMM YYYY")
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip
                          label={chipLabel}
                          color={isDone ? "success" : "warning"}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const renderInvoicesTable = ({
    invoices: invoiceList,
    allowToggle = true,
    emptyTitle,
    emptySubtitle,
  }) => {
    const columnCount = allowToggle ? 10 : 9;

    if (balanceState.loading) {
      return (
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            height: "50vh",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (balanceState.error) {
      return <Alert severity="error">{balanceState.error}</Alert>;
    }

    if (!invoiceList.length) {
      return (
        <Box
          sx={{
            alignItems: "center",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 220,
            p: 4,
          }}
        >
          <Typography variant="h6">
            {emptyTitle || "No invoices found"}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
            {emptySubtitle ||
              "Create invoices from deliveries to track outstanding receivables."}
          </Typography>
        </Box>
      );
    }

    const groupedInvoices = groupItemsByMonth(
      invoiceList,
      (invoice) => invoice.invoiceDate
    );

    return (
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {allowToggle ? (
                <TableCell padding="checkbox">Paid</TableCell>
              ) : null}
              <TableCell>Invoice #</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Orders</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell align="right">Outstanding</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Paid Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedInvoices.map((group) => (
              <Fragment key={`invoice-month-${group.key}`}>
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    sx={{
                      backgroundColor: "background.default",
                      fontWeight: 600,
                    }}
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.items.map((invoice) => {
                  const status = normalizeStatus(
                    invoice.paymentStatus || "unpaid"
                  );
                  const isPaid = status === "paid";
                  const statusColor = isPaid
                    ? "success"
                    : status === "partial" || status === "pending"
                    ? "warning"
                    : "error";
                  const statusLabel = status ? capitalize(status) : "Pending";
                  const orderLabels = Array.isArray(invoice.orders)
                    ? invoice.orders
                        .map((order) => order.orderNo || order.orderId)
                        .filter(Boolean)
                    : [];
                  const ordersPreview = orderLabels.slice(0, 3).join(", ");
                  const remaining = Math.max(orderLabels.length - 3, 0);
                  const dateRange = [];

                  if (invoice.startDate) {
                    dateRange.push(
                      moment(invoice.startDate).format("DD MMM YYYY")
                    );
                  }

                  if (
                    invoice.endDate &&
                    invoice.endDate !== invoice.startDate
                  ) {
                    dateRange.push(
                      moment(invoice.endDate).format("DD MMM YYYY")
                    );
                  }

                  const dateRangeLabel =
                    dateRange.length === 2
                      ? `${dateRange[0]} - ${dateRange[1]}`
                      : dateRange[0] || "";

                  const isBusy = isInvoiceUpdating(invoice.invoiceId);

                  return (
                    <TableRow key={invoice.invoiceId} hover selected={isPaid}>
                      {allowToggle ? (
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="success"
                            checked={isPaid}
                            onChange={() => handleToggleInvoicePayment(invoice)}
                            disabled={isBusy}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>{invoice.invoiceNo || "-"}</TableCell>
                      <TableCell>
                        {invoice.invoiceDate
                          ? moment(invoice.invoiceDate).format("DD MMM YYYY")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {renderPartyCell(invoice.customer || {})}
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        {orderLabels.length ? (
                          <Tooltip title={orderLabels.join(", ")} arrow>
                            <Box>
                              <Typography variant="subtitle2">
                                {ordersPreview}
                                {remaining > 0 ? ` +${remaining} more` : ""}
                              </Typography>
                              <Typography
                                color="text.secondary"
                                variant="caption"
                                sx={{ display: "block" }}
                              >
                                {`${formatNumberSafe(
                                  invoice.ordersCount || orderLabels.length
                                )} orders${invoice.totalQuantity
                                  ? ` • ${formatNumberSafe(
                                      invoice.totalQuantity
                                    )} qty`
                                  : ""}`}
                              </Typography>
                              {dateRangeLabel ? (
                                <Typography
                                  color="text.secondary"
                                  variant="caption"
                                  sx={{ display: "block" }}
                                >
                                  {dateRangeLabel}
                                </Typography>
                              ) : null}
                            </Box>
                          </Tooltip>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {invoice.totalQuantity
                          ? formatNumberSafe(invoice.totalQuantity)
                          : "-"}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(invoice.totalAmount)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(invoice.outstandingAmount)}
                      </TableCell>
                      <TableCell>
                        <Chip label={statusLabel} color={statusColor} size="small" />
                      </TableCell>
                      <TableCell>
                        {invoice.paidDate
                          ? moment(invoice.paidDate).format("DD MMM YYYY")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const renderVoucherTable = ({ vouchers: voucherList, emptyTitle, emptySubtitle }) => {
    if (voucherState.loading) {
      return (
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            height: 200,
            justifyContent: "center",
          }}
        >
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (voucherState.error) {
      return <Alert severity="error">{voucherState.error}</Alert>;
    }

    if (!voucherList.length) {
      return (
        <Box
          sx={{
            alignItems: "center",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 220,
            p: 4,
          }}
        >
          <Typography variant="h6">{emptyTitle || "No entries yet"}</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
            {emptySubtitle ||
              "Add purchase vouchers to track transporter payments."}
          </Typography>
          <Button
            sx={{ mt: 2 }}
            onClick={() => {
              setDialogInitialValues(null);
              setEditingVoucher(null);
              setDialogOpen(true);
            }}
          >
            Add Entry
          </Button>
        </Box>
      );
    }

    const groupedVouchers = groupItemsByMonth(
      voucherList,
      (voucher) => voucher.voucherDate || voucher.period
    );

    return (
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Voucher ID</TableCell>
              <TableCell>Transporter</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Orders</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedVouchers.map((group) => (
              <Fragment key={`voucher-month-${group.key}`}>
                <TableRow>
                  <TableCell
                    colSpan={10}
                    sx={{
                      backgroundColor: "background.default",
                      fontWeight: 600,
                    }}
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.items.map((voucher) => {
                  const meta = voucherMeta[voucher._id] || {};
                  const linkedOrders = normalizeLinkedOrdersForPdf(
                    Array.isArray(meta.linkedOrders)
                      ? meta.linkedOrders
                      : Array.isArray(voucher.orders)
                      ? voucher.orders
                      : []
                  );
                  const organisation = meta.organisation || voucher.organisation || null;
                  const orderLabels = linkedOrders
                    .map((order) => order.orderNo || order.orderId)
                    .filter(Boolean);
                  const ordersPreview = orderLabels.slice(0, 3).join(", ");
                  const remainingOrders = Math.max(orderLabels.length - 3, 0);

                  return (
                    <TableRow
                      key={voucher._id}
                      hover
                      sx={{ borderTop: "1px solid rgba(145, 158, 171, 0.24)" }}
                    >
                      <TableCell>
                        {voucher.voucherDate
                          ? moment(voucher.voucherDate).format("DD MMM YYYY")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {getVoucherDisplayId(voucher)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {renderPartyCell(voucher.transporter || {})}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(Number(voucher.amount) || 0)}
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        {orderLabels.length ? (
                          <Tooltip title={orderLabels.join(", ")} arrow>
                            <Box>
                              <Typography variant="subtitle2">
                                {ordersPreview}
                                {remainingOrders > 0 ? ` +${remainingOrders} more` : ""}
                              </Typography>
                              {linkedOrders.length ? (
                                <Typography
                                  color="text.secondary"
                                  variant="caption"
                                  sx={{ display: "block" }}
                                >
                                  {`${formatNumberSafe(linkedOrders.length)} order(s)`}
                                </Typography>
                              ) : null}
                            </Box>
                          </Tooltip>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {voucher.paymentDate
                          ? moment(voucher.paymentDate).format("DD MMM YYYY")
                          : "-"}
                      </TableCell>
                      <TableCell>{voucher.reference || "-"}</TableCell>
                      <TableCell>{voucher.notes || "-"}</TableCell>
                      <TableCell align="center">
                        <PurchaseVoucherStatusChip status={voucher.status} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit entry">
                          <span>
                            <IconButton
                              onClick={() => {
                                setDialogInitialValues({
                                  transporter: voucher.transporter,
                                  organisation,
                                  period: voucher.period
                                    ? new Date(voucher.period)
                                    : new Date(),
                                  voucherDate: voucher.voucherDate
                                    ? new Date(voucher.voucherDate)
                                    : new Date(),
                                  paymentDate: voucher.paymentDate
                                    ? new Date(voucher.paymentDate)
                                    : new Date(),
                                  amount: Number(voucher.amount) || 0,
                                  reference: voucher.reference || "",
                                  notes: voucher.notes || "",
                                  linkedOrders,
                                });
                                setEditingVoucher({
                                  ...voucher,
                                  amount: Number(voucher.amount) || 0,
                                  organisation,
                                });
                                setDialogOpen(true);
                              }}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Preview PDF">
                          <span>
                            <IconButton
                              size="small"
                              sx={{ mr: 1 }}
                              onClick={() =>
                                handleOpenVoucherPreview(
                                  {
                                    ...voucher,
                                    organisation,
                                  },
                                  linkedOrders
                                )
                              }
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <PDFDownloadLink
                          document={
                            <PurchaseVoucherPdf
                              voucher={
                                organisation
                                  ? { ...voucher, organisation }
                                  : voucher
                              }
                              linkedOrders={linkedOrders}
                              account={account}
                              organisation={organisation}
                            />
                          }
                          fileName={buildVoucherFileName(
                            voucher,
                            voucher?.transporter?.name
                          )}
                          style={{ textDecoration: "none" }}
                        >
                          {({ loading }) => (
                            <Tooltip title="Download PDF">
                              <span>
                                <IconButton size="small" disabled={loading}>
                                  <PictureAsPdfIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </PDFDownloadLink>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const renderSummary = () => {
    if (balanceState.loading) {
      return (
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            height: "50vh",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={32} />
        </Box>
      );
    }

    if (balanceState.error) {
      return <Alert severity="error">{balanceState.error}</Alert>;
    }

    return (
      <>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryTile
              title="Total Receivable"
              value={formatCurrency(totals.totalReceivable || 0)}
              helper={`Orders pending invoicing: ${formatNumberSafe(
                totalPendingReceivableOrders
              )} • Outstanding invoices: ${formatNumberSafe(
                summaryOutstandingInvoiceCount
              )}`}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryTile
              title="Total Payable"
              value={formatCurrency(totals.totalPayable || 0)}
              helper={`Pending orders: ${formatNumberSafe(
                totalPendingPayableOrders
              )} • Vouchers created: ${voucherVolumeSummary}`}
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
              value={`${formatNumberSafe(
                totals.totalPendingDeliveries || 0
              )} / ${formatNumberSafe(
                totals.totalPendingPurchaseOrders || 0
              )} / ${formatNumberSafe(
                totals.totalPendingPurchaseVouchers || 0
              )}`}
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
                          <TableCell align="right">
                            {party.ordersCount}
                          </TableCell>
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
                          <TableCell align="right">
                            {party.ordersCount}
                          </TableCell>
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
                            {`${formatCurrency(
                              party.voucherDoneAmount
                            )} (${formatNumberSafe(
                              party.voucherDoneCount
                            )})`}
                          </TableCell>
                          <TableCell align="right">
                            {`${formatCurrency(
                              party.voucherPendingAmount
                            )} (${formatNumberSafe(
                              party.voucherPendingCount
                            )})`}
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
      </>
    );
  };

  const renderReceivables = () => (
    <Box sx={{ mt: 3 }}>
      <Paper sx={sectionContainerSx}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box sx={{ width: "100%" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", sm: "center" }}
              sx={{ flexWrap: "wrap" }}
            >
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push("/dashboard/invoices/new")}
              >
                Add Invoice
              </Button>
              <Typography variant="h5">Orders awaiting invoices</Typography>
            </Stack>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              These orders do not yet have invoices and still need payment collection.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Customer</InputLabel>
              <Select
                label="Customer"
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
              >
                <MenuItem value="all">All Customers</MenuItem>
                {receivablePartyOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.name}
                    {option.city ? ` • ${option.city}` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <span>
                <IconButton
                  onClick={fetchBalance}
                  disabled={balanceState.loading}
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ mt: 2 }}>
          {renderOrdersTable({
            orders: filteredOrdersWithoutInvoice,
            type: "receivable",
            allowToggle: false,
            emptyTitle: "No orders pending invoicing",
            emptySubtitle:
              "All orders here either have invoices or are fully settled.",
          })}
        </Box>
      </Paper>

      <Paper sx={sectionContainerSx}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h5">Invoices awaiting payment</Typography>
            <Typography color="text.secondary" variant="body2">
              Review issued invoices and mark payments as received when they are settled.
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <span>
              <IconButton
                onClick={fetchBalance}
                disabled={balanceState.loading}
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="subtitle2">
                  Outstanding Amount
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {formatCurrency(filteredInvoiceAggregates.outstandingAmount)}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                  {formatNumberSafe(filteredInvoiceAggregates.outstandingCount)} invoice(s) unpaid
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="subtitle2">
                  Total Invoices
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {formatNumberSafe(filteredInvoiceAggregates.count)}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                  {formatNumberSafe(filteredInvoiceAggregates.paidCount)} marked as paid
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="subtitle2">
                  Billed Amount
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {formatCurrency(filteredInvoiceAggregates.totalAmount)}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                  Avg invoice {filteredInvoiceAggregates.count
                    ? formatCurrency(filteredInvoiceAggregates.averageAmount)
                    : "-"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Box sx={{ mt: 3 }}>
          {renderInvoicesTable({
            invoices: filteredPendingInvoices,
            allowToggle: true,
            emptyTitle: "No invoices pending payment",
            emptySubtitle: "All invoices are settled for the selected customer.",
          })}
        </Box>
      </Paper>

      <Paper sx={sectionContainerSx}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h5">Paid invoices</Typography>
            <Typography color="text.secondary" variant="body2">
              Recently closed invoices remain visible here for quick reference.
            </Typography>
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ mt: 2 }}>
          {renderInvoicesTable({
            invoices: filteredPaidInvoices,
            allowToggle: true,
            emptyTitle: "No paid invoices yet",
            emptySubtitle: "Mark invoices as paid to see them collected here.",
          })}
        </Box>
      </Paper>
    </Box>
  );
  return (
    <>
      <Head>
        <title>Dashboard: Balance Sheet | Truckar</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Grid container justifyContent="space-between" spacing={3}>
            <Grid item>
              <Typography variant="h4">Balance Sheet</Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                Review totals, track payments, and manage transporter vouchers in one place.
              </Typography>
            </Grid>
            <Grid item>
              <Tooltip title="Refresh all data">
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      fetchBalance();
                      fetchVouchers();
                    }}
                    disabled={balanceState.loading || voucherState.loading}
                  >
                    Refresh
                  </Button>
                </span>
              </Tooltip>
            </Grid>
          </Grid>
          <Tabs
            indicatorColor="primary"
            onChange={(event, value) => setCurrentTab(value)}
            scrollButtons="auto"
            textColor="primary"
            value={currentTab}
            sx={{ mt: 3 }}
            variant="scrollable"
          >
            {tabs.map((tab) => (
              <Tab key={tab.value} label={tab.label} value={tab.value} />
            ))}
          </Tabs>
          <Divider sx={{ mt: 3 }} />

          <Box sx={{ mt: 3, pb: 6 }}>
            {currentTab === "summary" && renderSummary()}
            {currentTab === "receivables" && renderReceivables()}
            {currentTab === "payables" && renderPayables()}
          </Box>
        </Container>
      </Box>
      <PurchaseVoucherDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitDialog}
        initialValues={dialogInitialValues || editingVoucher}
        isSaving={isSavingVoucher}
      />
      <PurchaseVoucherBuilderDialog
        open={voucherBuilderState.open}
        transporter={voucherBuilderState.transporter}
        orders={voucherBuilderState.orders}
        onClose={handleCloseVoucherBuilder}
        onContinue={handleVoucherBuilderContinue}
      />
      <Dialog
        fullWidth
        maxWidth="lg"
        open={voucherPreviewState.open}
        onClose={handleCloseVoucherPreview}
      >
        <DialogTitle>Preview Purchase Voucher</DialogTitle>
        <DialogContent dividers sx={{ height: { xs: 480, md: 640 } }}>
          {isClient && voucherPreviewState.voucher ? (
            <PDFViewer style={{ width: "100%", height: "100%" }}>
              <PurchaseVoucherPdf
                voucher={voucherPreviewState.voucher}
                linkedOrders={normalizeLinkedOrdersForPdf(
                  voucherPreviewState.orders
                )}
                account={account}
                organisation={
                  voucherPreviewState.organisation ||
                  voucherPreviewState.voucher?.organisation ||
                  null
                }
              />
            </PDFViewer>
          ) : (
            <Box
              sx={{
                alignItems: "center",
                display: "flex",
                height: "100%",
                justifyContent: "center",
              }}
            >
              <Typography color="text.secondary" variant="body2">
                PDF preview is available after the page finishes loading.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVoucherPreview}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

BalanceSheetPage.getLayout = (page) => (
  <AuthGuard>
    <OnBoardingGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </OnBoardingGuard>
  </AuthGuard>
);

export default BalanceSheetPage;
