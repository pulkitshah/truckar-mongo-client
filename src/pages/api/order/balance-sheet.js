/* eslint-env node */
import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import PurchaseVoucher from "../../../models/PurchaseVoucher";
import Invoice from "../../../models/Invoice";
import auth from "../../../auth";
import { lookups } from ".";
import { calculateAmountForOrder } from "../../../utils/amount-calculation";

const CLOSED_STATUSES = new Set([
  "complete",
  "completed",
  "canceled",
  "cancelled",
  "rejected",
]);

const normalizeStatus = (status) => String(status || "").toLowerCase();

const isPendingStatus = (status) =>
  !CLOSED_STATUSES.has(normalizeStatus(status));

const PAID_STATUSES = new Set(["done", "paid", "received", "complete"]);

const isPaymentDone = (status) => PAID_STATUSES.has(normalizeStatus(status));

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getCityLabel = (city) => {
  if (!city) {
    return "";
  }

  if (typeof city === "string") {
    return city;
  }

  if (typeof city === "object") {
    return (
      city.description ||
      city.name ||
      city.structured_formatting?.main_text ||
      city.town ||
      ""
    );
  }

  return "";
};

const getPendingDeliveryCount = (order) => {
  if (!Array.isArray(order.deliveries)) {
    return 0;
  }

  return order.deliveries.reduce((count, delivery) => {
    if (!delivery) {
      return count;
    }

    const invoices = delivery.invoices;
    const hasInvoice = Array.isArray(invoices) && invoices.length > 0;
    return hasInvoice ? count : count + 1;
  }, 0);
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

const ensureReceivableEntry = (map, party) => {
  const key = party?._id?.toString();

  if (!key) {
    return null;
  }

  if (!map.has(key)) {
    map.set(key, {
      partyId: key,
      name: party.name || "Unknown",
      mobile: party.mobile || "",
      city: getCityLabel(party.city),
      ordersCount: 0,
      pendingDeliveries: 0,
      totalSaleAmount: 0,
      saleAdvance: 0,
      orderReceivable: 0,
      invoiceOutstanding: 0,
      invoiceCount: 0,
      receivable: 0,
    });
  }

  return map.get(key);
};

const ensurePayableEntry = (map, party) => {
  const key = party?._id?.toString();

  if (!key) {
    return null;
  }

  if (!map.has(key)) {
    map.set(key, {
      partyId: key,
      name: party.name || "Unknown",
      mobile: party.mobile || "",
      city: getCityLabel(party.city),
      ordersCount: 0,
      pendingPurchaseOrders: 0,
      totalPurchaseAmount: 0,
      purchaseAdvance: 0,
      orderPayable: 0,
      voucherPendingAmount: 0,
      voucherPendingCount: 0,
      voucherDoneAmount: 0,
      voucherDoneCount: 0,
      payable: 0,
    });
  }

  return map.get(key);
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  auth(req, res, async () => {
    try {
      await dbConnect();

      const { account } = req.query;

      if (!account) {
        return res.status(400).json({ message: "Account is required" });
      }

      const accountId = new mongoose.Types.ObjectId(account);

      const pipeline = [
        {
          $match: {
            account: accountId,
          },
        },
        ...lookups,
      ];

      const orders = await Order.aggregate(pipeline, { allowDiskUse: true });

      const receivableMap = new Map();
      const payableMap = new Map();
      const orderMap = new Map();

      orders.forEach((order) => {
        const orderId = order?._id?.toString();
        if (!orderId) {
          return;
        }
        orderMap.set(orderId, order);
      });

      const ordersWithoutInvoice = [];
      const payableOrders = [];

      let totalOrderReceivable = 0;
      let totalInvoiceReceivable = 0;
      let totalPendingDeliveries = 0;
      let totalPendingPurchaseOrders = 0;
      let totalPendingPurchaseVouchers = 0;
      let totalPendingVoucherAmount = 0;
      let totalOrderPayable = 0;

      orders.forEach((order) => {
        if (!isPendingStatus(order.status)) {
          return;
        }

        const saleAmount = toNumber(
          calculateAmountForOrder(order, "sale", false)
        );
        const saleAdvance = toNumber(order.saleAdvance);
        const receivable = Math.max(saleAmount - saleAdvance, 0);
        const salePaymentStatus = order.salePaymentStatus || "pending";
        const isSalePaid = isPaymentDone(salePaymentStatus);
        const hasInvoice =
          Array.isArray(order.deliveries) &&
          order.deliveries.some(
            (delivery) =>
              Array.isArray(delivery?.invoices) && delivery.invoices.length > 0
          );

        if (!hasInvoice && !isSalePaid && receivable > 0 && order.customer) {
          const pendingDeliveries = getPendingDeliveryCount(order);
          const entry = ensureReceivableEntry(receivableMap, order.customer);

          if (entry) {
            entry.ordersCount += 1;
            entry.pendingDeliveries += pendingDeliveries;
            entry.totalSaleAmount += saleAmount;
            entry.saleAdvance += saleAdvance;
            entry.orderReceivable += receivable;
            entry.receivable += receivable;
          }

          ordersWithoutInvoice.push({
            orderId: order._id?.toString(),
            orderNo: order.orderNo,
            saleDate: order.saleDate,
            customer: order.customer,
            saleAmount,
            saleAdvance,
            receivable,
            pendingDeliveries,
            status: salePaymentStatus,
            paymentDate: order.salePaymentDate || null,
          });

          totalOrderReceivable += receivable;
          totalPendingDeliveries += pendingDeliveries;
        }

        const purchaseAmount = toNumber(
          calculateAmountForOrder(order, "outflow", false)
        );
        const purchaseAdvance = toNumber(order.purchaseAdvance);
        const payable = Math.max(purchaseAmount - purchaseAdvance, 0);
        const purchasePaymentStatus = order.purchasePaymentStatus || "pending";
        const isPurchasePaid = isPaymentDone(purchasePaymentStatus);

        if (order.transporter) {
          const entry = ensurePayableEntry(payableMap, order.transporter);

          if (entry && !isPurchasePaid && payable > 0) {
            entry.ordersCount += 1;
            entry.pendingPurchaseOrders += 1;
            entry.totalPurchaseAmount += purchaseAmount;
            entry.purchaseAdvance += purchaseAdvance;
            entry.orderPayable += payable;
            entry.payable = entry.orderPayable;

            totalPendingPurchaseOrders += 1;
            totalOrderPayable += payable;

            payableOrders.push({
              orderId: order._id?.toString(),
              orderNo: order.orderNo,
              purchaseDate: order.createdDate || order.saleDate,
              transporter: order.transporter,
              purchaseAmount,
              purchaseAdvance,
              payable,
              status: purchasePaymentStatus,
              paymentDate: order.purchasePaymentDate || null,
              vehicleNumber: getOrderVehicleNumber(order),
              quantity: getOrderQuantity(order),
              organisation: getOrderOrganisation(order),
            });
          } else if (entry && isPurchasePaid) {
            payableOrders.push({
              orderId: order._id?.toString(),
              orderNo: order.orderNo,
              purchaseDate: order.createdDate || order.saleDate,
              transporter: order.transporter,
              purchaseAmount,
              purchaseAdvance,
              payable: 0,
              status: purchasePaymentStatus,
              paymentDate: order.purchasePaymentDate || null,
              vehicleNumber: getOrderVehicleNumber(order),
              quantity: getOrderQuantity(order),
              organisation: getOrderOrganisation(order),
            });
          }
        }
      });

      const invoicesRaw = await Invoice.find({ account: accountId })
        .populate("customer", "name city mobile")
        .populate("organisation", "name initials")
        .lean();

      const invoiceSummaries = invoicesRaw.map((invoice) => {
        const deliveries = Array.isArray(invoice.deliveries)
          ? invoice.deliveries
          : [];
        const perOrderMap = new Map();
        let totalQuantity = 0;
        let startDate = null;
        let endDate = null;

        deliveries.forEach((delivery) => {
          let orderId = null;

          if (delivery?.order) {
            if (typeof delivery.order === "object") {
              orderId =
                delivery.order?._id?.toString() ||
                delivery.order?.id?.toString() ||
                (typeof delivery.order.toString === "function"
                  ? delivery.order.toString()
                  : null);
            } else {
              orderId = delivery.order.toString();
            }
          }

          if (!orderId) {
            return;
          }

          const order = orderMap.get(orderId);
          if (!order) {
            return;
          }

          let deliveryId = null;

          if (delivery?.delivery) {
            if (typeof delivery.delivery === "object") {
              deliveryId =
                delivery.delivery?._id?.toString() ||
                delivery.delivery?.id?.toString() ||
                (typeof delivery.delivery.toString === "function"
                  ? delivery.delivery.toString()
                  : null);
            } else {
              deliveryId = delivery.delivery.toString();
            }
          }

          const matchedDeliveries = Array.isArray(order.deliveries)
            ? order.deliveries.filter((od) => {
                const orderDeliveryId =
                  od?._id?.toString?.() ||
                  od?.id?.toString?.() ||
                  (typeof od?.toString === "function" ? od.toString() : null);
                return deliveryId && orderDeliveryId
                  ? orderDeliveryId === deliveryId
                  : false;
              })
            : [];

          const quantity = matchedDeliveries.reduce(
            (sum, current) => sum + toNumber(current.billQuantity),
            0
          );

          totalQuantity += quantity;

          const existing = perOrderMap.get(orderId) || {
            orderId,
            orderNo: order.orderNo,
            saleDate: order.saleDate,
            quantity: 0,
          };

          existing.quantity += quantity;
          perOrderMap.set(orderId, existing);

          if (order.saleDate) {
            const saleDate = new Date(order.saleDate);
            if (!Number.isNaN(saleDate.getTime())) {
              if (!startDate || saleDate < startDate) {
                startDate = saleDate;
              }
              if (!endDate || saleDate > endDate) {
                endDate = saleDate;
              }
            }
          }
        });

        const taxTotal = Array.isArray(invoice.taxes)
          ? invoice.taxes.reduce(
              (sum, tax) => sum + toNumber(tax?.taxValue ?? tax?.amount),
              0
            )
          : 0;

        const totalAmount = toNumber(invoice.subtotal) + taxTotal;

        let outstandingAmount = totalAmount;
        const paymentStatus = invoice.paymentStatus || "unpaid";

        if (paymentStatus === "paid") {
          outstandingAmount = 0;
        } else if (paymentStatus === "partial") {
          outstandingAmount = Math.max(
            totalAmount - toNumber(invoice.paidAmount),
            0
          );
        }

        const ordersList = Array.from(perOrderMap.values());

        ordersList.sort((a, b) => {
          const aDate = new Date(a.saleDate || 0).getTime();
          const bDate = new Date(b.saleDate || 0).getTime();
          return bDate - aDate;
        });

        if (outstandingAmount > 0 && invoice.customer) {
          const entry = ensureReceivableEntry(receivableMap, invoice.customer);
          if (entry) {
            entry.invoiceOutstanding += outstandingAmount;
            entry.invoiceCount += 1;
            entry.receivable += outstandingAmount;
          }
        }

        totalInvoiceReceivable += outstandingAmount;

        return {
          invoiceId: invoice._id.toString(),
          invoiceNo: invoice.invoiceNo,
          invoiceDate: invoice.invoiceDate,
          customer: invoice.customer,
          organisation: invoice.organisation,
          paymentStatus,
          paidAmount: toNumber(invoice.paidAmount),
          paidDate: invoice.paidDate || null,
          totalAmount,
          outstandingAmount,
          ordersCount: ordersList.length,
          totalQuantity,
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null,
          orders: ordersList,
        };
      });

      invoiceSummaries.sort((a, b) => {
        const aDate = new Date(a.invoiceDate || 0).getTime();
        const bDate = new Date(b.invoiceDate || 0).getTime();
        return bDate - aDate;
      });

      const vouchers = await PurchaseVoucher.aggregate([
        {
          $match: {
            account: accountId,
          },
        },
        {
          $lookup: {
            from: "parties",
            localField: "transporter",
            foreignField: "_id",
            as: "transporter",
          },
        },
        {
          $unwind: {
            path: "$transporter",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "organisations",
            localField: "organisation",
            foreignField: "_id",
            as: "organisation",
          },
        },
        {
          $unwind: {
            path: "$organisation",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);

      const purchaseVouchersPending = [];
      const purchaseVouchersDone = [];

      vouchers.forEach((voucher) => {
        const entry = ensurePayableEntry(payableMap, voucher.transporter);

        if (!entry) {
          return;
        }

        const amount = toNumber(voucher.amount);
        const status = normalizeStatus(voucher.status);
        const enrichedVoucher = {
          ...voucher,
          amount,
        };

        if (status === "done") {
          entry.voucherDoneAmount += amount;
          entry.voucherDoneCount += 1;
          purchaseVouchersDone.push(enrichedVoucher);
        } else {
          entry.voucherPendingAmount += amount;
          entry.voucherPendingCount += 1;
          purchaseVouchersPending.push(enrichedVoucher);
          totalPendingPurchaseVouchers += 1;
          totalPendingVoucherAmount += amount;
        }
      });

      purchaseVouchersPending.sort((a, b) => {
        const aDate = new Date(a.voucherDate || 0).getTime();
        const bDate = new Date(b.voucherDate || 0).getTime();
        return bDate - aDate;
      });

      purchaseVouchersDone.sort((a, b) => {
        const aDate = new Date(a.voucherDate || 0).getTime();
        const bDate = new Date(b.voucherDate || 0).getTime();
        return bDate - aDate;
      });

      let totalPayable = 0;

      payableMap.forEach((entry) => {
        entry.payable = Math.max(
          entry.orderPayable - entry.voucherDoneAmount,
          0
        );
        totalPayable += entry.payable;
      });

      const receivables = Array.from(receivableMap.values())
        .filter((item) => item.receivable > 0)
        .sort((a, b) => b.receivable - a.receivable);
      const payables = Array.from(payableMap.values())
        .filter(
          (item) =>
            item.payable > 0 ||
            item.voucherPendingAmount > 0 ||
            item.orderPayable > 0
        )
        .sort((a, b) => b.payable - a.payable);

      ordersWithoutInvoice.sort((a, b) => {
        const aDate = new Date(a.saleDate || 0).getTime();
        const bDate = new Date(b.saleDate || 0).getTime();
        return bDate - aDate;
      });

      payableOrders.sort((a, b) => {
        const aDate = new Date(a.purchaseDate || 0).getTime();
        const bDate = new Date(b.purchaseDate || 0).getTime();
        return bDate - aDate;
      });

      const outstandingInvoiceCount = invoiceSummaries.filter(
        (invoice) => invoice.outstandingAmount > 0
      ).length;

      const totals = {
        totalReceivable: totalOrderReceivable + totalInvoiceReceivable,
        totalOrderReceivable,
        totalInvoiceReceivable,
        totalPayable,
        netOutstanding:
          totalOrderReceivable + totalInvoiceReceivable - totalPayable,
        totalPendingDeliveries,
        totalPendingPurchaseOrders,
        totalPendingPurchaseVouchers,
        totalPendingVoucherAmount,
        totalOrderPayable,
        totalOutstandingInvoices: outstandingInvoiceCount,
      };

      return res.status(200).json({
        totals,
        receivables,
        payables,
        ordersWithoutInvoice,
        invoices: invoiceSummaries,
        payableOrders,
        purchaseVouchers: {
          pending: purchaseVouchersPending,
          done: purchaseVouchersDone,
        },
      });
    } catch (error) {
      globalThis.console?.error?.("[Balance Sheet API]", error);
      return res.status(500).json({
        message: error?.message || "Internal server error",
      });
    }
  });
}
