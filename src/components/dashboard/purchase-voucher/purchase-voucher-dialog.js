import PropTypes from "prop-types";
import * as Yup from "yup";
import { FormikProvider, useFormik } from "formik";
import { useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import PartyAutocomplete from "../autocompletes/party-autocomplete/party-autocomplete";
import OrganisationAutocomplete from "../autocompletes/organisation-autcomplete/organisation-autocomplete";

const defaultInitialValues = {
  transporter: null,
  organisation: null,
  period: null,
  voucherDate: null,
  amount: "",
  paymentDate: null,
  reference: "",
  notes: "",
  linkedOrders: [],
};

const validationSchema = Yup.object({
  organisation: Yup.object().nullable().required("Organisation is required"),
  transporter: Yup.object().nullable().required("Transporter is required"),
  period: Yup.date().required("Month is required"),
  voucherDate: Yup.date().required("Voucher date is required"),
  amount: Yup.number()
    .typeError("Amount must be a number")
    .min(0, "Amount must be positive")
    .required("Amount is required"),
  paymentDate: Yup.date().required("Payment date is required"),
});

export const PurchaseVoucherDialog = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  isSaving = false,
}) => {
  const normalizedInitialValues = useMemo(() => {
    const merged = {
      ...defaultInitialValues,
      ...initialValues,
    };

    const ensureDate = (value, fallback) => {
      if (!value) {
        return fallback;
      }
      const dateInstance = value instanceof Date ? value : new Date(value);
      return Number.isNaN(dateInstance.getTime()) ? fallback : dateInstance;
    };

    return {
      ...merged,
      organisation:
        merged.organisation && typeof merged.organisation === "object"
          ? merged.organisation
          : null,
      period: ensureDate(merged.period, new Date()),
      voucherDate: ensureDate(merged.voucherDate, new Date()),
      paymentDate: ensureDate(merged.paymentDate, new Date()),
      amount:
        merged.amount !== undefined && merged.amount !== null
          ? merged.amount
          : "",
      linkedOrders: Array.isArray(merged.linkedOrders)
        ? merged.linkedOrders
        : [],
    };
  }, [initialValues]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: normalizedInitialValues,
    validationSchema,
    onSubmit: async (values, helpers) => {
      try {
        const result = await onSubmit(values);
        if (result !== false) {
          helpers.resetForm({ values: normalizedInitialValues });
        } else {
          helpers.setSubmitting(false);
        }
      } catch (error) {
        console.error("[PurchaseVoucherDialog]", error);
        helpers.setSubmitting(false);
        helpers.setStatus({ success: false });
        helpers.setErrors({ submit: error?.message || "Failed to save" });
      }
    },
  });

  const { values, touched, errors, handleChange, handleBlur, setFieldValue } =
    formik;

  const linkedOrderSummary = values.linkedOrders?.length
    ? values.linkedOrders
        .map((order) =>
          [order.orderNo, order.orderId].filter(Boolean).join(" - ")
        )
        .join(", ")
    : "";

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={onClose}
        open={open}
        aria-labelledby="purchase-voucher-dialog"
      >
        <FormikProvider value={formik}>
          <form onSubmit={formik.handleSubmit}>
            <DialogTitle id="purchase-voucher-dialog">
              {initialValues?._id
                ? "Edit Purchase Entry"
                : "Add Purchase Entry"}
            </DialogTitle>
            <DialogContent dividers>
              {linkedOrderSummary ? (
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.default",
                  }}
                >
                  <Typography variant="subtitle2">
                    Linked Orders ({values.linkedOrders.length})
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {linkedOrderSummary}
                  </Typography>
                </Box>
              ) : null}
              <Grid container spacing={3} sx={{ mt: 0, pt: 0 }}>
                <Grid item xs={12}>
                  <OrganisationAutocomplete formik={formik} />
                </Grid>
                <Grid item xs={12}>
                  <PartyAutocomplete formik={formik} type="transporter" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    views={["year", "month"]}
                    label="Month"
                    value={values.period}
                    onChange={(date) => setFieldValue("period", date)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        onBlur={handleBlur}
                        error={Boolean(touched.period && errors.period)}
                        helperText={touched.period && errors.period}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Voucher Date"
                    value={values.voucherDate}
                    onChange={(date) => setFieldValue("voucherDate", date)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        onBlur={handleBlur}
                        error={Boolean(
                          touched.voucherDate && errors.voucherDate
                        )}
                        helperText={touched.voucherDate && errors.voucherDate}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Amount"
                    name="amount"
                    type="number"
                    value={values.amount}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.amount && errors.amount)}
                    helperText={touched.amount && errors.amount}
                    inputProps={{ min: 0, step: "0.01" }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Payment Date"
                    value={values.paymentDate}
                    onChange={(date) => setFieldValue("paymentDate", date)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        onBlur={handleBlur}
                        error={Boolean(
                          touched.paymentDate && errors.paymentDate
                        )}
                        helperText={
                          touched.paymentDate && errors.paymentDate
                        }
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Reference"
                    name="reference"
                    value={values.reference}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    value={values.notes}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    multiline
                    minRows={3}
                  />
                </Grid>
              </Grid>
              {formik.errors.submit ? (
                <Box sx={{ mt: 2, color: "error.main", fontSize: 13 }}>
                  {formik.errors.submit}
                </Box>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                variant="contained"
                disabled={isSaving || formik.isSubmitting}
              >
                {initialValues?._id ? "Save Changes" : "Add Entry"}
              </Button>
            </DialogActions>
          </form>
        </FormikProvider>
      </Dialog>
    </LocalizationProvider>
  );
};

PurchaseVoucherDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func.isRequired,
  initialValues: PropTypes.object,
  isSaving: PropTypes.bool,
};
