import React from "react";
import { v4 as uuidv4 } from "uuid";
import { FormikProvider, FieldArray, getIn } from "formik";
import {
  Grid,
  Typography,
  Button,
  Divider,
  InputAdornment,
  TextField,
} from "@mui/material";
import { Trash as TrashIcon } from "../../../icons/trash";
import { Plus as PlusIcon } from "../../../icons/plus";
import GoogleMaps from "./google-places-autocomplete";

const DeliveryForm = ({ sx, formik, ...rest }) => {
  const totalDeliveries = formik.values.deliveries?.length || 0;

  return (
    <React.Fragment>
      <FormikProvider value={formik}>
        <FieldArray name="deliveries" error={formik.errors}>
          {({ remove, push }) => (
            <React.Fragment>
              <Grid
                container
                spacing={3}
                justifyContent="space-between"
                alignItems={"center"}
                sx={{ mb: 3, ...sx }}
              >
                <Grid item>
                  <Typography variant="h6">
                    Total Deliveries: {totalDeliveries}
                  </Typography>
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<PlusIcon fontSize="small" />}
                    onClick={() => {
                      push({
                        _id: uuidv4(),
                        loading: {},
                        unloading: {},
                        billQuantity: "",
                        unloadingQuantity: "",
                      });
                    }}
                  >
                    Add Delivery
                  </Button>
                </Grid>
              </Grid>

              {formik.values.deliveries.length > 0 &&
                formik.values.deliveries.map((delivery, index) => {
                  const loading = `deliveries[${index}].loading`;
                  const touchedLoading = getIn(formik.touched, loading);
                  const errorLoading = getIn(formik.errors, loading);

                  const unloading = `deliveries[${index}].unloading`;
                  const touchedUnloading = getIn(formik.touched, unloading);
                  const errorUnloading = getIn(formik.errors, unloading);

                  const billQuantity = `deliveries[${index}].billQuantity`;
                  const touchedBillQuantity = getIn(
                    formik.touched,
                    billQuantity
                  );
                  const errorBillQuantity = getIn(formik.errors, billQuantity);

                  const unloadingQuantity = `deliveries[${index}].unloadingQuantity`;
                  const touchedUnloadingQuantity = getIn(
                    formik.touched,
                    unloadingQuantity
                  );
                  const errorUnloadingQuantity = getIn(
                    formik.errors,
                    unloadingQuantity
                  );
                  const deliveryKey = delivery?._id || `${index}`;

                  return (
                    <React.Fragment key={deliveryKey}>
                      {index > 0 && <Divider sx={{ mb: 2 }} />}

                      <Grid
                        container
                        spacing={1}
                        className="row"
                        key={index}
                        alignItems={"center"}
                        sx={{ mb: 2 }}
                      >
                        <Grid item md={5} xs={12} className="col" key={index}>
                          <GoogleMaps
                            label={"Loading"}
                            error={errorLoading}
                            touched={touchedLoading}
                            values={formik.values}
                            index={index}
                            type="loading"
                            formik={formik}
                          />
                        </Grid>
                        <Grid item md={5} xs={12} className="col">
                          <GoogleMaps
                            label={"Unloading"}
                            error={errorUnloading}
                            touched={touchedUnloading}
                            values={formik.values}
                            index={index}
                            type="unloading"
                            formik={formik}
                          />
                        </Grid>
                        <Grid item className="col">
                          <Button
                            disabled={index < 1}
                            color="error"
                            onClick={() => {
                              remove(index);
                            }}
                          >
                            <TrashIcon fontSize="small" />
                          </Button>
                        </Grid>
                      </Grid>
                      <Grid
                        container
                        spacing={1}
                        className="row"
                        key={index + 1}
                        alignItems={"center"}
                        sx={{ mb: 2 }}
                      >
                        <Grid item md={5} xs={12} className="col" key={index}>
                          <TextField
                            helperText={
                              touchedBillQuantity && errorBillQuantity
                                ? errorBillQuantity
                                : ""
                            }
                            error={Boolean(
                              touchedBillQuantity && errorBillQuantity
                            )}
                            variant="outlined"
                            name={`deliveries[${index}].billQuantity`}
                            id={`deliveries[${index}].billQuantity`}
                            onChange={formik.handleChange}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  {`${formik.values.saleType.unit}`}
                                </InputAdornment>
                              ),
                            }}
                            onBlur={formik.handleBlur}
                            label="Bill Quantity"
                            fullWidth
                            value={formik.values.deliveries[index].billQuantity}
                          />
                        </Grid>
                        <Grid item md={5} xs={12} className="col">
                          <TextField
                            helperText={
                              touchedUnloadingQuantity && errorUnloadingQuantity
                                ? errorUnloadingQuantity
                                : ""
                            }
                            error={Boolean(
                              touchedUnloadingQuantity && errorUnloadingQuantity
                            )}
                            variant="outlined"
                            name={`deliveries[${index}].unloadingQuantity`}
                            id={`deliveries[${index}].unloadingQuantity`}
                            onChange={formik.handleChange}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  {`${formik.values.saleType.unit}`}
                                </InputAdornment>
                              ),
                            }}
                            onBlur={formik.handleBlur}
                            label="Unloading Quantity"
                            fullWidth
                            value={
                              formik.values.deliveries[index].unloadingQuantity
                            }
                          />
                        </Grid>
                      </Grid>
                    </React.Fragment>
                  );
                })}
            </React.Fragment>
          )}
        </FieldArray>
      </FormikProvider>
    </React.Fragment>
  );
};

export default DeliveryForm;
