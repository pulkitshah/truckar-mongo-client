import tableFormatWithParticulars from "./tableFormatWithParticulars";
import standardTableFormat from "./standardTableFormat";

export default {
  standardTableFormat,
  tableFormatWithParticulars,
};
export const invoiceFormats = [
  {
    value: "standardTableFormat",
    label: "Standard Table Format",
  },
  {
    value: "tableFormatWithParticulars",
    label: "Table Format With Particulars",
  },
];
