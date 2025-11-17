// Utility functions for normalizing invoice delivery data.
// Focused, no business logic beyond safe shaping of data.

export function getNormalizedInvoiceDeliveries(invoice) {
  if (!invoice || !Array.isArray(invoice.deliveries)) return [];
  return invoice.deliveries.map((invoiceDelivery) => {
    const order = invoiceDelivery?.order || {};
    const orderDeliveries = Array.isArray(order.deliveries)
      ? order.deliveries
      : [];
    const matchedDelivery =
      orderDeliveries.find((d) => d && d._id === invoiceDelivery.delivery) ||
      {};

    const deliveriesLength = orderDeliveries.length || 1;
    const saleAdvanceShare = order.saleAdvance
      ? order.saleAdvance / deliveriesLength
      : 0;

    return {
      ...order,
      deliveries: orderDeliveries,
      delivery: matchedDelivery,
      invoiceCharges: invoiceDelivery?.invoiceCharges || [],
      particular: invoiceDelivery?.particular || "",
      saleAdvanceShare,
    };
  });
}
