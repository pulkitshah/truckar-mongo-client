import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "../../../../store";
import { vehicleNumberFormatter } from "../../../../utils/customFormatters";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { Divider, Grid, TextField } from "@mui/material";
import { vehicleApi } from "../../../../api/vehicle-api";
import { useAuth } from "../../../../hooks/use-auth";

const VehicleAutocomplete = ({
  sx,
  touched,
  setFieldValue,
  errors,
  handleBlur,
  setSelectedVehicle,
  setDriver,
  currentValue,
  user,
}) => {
  const dispatch = useDispatch();
  const { account } = useAuth();
  const [open, setOpen] = useState(false);
  const { vehicles = [] } = useSelector(
    (state) => state.vehicles || { vehicles: [] }
  );
  const accountId = account?._id || account?.id;
  const filter = createFilterOptions();

  const [value, setValue] = useState(() => {
    if (typeof currentValue === "object" && currentValue !== null) {
      return currentValue;
    }

    if (typeof currentValue === "string") {
      const formatted = currentValue.toUpperCase();
      return formatted || null;
    }

    return currentValue || null;
  });

  const [inputValue, setInputValue] = useState(() => {
    if (typeof currentValue === "object" && currentValue !== null) {
      return currentValue.vehicleNumber || "";
    }

    if (typeof currentValue === "string") {
      return currentValue.toUpperCase();
    }

    return "";
  });

  const getVehiclesByAccount = useCallback(async () => {
    try {
      if (accountId) {
        await vehicleApi.getVehiclesByAccount(dispatch, accountId);
      }
    } catch (err) {
      console.error(err);
    }
  }, [dispatch, accountId]);

  useEffect(() => {
    try {
      getVehiclesByAccount();
    } catch (error) {
      console.log(error);
    }
  }, [getVehiclesByAccount]);

  useEffect(() => {
    if (!currentValue) {
      setValue(null);
      setInputValue("");
      return;
    }

    if (typeof currentValue === "object") {
      setValue(currentValue);
      setInputValue(currentValue?.vehicleNumber || "");
      return;
    }

    if (typeof currentValue === "string") {
      const formatted = currentValue.toUpperCase();
      setValue(formatted || null);
      setInputValue(formatted);
    }
  }, [currentValue]);

  const normalizeVehicleNumber = (candidate) => {
    if (!candidate) {
      return "";
    }

    if (typeof candidate === "string") {
      return candidate.toUpperCase();
    }

    if (typeof candidate === "object") {
      if (candidate.inputValue) {
        return candidate.inputValue.toUpperCase();
      }

      if (candidate.vehicleNumber) {
        return candidate.vehicleNumber.toUpperCase();
      }
    }

    return "";
  };

  const handleOnChange = async (event, newValue) => {
    const hasCreateValue =
      newValue && typeof newValue === "object" && newValue.inputValue;

    if (!newValue) {
      setValue(null);
      setInputValue("");
      setSelectedVehicle && setSelectedVehicle("");
      setFieldValue("vehicle", "");
      setFieldValue("transporter", null);
      setFieldValue("driver", "");
      setDriver && setDriver(null);
      return;
    }

    if (hasCreateValue) {
      const formatted = normalizeVehicleNumber(newValue);
      setValue(formatted);
      setInputValue(formatted);
      setFieldValue("vehicle", formatted);
      setFieldValue("transporter", null);
      setSelectedVehicle && setSelectedVehicle(formatted);
      setFieldValue("driver", "");
      setDriver && setDriver(null);
      return;
    }

    const isObject = newValue && typeof newValue === "object";

    if (isObject) {
      setValue(newValue);
      setInputValue(normalizeVehicleNumber(newValue));
      setFieldValue("vehicle", newValue);
      setSelectedVehicle && setSelectedVehicle(newValue);
      setFieldValue("transporter", newValue?.transporter || null);

      if (setDriver) {
        if (!newValue?.transporter) {
          setDriver(newValue?.driver || null);
        } else {
          setDriver(null);
        }
      }

      if (!newValue?.transporter) {
        setFieldValue("driver", newValue?.driver || "");
      } else {
        setFieldValue("driver", "");
      }

      return;
    }

    const formattedValue = normalizeVehicleNumber(newValue);
    setValue(formattedValue);
    setInputValue(formattedValue);
    setFieldValue("vehicle", formattedValue);
    setSelectedVehicle && setSelectedVehicle(formattedValue);
    setFieldValue("driver", "");
    setDriver && setDriver(null);
    setFieldValue("transporter", null);
  };

  const handleInputChange = (event, newInputValue, reason) => {
    if (reason === "input") {
      const formatted = normalizeVehicleNumber(newInputValue);
      setInputValue(formatted);
      setValue(formatted);
      setSelectedVehicle && setSelectedVehicle(formatted);
      setFieldValue("vehicle", formatted);
      setFieldValue("driver", "");
      setDriver && setDriver(null);
      setFieldValue("transporter", null);

      return;
    }

    if (reason === "clear") {
      setInputValue("");
      setValue(null);
      setSelectedVehicle && setSelectedVehicle("");
      setFieldValue("vehicle", "");
      setFieldValue("transporter", null);
      setFieldValue("driver", "");
      setDriver && setDriver(null);
      return;
    }

    if (typeof newInputValue === "string") {
      setInputValue(normalizeVehicleNumber(newInputValue));
      setFieldValue("transporter", null);
      return;
    }

    if (newInputValue && typeof newInputValue === "object") {
      setInputValue(normalizeVehicleNumber(newInputValue));
      setFieldValue("transporter", newInputValue?.transporter || null);
      return;
    }

    setInputValue(newInputValue || "");
  };

  return (
    <Grid item>
      <Autocomplete
        sx={sx}
        freeSolo
        autoSelect={true}
        blurOnSelect={true}
        id="vehicle"
        open={open}
        onOpen={() => {
          setOpen(true);
        }}
        onClose={() => {
          setOpen(false);
        }}
        isOptionEqualToValue={(option, val) => {
          if (
            typeof option === "string" ||
            typeof val === "string" ||
            option === null ||
            val === null
          ) {
            return option === val;
          }

          return option?._id === val?._id;
        }}
        filterOptions={(options = [], params) => {
          const filtered = filter(options, params);
          const typedValue = normalizeVehicleNumber(params.inputValue);

          const exists = options.some((option) => {
            if (!option) {
              return false;
            }

            return normalizeVehicleNumber(option) === typedValue;
          });

          if (typedValue && !exists) {
            filtered.push({
              inputValue: typedValue,
              vehicleNumber: typedValue,
              isCreateOption: true,
            });
          }

          return filtered;
        }}
        getOptionLabel={(option) => normalizeVehicleNumber(option)}
        options={vehicles || []}
        value={value}
        onChange={handleOnChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        renderOption={(props, option) => {
          const isCreateOption = Boolean(option?.isCreateOption);
          const key =
            option?._id ||
            option?.id ||
            option?.vehicleNumber ||
            option?.inputValue ||
            option;
          const label = normalizeVehicleNumber(option);
          const displayLabel = isCreateOption ? `Add "${label}"` : label;

          return (
            <React.Fragment>
              <li {...props} key={key}>
                {displayLabel}
                {!isCreateOption && <Divider />}
              </li>
            </React.Fragment>
          );
        }}
        fullWidth
        renderInput={(params) => (
          <TextField
            {...params}
            name="vehicle"
            label="Vehicle"
            variant="outlined"
            error={Boolean(touched.vehicle && errors.vehicle)}
            fullWidth
            helperText={touched.vehicle && errors.vehicle}
            onBlur={handleBlur}
            InputProps={{
              ...params.InputProps,
              inputComponent: vehicleNumberFormatter,
              endAdornment: (
                <React.Fragment>
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
      />
    </Grid>
  );
};

VehicleAutocomplete.propTypes = {
  className: PropTypes.string,
};

export default VehicleAutocomplete;
