# Balance Sheet Dashboard Page

## Purpose and Entry Point

- Available via the `Balance Sheet` tab in the authenticated dashboard navigation.
- Centralises customer receivables, transporter payables, and purchase voucher records for finance and operations teams.
- Designed to stay implementation-agnostic so that any front-end platform can replicate the behaviour while consuming a JS/REST backend.

## Global Layout

- Page header shows the title "Balance Sheet" and a supporting sentence that states the page purpose.
- Header actions include a `Refresh` button that simultaneously reloads receivable, payable, and voucher data. Disable this button while either data set is already loading.
- A tab strip sits under the header with three options: `Summary`, `Receivables`, and `Payables`. The active tab drives the main content region.
- Below the tabs, every section uses consistent spacing, card-like containers, dividers, and tables. Currency values are formatted with thousand separators, decimals, and local currency symbols; counts use compact number formatting.

## Summary Tab

### Metrics Row

- Four metric tiles summarise high-level balances:
  1. `Total Receivable` with helper text listing pending orders awaiting invoices and outstanding invoices.
  2. `Total Payable` with helper text listing pending purchase orders and a voucher volume summary (total currency and voucher count).
  3. `Net Outstanding` representing `Total Receivable – Total Payable`.
  4. `Pending Items` showing a triple count (`Deliveries / Purchase Orders / Pending Vouchers`).
- Tiles update once data loads; show inline helper captions for additional context.

### Receivables Table

- Card titled `Receivables` with subtitle "Customers with pending deliveries".
- Columns: Customer (name, city, phone), Orders count, Pending Deliveries, Sale Amount, Advance, Receivable.
- Empty state renders a friendly "All caught up" message when no receivables exist.
- Each row corresponds to one customer/party; values right-aligned for numeric columns.

### Payables Table

- Card titled `Payables` with subtitle "Transporters with pending purchase orders".
- Columns: Transporter (name, city, phone), Orders count, Pending Purchase count, Purchase Amount, Advance, Voucher Paid summary (currency plus count), Pending Vouchers summary, Payable.
- Empty state shows "No outstanding payables." when appropriate.

## Receivables Tab

### Orders Awaiting Invoices

- Section header contains an `Add Invoice` button (navigates to invoice creation), a description, a customer filter dropdown (`All Customers` plus individual parties with city tag), and a section-level `Refresh` icon button.
- Displays explanatory helper copy below the header when filtering.
- Table lists orders that lack invoices.
  - Grouped by month of sale with labelled band rows (`Month YYYY`).
  - Columns: Paid toggle (checkbox), Order number, Sale date, Customer, `Days After Billing`, Sale Amount, Advance, Outstanding, Status chip.
  - Paid toggle marks receivables as settled or pending; disable while an update is in flight. When ticked, status chip turns to a success colour and label uses capitalised status (defaults to "Pending").
  - Empty state card provides title/subtitle messaging.

### Invoices Awaiting Payment

- Header includes description and section-level `Refresh` button.
- Three summary tiles for the current customer filter:
  - `Outstanding Amount` with unpaid invoice count helper.
  - `Total Invoices` with paid count helper.
  - `Billed Amount` with average invoice value helper.
- Table of outstanding invoices:
  - Monthly grouping (issue date).
  - Columns: Paid toggle (checkbox), Invoice number, Invoice date, Customer, Orders (tooltip reveals full list and shows order count, quantity, and optional delivery date range), Quantity, Total Amount, Outstanding Amount, Status chip (colours: success for paid, warning for partial/pending, error otherwise), Paid Date.
  - Paid toggle invokes payment status update and shows a spinner-disabled state while saving.
  - Empty state card when no invoices match the filter.

### Paid Invoices

- Section without extra controls; reiterates the `Refresh` button from previous sections if needed.
- Table mirrors the structure of the unpaid invoices table (including grouping, tooltips, and toggles) but lists invoices already marked as paid.
- Empty state instructs users to mark invoices as paid to see them here.

## Payables Tab

### Transporter Dues

- Header includes description, transporter dropdown (`All Transporters` plus options with city labels), `Refresh` icon, and `Create Voucher` button.
- `Create Voucher` is enabled only when a specific transporter with pending payable orders is selected; tooltip explains disabled state.
- When `All Transporters` is selected, helper text reminds users to pick a single transporter for voucher workflow.
- Three summary tiles scoped to the current transporter selection:
  - `Outstanding payable`: currency total and pending order count.
  - `Already settled`: currency total and count of orders marked paid.
  - `Total purchases`: currency total with a caption naming the current transporter scope.
- Purchases table:
  - Grouped by month of purchase.
  - Columns: (No toggle here), Order number, Purchase date, Transporter, Purchase Amount, Advance (purchase side), Outstanding (payable), Payment Date, Status chip.
  - Rows highlight when status indicates completion; no manual toggle column to avoid conflicting edits.
  - Empty states differ for "All" vs specific transporter selections.

### Purchase Vouchers

- Header with description, `Refresh vouchers` icon, and `Add Entry` button (opens voucher form).
- Summary tiles scoped by transporter filter:
  - `Filtered Amount` with caption clarifying whether transporters are scoped.
  - `Voucher Count` with helper referencing total lifetime vouchers and aggregated currency/count.
  - `Latest Voucher` showing the most recent voucher issue or payment date.
- Table grouped by voucher month:
  - Columns: Date, Voucher ID (truncated when long), Transporter (name, city, mobile), Amount, Orders (tooltip lists all linked order numbers plus count), Payment Date, Reference, Notes, Status, Actions.
  - Actions include: edit (prefills dialog), preview PDF (opens viewer dialog), and download PDF.
  - Status column uses pill badges to denote completion state.
  - Empty state card invites users to create the first voucher entry.

## Voucher Workflows and Dialogs

### Purchase Voucher Dialog

- Triggered by `Add Entry` or editing a row.
- Requires organisation and transporter selection, voucher month, voucher date, amount (numeric with positive validation), payment date, optional reference, notes, and auto-displays linked order summary when prefilled.
- Form validates required fields and rejects negative or non-numeric amount input. Submit button respects `isSaving` guard and shows contextual primary text (`Add Entry` vs `Save Changes`).

### Voucher Builder Dialog

- Reached via `Create Voucher` on the Transporter Dues section.
- Shows transporter identity (name, optional city) and lets users choose voucher month and predefined date ranges (`Full month`, `1st – 15th`, `16th – end`, or `Manual`).
- Order list table limited to selected month with checkboxes and bulk toggle; manual mode enables granular selection.
- Footer summary displays selected order count and total payable.
- `Continue` transitions into the Purchase Voucher dialog with the chosen orders prelinked; disabled until at least one order is selected.

### Voucher PDF Preview Dialog

- Launches from the `Preview PDF` action in the vouchers table.
- Opens full-width dialog with embed-capable PDF viewer of the voucher plus linked orders; fallback message explains when preview is unavailable (e.g., before client render).
- `Close` button dismisses the preview; `Download PDF` action remains available separately on the table row.

## Loading, Error, and Empty States

- While data loads, main sections render centred spinners sized for the context (full-height for major tables, compact for voucher listings).
- Fetch errors display inline alerts with descriptive messages, prompting the user to retry via refresh controls.
- Empty datasets show bordered placeholder cards with descriptive titles and helper text to guide next steps.

## Interaction Notes

- All monetary figures use a unified currency formatter; numeric volumes use grouping separators.
- Status toggles only change when the related update call succeeds; toasts (or platform equivalents) should acknowledge success or failure.
- Month-based grouping headers separate table rows into logical periods for easier reconciliation.
- Tooltips surface when content truncation occurs (e.g., long order lists, vouchers with many linked orders).
- Filters on customer and transporter contexts cascade across the metrics, tables, and voucher aggregates for a consistent view.
