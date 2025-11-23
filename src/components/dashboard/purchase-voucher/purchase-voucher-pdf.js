import PropTypes from "prop-types";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import moment from "moment";

const styles = StyleSheet.create({
  page: {
    fontSize: 11,
    padding: 32,
    fontFamily: "Helvetica",
    color: "#111",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  logo: {
    width: 64,
    height: 64,
    objectFit: "contain",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontWeight: "bold",
    marginRight: 8,
  },
  table: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "solid",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f4",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    borderBottomStyle: "solid",
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexGrow: 1,
    fontSize: 10,
    textAlign: "left",
  },
  footer: {
    marginTop: 24,
    fontSize: 10,
    color: "#555",
  },
});

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) =>
  value ? moment(value).format("DD MMM YYYY") : "-";

const formatPeriod = (value) =>
  value ? moment(value).format("MMMM YYYY") : "-";

const safeText = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
};

const resolveCity = (city) => {
  if (!city) {
    return "-";
  }
  if (typeof city === "string") {
    return city;
  }
  return city.name || city.description || "-";
};

const resolveOrders = (orders = []) =>
  Array.isArray(orders) ? orders : [];

const resolveVehicleNumber = (order = {}) => {
  if (order.vehicleNumber) {
    return order.vehicleNumber;
  }

  const vehicle = order.vehicle;
  if (!vehicle) {
    return "-";
  }

  if (typeof vehicle === "string") {
    return vehicle;
  }

  return (
    vehicle.registrationNumber ||
    vehicle.licensePlate ||
    vehicle.number ||
    vehicle.name ||
    "-"
  );
};

const resolveQuantity = (order = {}) => {
  const quantity =
    order.quantity ??
    order.purchaseQuantity ??
    order.saleQuantity ??
    order.totalQuantity ??
    order.dispatchQuantity ??
    null;

  if (quantity === null || quantity === undefined) {
    return "-";
  }

  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? parsed : quantity;
};

const isRenderableImageSource = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("data:image/")) {
    return /^data:image\/(png|jpe?g|gif)/i.test(trimmed);
  }

  if (trimmed.startsWith("blob:")) {
    return true;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    const withoutQuery = trimmed.split("?")[0].toLowerCase();
    return /\.(png|jpe?g|gif)$/.test(withoutQuery);
  }

  return false;
};

const pickRenderableImage = (...candidates) => {
  for (const candidate of candidates) {
    if (isRenderableImageSource(candidate)) {
      return candidate;
    }
  }
  return null;
};

const resolveOrganisationLogo = (organisation = {}) => {
  if (!organisation) {
    return null;
  }

  const { logo } = organisation;
  if (logo) {
    if (typeof logo === "string") {
      return logo;
    }
    const location =
      logo.location ||
      logo.Location ||
      logo.url ||
      logo.URL ||
      logo.href ||
      logo.path ||
      null;
    if (location) {
      return location;
    }
  }

  return (
    organisation.logoUrl ||
    organisation.brandingLogo ||
    organisation.branding?.logo ||
    organisation.branding?.logoUrl ||
    null
  );
};

export const PurchaseVoucherPdf = ({
  voucher = {},
  linkedOrders = [],
  account = {},
  organisation: organisationProp = null,
}) => {
  const orders = resolveOrders(linkedOrders);
  const transporter = voucher.transporter || {};
  const organisation = organisationProp || voucher.organisation || null;
  const organisationCity = organisation ? resolveCity(organisation.city) : null;
  const organisationLogo = resolveOrganisationLogo(organisation);
  const fallbackLogos = [
    account?.logoUrl,
    account?.logo,
    account?.brandingLogo,
    account?.branding?.logo,
    account?.branding?.logoUrl,
    "/logo.png",
  ];
  const logoSrc = pickRenderableImage(organisationLogo, ...fallbackLogos);
  const headerName = organisation?.name || account?.name || "Truckar";
  const headerCity =
    organisationCity && organisationCity !== "-"
      ? organisationCity
      : account?.city || null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>Purchase Voucher</Text>
              <Text>
                {headerName}
                {headerCity ? ` • ${headerCity}` : ""}
              </Text>
            </View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voucher Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Reference:</Text>
            <Text>{safeText(voucher.reference)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Period:</Text>
            <Text>{formatPeriod(voucher.period)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Voucher Date:</Text>
            <Text>{formatDate(voucher.voucherDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Date:</Text>
            <Text>{formatDate(voucher.paymentDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount:</Text>
            <Text>{formatCurrency(voucher.amount)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transporter</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text>{safeText(transporter.name)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>City:</Text>
            <Text>{resolveCity(transporter.city)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact:</Text>
            <Text>{safeText(transporter.mobile || transporter.phone)}</Text>
          </View>
        </View>

        {orders.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Linked Orders</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flexGrow: 1.2 }]}>Order #</Text>
                <Text style={styles.tableCell}>Date</Text>
                <Text style={styles.tableCell}>Vehicle #</Text>
                <Text style={[styles.tableCell, { textAlign: "right", flexGrow: 0.8 }]}>Quantity</Text>
                <Text style={[styles.tableCell, { textAlign: "right" }]}>Amount</Text>
              </View>
              {orders.map((order, index) => (
                <View
                  key={order.orderId || order.orderNo || `order-${index}`}
                  style={styles.tableRow}
                >
                  <Text style={[styles.tableCell, { flexGrow: 1.2 }]}>
                    {safeText(order.orderNo || order.orderId)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatDate(order.purchaseDate || order.saleDate)}
                  </Text>
                  <Text style={styles.tableCell}>{safeText(resolveVehicleNumber(order))}</Text>
                  <Text style={[styles.tableCell, { textAlign: "right", flexGrow: 0.8 }]}>
                    {safeText(resolveQuantity(order))}
                  </Text>
                  <Text style={[styles.tableCell, { textAlign: "right" }]}>
                    {formatCurrency(
                      Number.isFinite(Number(order.payable))
                        ? Number(order.payable)
                        : Number(order.purchaseAmount || 0)
                    )}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {voucher.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{safeText(voucher.notes)}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Generated on {moment().format("DD MMM YYYY, hh:mm A")} • Powered by Truckar
        </Text>
      </Page>
    </Document>
  );
};

PurchaseVoucherPdf.propTypes = {
  voucher: PropTypes.object,
  linkedOrders: PropTypes.arrayOf(PropTypes.object),
  account: PropTypes.object,
  organisation: PropTypes.object,
};
