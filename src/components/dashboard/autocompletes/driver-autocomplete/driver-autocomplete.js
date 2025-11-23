import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import toast from "react-hot-toast";
import { Grid, TextField } from "@mui/material";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { driverApi } from "../../../../api/driver-api";
import { useMounted } from "../../../../hooks/use-mounted";
import { useAuth } from "../../../../hooks/use-auth";

const filter = createFilterOptions();

const toTitleCase = (value = "") =>
  value.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );

const normalizeName = (candidate = "") =>
  candidate.trim().toLowerCase().replace(/\s+/g, " ");

const DriverAutocomplete = ({ formik }) => {
  const { account } = useAuth();
  const accountId = account?._id || account?.id;
  const isMounted = useMounted();

  const [open, setOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [value, setValue] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { touched, errors, handleBlur, setFieldValue, values } = formik;
  const selectedVehicle = values?.vehicle;

  const fetchDrivers = useCallback(async () => {
    if (!accountId) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await driverApi.getDriversByAccount({
        account: accountId,
      });

      if (response?.data && isMounted()) {
        setDrivers(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [accountId, isMounted]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    const currentValue = values?.driver;

    if (!currentValue) {
      setValue(null);
      setInputValue("");
      return;
    }

    if (typeof currentValue === "object") {
      setValue(currentValue);
      setInputValue(currentValue?.name || "");
      return;
    }

    setValue({ name: currentValue, isLegacy: true });
    setInputValue(currentValue);
  }, [values?.driver]);

  const selectDriver = useCallback(
    (driverOption) => {
      if (!driverOption) {
        setFieldValue("driver", "");
        setValue(null);
        setInputValue("");
        return;
      }

      setValue(driverOption);
      setInputValue(driverOption?.name || "");
      setFieldValue("driver", driverOption);
    },
    [setFieldValue]
  );

  const ensureDriverCreation = useCallback(
    async (rawName) => {
      const trimmed = rawName.trim();

      if (!trimmed) {
        return;
      }

      const formattedName = toTitleCase(trimmed);
      const normalized = normalizeName(formattedName);

      const existingDriver = drivers.find(
        (option) => normalizeName(option?.name || "") === normalized
      );

      if (existingDriver) {
        selectDriver(existingDriver);
        return;
      }

      if (!accountId) {
        toast.error("Unable to create driver without account context.");
        return;
      }

      setIsCreating(true);

      try {
        const duplicateCheck = await driverApi.validateDuplicateName(
          accountId,
          formattedName
        );

        if (duplicateCheck?.data === false) {
          toast.error("Driver already exists. Please pick it from the list.");
          await fetchDrivers();
          return;
        }

        const payload = {
          name: formattedName,
          account: accountId,
        };

        if (
          selectedVehicle &&
          typeof selectedVehicle === "object" &&
          (selectedVehicle?._id || selectedVehicle?.id)
        ) {
          payload.vehicle = selectedVehicle._id || selectedVehicle.id;
        }

        const creation = await driverApi.createDriver(payload);

        if (creation?.error || !creation?.data) {
          throw new Error(creation?.error || "Driver creation failed");
        }

        const createdDriver = creation.data;
        setDrivers((previous) => [...previous, createdDriver]);
        selectDriver(createdDriver);
        toast.success(`Driver ${createdDriver.name} added`);
      } catch (error) {
        console.error(error);
        toast.error("Failed to create driver. Please try again.");
      } finally {
        if (isMounted()) {
          setIsCreating(false);
        }
      }
    },
    [accountId, drivers, fetchDrivers, isMounted, selectDriver, selectedVehicle]
  );

  const handleOnChange = useCallback(
    async (event, newValue) => {
      if (!newValue) {
        selectDriver(null);
        return;
      }

      if (typeof newValue === "string") {
        await ensureDriverCreation(newValue);
        return;
      }

      if (newValue?.inputValue) {
        await ensureDriverCreation(newValue.inputValue);
        return;
      }

      selectDriver(newValue);
    },
    [ensureDriverCreation, selectDriver]
  );

  const handleInputChange = useCallback(
    (event, newInputValue, reason) => {
      if (reason === "clear") {
        selectDriver(null);
        return;
      }

      if (reason === "reset") {
        return;
      }

      setInputValue(newInputValue);
    },
    [selectDriver]
  );

  const isOptionEqualToValue = useCallback((option, current) => {
    if (!option && !current) {
      return true;
    }

    const optionId = option?._id || option?.id;
    const currentId = current?._id || current?.id;

    if (optionId && currentId) {
      return optionId === currentId;
    }

    const optionName = normalizeName(option?.name || "");
    const currentName = normalizeName(current?.name || "");

    return optionName === currentName;
  }, []);

  const filterOptions = useCallback((options, params) => {
    const filtered = filter(options, params);
    const typed = params.inputValue.trim();

    if (!typed) {
      return filtered;
    }

    const normalizedInput = normalizeName(typed);
    const exists = options.some(
      (option) => normalizeName(option?.name || "") === normalizedInput
    );

    if (!exists) {
      filtered.push({
        inputValue: typed,
        name: typed,
        isCreateOption: true,
      });
    }

    return filtered;
  }, []);

  const getOptionLabel = useCallback((option) => {
    if (typeof option === "string") {
      return toTitleCase(option);
    }

    if (option?.inputValue) {
      return toTitleCase(option.inputValue);
    }

    return toTitleCase(option?.name || "");
  }, []);

  const renderOption = useCallback(
    (props, option) => {
      const key =
        option?._id || option?.id || option?.inputValue || option?.name || "";
      const label = getOptionLabel(option);
      const displayLabel = option?.isCreateOption ? `Add "${label}"` : label;

      return (
        <li {...props} key={key}>
          {displayLabel}
        </li>
      );
    },
    [getOptionLabel]
  );

  const loading = useMemo(
    () => isLoading || isCreating,
    [isLoading, isCreating]
  );

  return (
    <Grid item>
      <Autocomplete
        autoSelect
        blurOnSelect
        id="driver"
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={drivers}
        value={value}
        onChange={handleOnChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        isOptionEqualToValue={isOptionEqualToValue}
        filterOptions={filterOptions}
        getOptionLabel={getOptionLabel}
        renderOption={renderOption}
        loading={loading}
        loadingText="Loading drivers..."
        fullWidth
        renderInput={(params) => (
          <TextField
            {...params}
            name="driver"
            label="Driver"
            variant="outlined"
            error={Boolean(touched.driver && errors.driver)}
            fullWidth
            helperText={touched.driver && errors.driver}
            onBlur={handleBlur}
          />
        )}
      />
    </Grid>
  );
};

DriverAutocomplete.propTypes = {
  formik: PropTypes.object.isRequired,
};

export default DriverAutocomplete;
