/**
 * Helper functions for consistent sales, purchase, and profit calculations across all analytics APIs
 * These functions provide MongoDB aggregation pipeline expressions
 *
 * IMPORTANT: Based on the calculateAmountForOrder function in utils/amount-calculation.js
 * - Sale calculation does NOT subtract advance (advance is handled separately in accounting)
 * - Purchase calculation does NOT subtract advance (advance is handled separately in accounting)
 * - Profit = Sale - (Purchase + Expenses)
 */

/**
 * Calculate base sales amount
 * Formula: If saleType.value is "fixed" then saleRate, else saleRate * sum(billQuantity)
 * Note: Uses minimumSaleGuarantee if billQuantity < minimumSaleGuarantee
 */
export const getBaseSalesExpression = () => ({
  $cond: [
    { $eq: [{ $ifNull: ["$saleType.value", "quantity"] }, "fixed"] },
    { $ifNull: ["$saleRate", 0] },
    {
      $multiply: [
        { $ifNull: ["$saleRate", 0] },
        {
          $cond: [
            {
              $lt: [
                {
                  $sum: {
                    $map: {
                      input: "$deliveries",
                      as: "delivery",
                      in: { $ifNull: ["$$delivery.billQuantity", 0] },
                    },
                  },
                },
                { $ifNull: ["$minimumSaleGuarantee", 0] },
              ],
            },
            { $ifNull: ["$minimumSaleGuarantee", 0] },
            {
              $sum: {
                $map: {
                  input: "$deliveries",
                  as: "delivery",
                  in: { $ifNull: ["$$delivery.billQuantity", 0] },
                },
              },
            },
          ],
        },
      ],
    },
  ],
});

/**
 * Calculate LR charges from deliveries
 * Formula: Sum of all lrCharges.chargeDefaultAmount across all deliveries
 */
export const getLRChargesExpression = () => ({
  $sum: {
    $map: {
      input: "$deliveries",
      as: "delivery",
      in: {
        $sum: {
          $map: {
            input: { $ifNull: ["$$delivery.lr.lrCharges", []] },
            as: "charge",
            in: { $ifNull: ["$$charge.chargeDefaultAmount", 0] },
          },
        },
      },
    },
  },
});

/**
 * Calculate invoice charges from deliveries
 * Formula: Sum of all invoiceCharges amount across all deliveries
 */
export const getInvoiceChargesExpression = () => ({
  $sum: {
    $map: {
      input: "$deliveries",
      as: "delivery",
      in: {
        $sum: {
          $map: {
            input: { $ifNull: ["$$delivery.invoiceCharges", []] },
            as: "charge",
            in: { $ifNull: ["$$charge.amount", 0] },
          },
        },
      },
    },
  },
});

/**
 * Calculate total sales (WITHOUT subtracting advance)
 * Formula: Base Sales + LR Charges + Invoice Charges
 * Note: Advance is not subtracted - it's handled separately in accounting
 */
export const getTotalSalesExpression = () => ({
  $add: [
    getBaseSalesExpression(),
    getLRChargesExpression(),
    getInvoiceChargesExpression(),
  ],
});

/**
 * Calculate base purchase amount
 * Formula: If purchaseType (string) is "fixed" then purchaseRate, else purchaseRate * sum(billQuantity)
 * Note: Uses minimumPurchaseGuarantee if billQuantity < minimumPurchaseGuarantee
 * Note: purchaseType is a STRING, not an object with .value property
 */
export const getBasePurchaseExpression = () => ({
  $cond: [
    { $eq: [{ $ifNull: ["$purchaseType", "quantity"] }, "fixed"] },
    { $ifNull: ["$purchaseRate", 0] },
    {
      $multiply: [
        { $ifNull: ["$purchaseRate", 0] },
        {
          $cond: [
            {
              $lt: [
                {
                  $sum: {
                    $map: {
                      input: "$deliveries",
                      as: "delivery",
                      in: { $ifNull: ["$$delivery.billQuantity", 0] },
                    },
                  },
                },
                { $ifNull: ["$minimumPurchaseGuarantee", 0] },
              ],
            },
            { $ifNull: ["$minimumPurchaseGuarantee", 0] },
            {
              $sum: {
                $map: {
                  input: "$deliveries",
                  as: "delivery",
                  in: { $ifNull: ["$$delivery.billQuantity", 0] },
                },
              },
            },
          ],
        },
      ],
    },
  ],
});

/**
 * Calculate total purchase (WITHOUT subtracting advance)
 * Formula: Base Purchase
 * Note: Advance is not subtracted - it's handled separately in accounting
 */
export const getTotalPurchaseExpression = () => getBasePurchaseExpression();

/**
 * Calculate expenses from orderExpenses array
 * Formula: Sum of all expense amounts in orderExpenses
 */
export const getExpensesExpression = () => ({
  $sum: {
    $map: {
      input: { $ifNull: ["$orderExpenses", []] },
      as: "expense",
      in: { $ifNull: ["$$expense.orderExpenseAmount", 0] },
    },
  },
});

/**
 * Calculate profit
 * Formula: Total Sales - Total Purchase - Expenses
 * Note: This should be used in $addFields stage after calculating sales, purchase, and expenses
 */
export const getProfitExpression = (
  salesField = "$sales",
  purchaseField = "$purchase",
  expensesField = "$expenses"
) => ({
  $subtract: [salesField, { $add: [purchaseField, expensesField] }],
});

/**
 * Get aggregation expressions for all financial fields in a $group stage
 * Returns an object with sales, purchase, and expenses fields using $sum
 */
export const getFinancialGroupFields = () => ({
  sales: {
    $sum: getTotalSalesExpression(),
  },
  purchase: {
    $sum: getTotalPurchaseExpression(),
  },
  expenses: {
    $sum: getExpensesExpression(),
  },
});
