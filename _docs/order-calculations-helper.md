# Order Calculations Helper Functions

This document describes the centralized helper functions for calculating sales, purchase, expenses, and profit across all analytics APIs.

## Location
- **File**: `src/helper/orderCalculations.js`
- **Exported from**: `src/helper/index.js`

## Purpose
These functions ensure consistent calculations across all analytics APIs by providing reusable MongoDB aggregation pipeline expressions. This follows the DRY (Don't Repeat Yourself) principle and eliminates calculation inconsistencies.

## Formula Reference

### Sales Calculation
```
Sales = Base Sales + LR Charges + Invoice Charges
```

**Note**: Advance is NOT subtracted from sales in analytics. Advances are handled separately in accounting/cash flow reports.

Where:
- **Base Sales**: 
  - If `saleType.value` is "fixed": use `saleRate`
  - If `saleType.value` is "quantity": use `saleRate × max(sum(billQuantity), minimumSaleGuarantee)`
- **LR Charges**: Sum of all `lrCharges.chargeDefaultAmount` from all deliveries
- **Invoice Charges**: Sum of all `invoiceCharges.amount` from all deliveries (NOT from invoices array)

### Purchase Calculation
```
Purchase = Base Purchase
```

**Note**: Advance is NOT subtracted from purchase in analytics. Advances are handled separately in accounting/cash flow reports.

Where:
- **Base Purchase**: 
  - If `purchaseType` (string) is "fixed": use `purchaseRate`
  - If `purchaseType` (string) is "quantity": use `purchaseRate × max(sum(billQuantity), minimumPurchaseGuarantee)`
  - **IMPORTANT**: `purchaseType` is a STRING field, not an object with `.value` property like `saleType`

### Expenses Calculation
```
Expenses = Sum of all orderExpenses.amount
```

### Profit Calculation
```
Profit = Sales - Purchase - Expenses
```

## Key Differences from Previous Implementation

1. **Advances are NOT subtracted**: The UI function `calculateAmountForOrder` accepts an `advance` parameter that defaults to `false`. Analytics should show gross sales/purchase without advance deductions.

2. **Invoice charges field**: Uses `delivery.invoiceCharges` directly (with `amount` property), NOT `delivery.invoices[].invoiceCharges`

3. **Purchase type**: `purchaseType` is a STRING, while `saleType` is an OBJECT with a `.value` property

4. **Minimum guarantees**: Both sale and purchase respect minimum guarantees when actual quantity is less

## Available Functions

### Individual Expression Functions

#### `getBaseSalesExpression()`
Returns MongoDB aggregation expression for base sales amount (without charges or advances).

#### `getLRChargesExpression()`
Returns expression to sum all LR charges from deliveries.

#### `getInvoiceChargesExpression()`
Returns expression to sum all invoice charges from delivery invoices.

#### `getTotalSalesExpression()`
Returns complete sales calculation expression (base + LR + invoice - advance).

#### `getBasePurchaseExpression()`
Returns expression for base purchase amount (without advance).

#### `getTotalPurchaseExpression()`
Returns complete purchase calculation expression (base - advance).

#### `getExpensesExpression()`
Returns expression to sum all order expenses.

#### `getProfitExpression(salesField, purchaseField, expensesField)`
Returns profit calculation expression. Optional parameters allow specifying field names (defaults: "$sales", "$purchase", "$expenses").

### Convenience Functions

#### `getFinancialGroupFields()`
Returns an object containing all three financial fields for use in `$group` stage:
```javascript
{
  sales: { $sum: getTotalSalesExpression() },
  purchase: { $sum: getTotalPurchaseExpression() },
  expenses: { $sum: getExpensesExpression() }
}
```

## Usage Examples

### Example 1: Using in $group Stage
```javascript
import { getFinancialGroupFields, getProfitExpression } from '../../../helper';

const results = await Order.aggregate([
  { $match: { ... } },
  {
    $group: {
      _id: "$customer",
      customerName: { $first: "$customerData.name" },
      ...getFinancialGroupFields(), // Spreads sales, purchase, expenses
      orderCount: { $sum: 1 },
    },
  },
  {
    $addFields: {
      profit: getProfitExpression(), // Calculates from $sales, $purchase, $expenses
    },
  },
]);
```

### Example 2: Using in $addFields Stage
```javascript
import {
  getTotalSalesExpression,
  getTotalPurchaseExpression,
  getExpensesExpression,
  getProfitExpression,
} from '../../../helper';

const results = await Order.aggregate([
  { $match: { ... } },
  {
    $addFields: {
      sales: getTotalSalesExpression(),
      purchase: getTotalPurchaseExpression(),
      expenses: getExpensesExpression(),
    },
  },
  {
    $addFields: {
      profit: getProfitExpression(),
    },
  },
]);
```

## APIs Updated

The following analytics APIs have been updated to use these helper functions:

1. **top-customers.js** - Top customers by profit
2. **top-transporters.js** - Top transporters by profit
3. **revenue-trend.js** - Daily/weekly/monthly revenue and profit trends
4. **revenue-details.js** - Individual order details with sales/profit
5. **financial-metrics.js** - Overall financial metrics and growth calculations

## Benefits

1. **Consistency**: All APIs use identical calculation logic
2. **Maintainability**: Update formula in one place, applies everywhere
3. **Accuracy**: Eliminates copy-paste errors and formula variations
4. **Testability**: Helper functions can be unit tested independently
5. **Documentation**: Formulas are clearly defined and commented
6. **Readability**: API code is cleaner and easier to understand

## Future Enhancements

If calculation formulas need to change (e.g., adding new charge types, changing advance handling), only update the helper functions in `orderCalculations.js`.

## Testing Checklist

When testing the updated APIs, verify:
- [ ] Sales includes base amount, LR charges, invoice charges, and subtracts advance
- [ ] Purchase includes base amount and subtracts purchase advance
- [ ] Profit = Sales - Purchase - Expenses
- [ ] Negative profits are now accurate (not artificially inflated)
- [ ] Date filtering works correctly for all APIs
- [ ] All widgets display consistent values
