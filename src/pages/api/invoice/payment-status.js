import dbConnect from "../../../lib/dbConnect";
import auth from "../../../auth";
import Invoice from "../../../models/Invoice";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SUPPORTED_STATUSES = new Set([
  "paid",
  "partial",
  "unpaid",
  "pending",
  "done",
]);

const normalizeStatus = (status) => String(status || "").toLowerCase();

const calculateInvoiceTotal = (invoice) => {
  const subtotal = toNumber(invoice.subtotal);
  const taxes = Array.isArray(invoice.taxes)
    ? invoice.taxes.reduce(
        (sum, tax) => sum + toNumber(tax?.taxValue ?? tax?.amount),
        0
      )
    : 0;

  return subtotal + taxes;
};

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  auth(req, res, async () => {
    try {
      const { invoiceId, paymentStatus, paidAmount, paidDate } = req.body || {};

      if (!invoiceId) {
        return res.status(400).json({ message: "invoiceId is required" });
      }

      const invoice = await Invoice.findById(invoiceId);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const normalizedStatus = normalizeStatus(paymentStatus);
      const nextStatus = SUPPORTED_STATUSES.has(normalizedStatus)
        ? normalizedStatus
        : "unpaid";

      invoice.paymentStatus = nextStatus === "done" ? "paid" : nextStatus;

      if (invoice.paymentStatus === "paid") {
        const nextPaidAmount = toNumber(
          paidAmount !== undefined ? paidAmount : calculateInvoiceTotal(invoice)
        );
        invoice.paidAmount = nextPaidAmount;
        invoice.paidDate = paidDate ? new Date(paidDate) : new Date();
      } else if (invoice.paymentStatus === "partial") {
        invoice.paidAmount = toNumber(paidAmount ?? invoice.paidAmount ?? 0);
        invoice.paidDate = paidDate ? new Date(paidDate) : invoice.paidDate;
      } else {
        invoice.paidAmount = 0;
        invoice.paidDate = null;
      }

      await invoice.save();
      await invoice.populate([
        { path: "customer", select: "name city mobile" },
        { path: "organisation", select: "name initials" },
      ]);

      return res.status(200).json({ data: invoice });
    } catch (error) {
      globalThis.console?.error?.("[Invoice Payment Status API]", error);
      return res
        .status(500)
        .json({ message: error?.message || "Internal server error" });
    }
  });
}
