import React, { useState } from "react";
import PropTypes from "prop-types";
import { Grid, TextField } from "@mui/material";
import { lrFormats } from "../../../grids/lr-formats";

const LrFormatAutocomplete = ({ formik }) => {
  return (
    <>
      <Grid container spacing={3} justifyContent="space-between">
        <Grid item xs={6}>
          <TextField
            disabled={true}
            error={Boolean(
              formik.touched.lrFormatFileName && formik.errors.lrFormatFileName
            )}
            onBlur={formik.handleBlur}
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
            id="lrFormatFileName"
            label="LR Format"
            name="lrFormatFileName"
            select
            value={formik.values.lrFormatFileName}
            onChange={(event) => {
              event.target.value;
              formik.setFieldValue("lrFormatFileName", event.target.value);
            }}
            SelectProps={{
              native: true,
            }}
            variant="outlined"
          >
            {lrFormats.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </TextField>
        </Grid>
        {/* <Grid item>
          <Button color="secondary" onClick={() => {}}>
            Preview LR
          </Button>
        </Grid> */}
        {/* <Grid item>
          <Button
            color="secondary"
            onClick={() => handleSetDefault(formik.values.lrFormatFileName)}
            disabled={formik.values.isDefault}
          >
            Set Default
          </Button>
        </Grid> */}
      </Grid>
    </>
  );
};

LrFormatAutocomplete.propTypes = {
  className: PropTypes.string,
};

export default LrFormatAutocomplete;
