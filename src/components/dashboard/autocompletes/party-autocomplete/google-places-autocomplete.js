import React from "react";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import { Box, Grid, TextField, Typography } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import parse from "autosuggest-highlight/parse";
import throttle from "lodash/throttle";
import { googleMapsConfig } from "../../../../config";

const autocompleteService = { current: null };

const GOOGLE_MAPS_API_URL = `https://maps.googleapis.com/maps/api/js?key=${googleMapsConfig.apiKey}&libraries=places`;

function ensureGoogleMapsLoaded() {
  if (typeof window === "undefined") {
    return Promise.reject();
  }

  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector("#google-maps-places");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", reject);

      if (existingScript.getAttribute("data-loaded") === "true") {
        resolve();
      }

      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-places";
    script.async = true;
    script.src = GOOGLE_MAPS_API_URL;
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GoogleMaps({
  name,
  touched,
  error,
  index,
  handleBlur,
  setFieldValue,
  field,
  values,
}) {
  const [value, setValue] = React.useState(
    values[field] ? values[field] : null
  );
  const [inputValue, setInputValue] = React.useState("");
  const [options, setOptions] = React.useState([]);

  const fetch = React.useMemo(
    () =>
      throttle((request, callback) => {
        autocompleteService.current.getPlacePredictions(request, callback);
      }, 200),
    []
  );

  React.useEffect(() => {
    let active = true;

    ensureGoogleMapsLoaded()
      .then(() => {
        if (!active) {
          return;
        }

        if (!autocompleteService.current && window.google) {
          autocompleteService.current =
            new window.google.maps.places.AutocompleteService();
        }

        if (!autocompleteService.current) {
          return;
        }

        if (inputValue === "") {
          setOptions(value ? [value] : []);
          return;
        }

        fetch(
          {
            input: inputValue,
            types: ["(cities)"],
            componentRestrictions: { country: "in" },
          },
          (results) => {
            if (!active) {
              return;
            }

            let newOptions = [];

            if (value) {
              newOptions = [value];
            }

            if (results) {
              newOptions = [...newOptions, ...results];
            }
            setOptions(newOptions);
          }
        );
      })
      .catch(() => {
        if (active) {
          setOptions(value ? [value] : []);
        }
      });

    return () => {
      active = false;
    };
  }, [value, inputValue, fetch]);

  return (
    <Autocomplete
      required
      autoSelect={true}
      blurOnSelect={true}
      id={`places[${index}]`}
      onBlur={handleBlur}
      getOptionLabel={(option) =>
        typeof option === "string"
          ? option
          : option.structured_formatting.main_text
      }
      filterOptions={(x) => x}
      options={options}
      autoComplete
      includeInputInList
      filterSelectedOptions
      value={value}
      onChange={(event, newValue) => {
        var geocoder = new window.google.maps.Geocoder();
        if (newValue) {
          geocoder.geocode(
            { placeId: newValue.place_id },
            function (results, status) {
              if (status === window.google.maps.GeocoderStatus.OK) {
                setFieldValue(
                  `${field}.latitude`,
                  results[0].geometry.location.lat()
                );
                setFieldValue(
                  `${field}.longitude`,
                  results[0].geometry.location.lng()
                );
                setFieldValue(`${field}.description`, newValue.description);
                setFieldValue(
                  `${field}.structured_formatting`,
                  newValue.structured_formatting
                );
                setFieldValue(`${field}.place_id`, newValue.place_id);
              } else {
                alert("Can't find address: " + status);
              }
            }
          );
        }
        setOptions(newValue ? [newValue, ...options] : options);
        setValue(newValue);
      }}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          onKeyPress={(e) => {
            e.which === 13 && e.preventDefault();
          }}
          {...params}
          name={name}
          label={"City"}
          variant="outlined"
          fullWidth
          helperText={touched && error ? error : ""}
          error={Boolean(touched && error)}
        />
      )}
      renderOption={(props, option) => {
        const matches =
          option.structured_formatting.main_text_matched_substrings;
        const parts = parse(
          option.structured_formatting.main_text,
          matches.map((match) => [match.offset, match.offset + match.length])
        );
        return (
          <li {...props}>
            <Grid container alignItems="center">
              <Grid item>
                <Box
                  component={LocationOnIcon}
                  sx={{ color: "text.secondary", mr: 2 }}
                />
              </Grid>
              <Grid item xs>
                {parts.map((part, index) => (
                  <span
                    key={index}
                    style={{
                      fontWeight: part.highlight ? 700 : 400,
                    }}
                  >
                    {part.text}
                  </span>
                ))}

                <Typography variant="body2" color="text.secondary">
                  {option.structured_formatting.secondary_text}
                </Typography>
              </Grid>
            </Grid>
          </li>
        );
      }}
    />
  );
}
