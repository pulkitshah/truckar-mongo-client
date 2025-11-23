import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import * as Yup from "yup";
import { useFormik } from "formik";
import moment from "moment";

import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useAuth } from "../../../hooks/use-auth";
import PartyAutocomplete from "../autocompletes/party-autocomplete/party-autocomplete";
import AddressAutocomplete from "../autocompletes/address-autocomplete/address-autocomplete";
import OrganisationAutocomplete from "../autocompletes/organisation-autcomplete/organisation-autocomplete";
import OrderDetailsGrid from "./order-details-ag-grid";
import DeliveryDetails from "./delivery-details";
import { useDispatch } from "../../../store";
import { invoiceApi } from "../../../api/invoice-api";
import { calculateAmountForDeliveryNew } from "../../../utils/amount-calculation";

export const InvoiceCreateForm = ({ invoice = {} }) => {
  const router = useRouter();
  const { account } = useAuth();
  const dispatch = useDispatch();

  const subtotal = useRef(0);
  const [isFetchingInvoiceNo, setIsFetchingInvoiceNo] = useState(false);
  const [invoiceNoManuallyEdited, setInvoiceNoManuallyEdited] = useState(false);
  const lastAutoFilledInvoiceRef = useRef({
    organisation: null,
    fiscalKey: null,
  });
  const previousCombinationRef = useRef(null);
  const isEditMode = Boolean(invoice?._id);

  let validationShape = {
    invoiceNo: Yup.number()
      .required("Invoice No is required")
      .test({
        name: "Checking Duplicate Order No",
        exclusive: false,
        params: {},
        message:
          "Invoice No cannot be repeated in the fiscal year of invoice date in the same organisation.",
        test: async function (value) {
          try {
            if (!this.parent.organisation) return false;

            const response = await invoiceApi.validateDuplicateInvoiceNo({
              invoiceNo: value,
              invoiceDate: this.parent.invoiceDate,
              organisation: this.parent.organisation._id,
              account: account._id,
            });
            return response.data;
          } catch (error) {
            console.log(error);
          }
        },
      }),
    invoiceDate: Yup.object().required("Invoice Date is required"),
    customer: Yup.object().nullable().required("Customer is required"),
    organisation: Yup.object().nullable().required("Organisation is required"),
    billingAddress: Yup.object()
      .nullable()
      .required("Billing Address is required"),
  };

  const formik = useFormik({
    initialValues: {
      organisation: invoice.organisation || "",
      invoiceDate: invoice.invoiceDate || moment(),
      invoiceNo: invoice.invoiceNo || "",
      customer: invoice.customer || null,
      billingAddress: invoice.billingAddress || null,
      deliveries: invoice.deliveries || [],
      subtotal: invoice.subtotal || 0,
      taxes: invoice.taxes ? invoice.taxes : [],
    },
    validationSchema: Yup.object().shape(validationShape),
    onSubmit: async (values, helpers) => {
      try {
        console.log(values);
        let newInvoice = {
          organisation: values.organisation,
          invoiceNo: values.invoiceNo || "",
          invoiceDate: values.invoiceDate.format(),
          customer: values.customer._id,
          billingAddress: values.billingAddress._id,
          deliveries: values.deliveries,
          invoiceFormat: account.invoiceFormat,
          subtotal: subtotal.current,
          account: account._id,
        };
        let { data } = await invoiceApi.createInvoice(newInvoice, dispatch);

        console.log(data);

        toast.success("Invoice created!");
        router.push("/dashboard/invoices");
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong!");
        helpers.setStatus({ success: false });
        helpers.setErrors({ submit: err.message });
        helpers.setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    subtotal.current = 0;
    formik.values.deliveries.map((del) => {
      subtotal.current =
        subtotal.current +
        calculateAmountForDeliveryNew(del, "freight+lr+invoice");
    });
  }, [formik.values.deliveries]);

  console.log(subtotal.current);

  useEffect(() => {
    if (!account?._id || isEditMode) {
      return;
    }

    const organisationId = formik.values.organisation?._id;
    const invoiceDate = formik.values.invoiceDate;

    if (!organisationId || !invoiceDate) {
      return;
    }

    const fiscalKey = `${organisationId}-${moment(invoiceDate)
      .startOf("day")
      .format("YYYY-MM-DD")}`;
    const combinationKey = fiscalKey;

    if (previousCombinationRef.current !== combinationKey) {
      previousCombinationRef.current = combinationKey;
      setInvoiceNoManuallyEdited(false);
    }

    const currentValue = formik.values.invoiceNo;
    const lastAuto = lastAutoFilledInvoiceRef.current;

    if (
      lastAuto.organisation === organisationId &&
      lastAuto.fiscalKey === fiscalKey &&
      currentValue
    ) {
      return;
    }

    if (invoiceNoManuallyEdited && currentValue) {
      return;
    }

    let isActive = true;
    setIsFetchingInvoiceNo(true);

    (async () => {
      try {
        const { data, error } = await invoiceApi.getNextInvoiceNumber({
          account: account._id,
          organisation: organisationId,
          invoiceDate: invoiceDate.format(),
        });

        if (!isActive) {
          return;
        }

        if (error) {
          throw new Error(error);
        }

        if (typeof data === "number") {
          formik.setFieldValue("invoiceNo", String(data), false);
          lastAutoFilledInvoiceRef.current = {
            organisation: organisationId,
            fiscalKey,
          };
        }
      } catch (err) {
        if (isActive) {
          console.error(err);
          toast.error(err.message || "Unable to fetch next invoice number.");
        }
      } finally {
        if (isActive) {
          setIsFetchingInvoiceNo(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [
    account?._id,
    formik.values.organisation,
    formik.values.invoiceDate,
    formik.values.invoiceNo,
    invoiceNoManuallyEdited,
    isEditMode,
  ]);

  const invoiceNoError = formik.touched.invoiceNo && formik.errors.invoiceNo;
  let invoiceNoHelperText = "";

  if (invoiceNoError) {
    invoiceNoHelperText = formik.errors.invoiceNo;
  } else if (isFetchingInvoiceNo) {
    invoiceNoHelperText = "Fetching next invoice number...";
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item md={4} xs={12}>
              <Typography variant="h6">Basic details</Typography>
            </Grid>
            <Grid item md={8} xs={12}>
              <Grid container spacing={3}>
                <Grid item md={4} xs={12}>
                  <OrganisationAutocomplete formik={formik} account={account} />
                </Grid>
                <Grid item md={4} xs={12}>
                  <DatePicker
                    _id="invoiceDate"
                    name="invoiceDate"
                    label="Invoice date"
                    showTodayButton={true}
                    inputFormat="DD/MM/YYYY"
                    value={formik.values.invoiceDate}
                    onClick={() => setFieldTouched("end")}
                    onChange={(date) =>
                      formik.setFieldValue("invoiceDate", moment(date))
                    }
                    slotProps={{
                      textField: {
                        helperText:
                          formik.touched.invoiceDate &&
                          formik.errors.invoiceDate,
                        error: Boolean(
                          formik.touched.invoiceDate &&
                            formik.errors.invoiceDate
                        ),
                      },
                    }}
                    renderInput={(params) => (
                      <TextField fullWidth {...params} />
                    )}
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <TextField
                    error={Boolean(invoiceNoError)}
                    fullWidth
                    helperText={invoiceNoHelperText}
                    label="Invoice No"
                    name="invoiceNo"
                    onBlur={formik.handleBlur}
                    onChange={(event) => {
                      setInvoiceNoManuallyEdited(true);
                      formik.setFieldValue(`invoiceNo`, event.target.value);
                    }}
                    value={formik.values.invoiceNo}
                    InputProps={{
                      endAdornment: isFetchingInvoiceNo ? (
                        <InputAdornment position="end">
                          <CircularProgress size={16} />
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item md={4} xs={12}>
              <Typography sx={{ mb: 3 }} variant="h6">
                Party details
              </Typography>
            </Grid>
            <Grid item md={8} xs={12}>
              <Grid container spacing={3}>
                <Grid item md={4} xs={12}>
                  <PartyAutocomplete
                    errors={formik.errors}
                    touched={formik.touched}
                    setFieldValue={formik.setFieldValue}
                    handleBlur={formik.handleBlur}
                    type="customer"
                    account={account}
                    formik={formik}
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <AddressAutocomplete
                    type={"billingAddress"}
                    party={formik.values.customer && formik.values.customer._id}
                    account={account}
                    formik={formik}
                    disabled={
                      !Boolean(
                        formik.values.customer && formik.values.customer._id
                      )
                    }
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {formik.values.customer && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6">Deliveries</Typography>
                <Box sx={{ mt: 3, px: 3, height: "40vh", width: "100%" }}>
                  <OrderDetailsGrid formik={formik} />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {formik.values.deliveries.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6">Invoice Description</Typography>
              </Grid>
              <Grid item xs={12}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <DeliveryDetails formik={formik} />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          mx: -1,
          mb: -1,
          mt: 3,
        }}
      >
        <Button
          color="error"
          sx={{
            m: 1,
            mr: "auto",
          }}
        >
          Delete
        </Button>
        <Button sx={{ m: 1 }} variant="outlined">
          Cancel
        </Button>
        <Button sx={{ m: 1 }} type="submit" variant="contained">
          Create
        </Button>
      </Box>
    </form>
  );
};
