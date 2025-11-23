import React, { useCallback, useMemo, useState } from "react";
import {
  GoogleMap,
  DirectionsService,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";

import { googleMapsConfig } from "../../../config";

const libraries = ["places"];
const mapContainerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "12rem",
  maxHeight: "16rem",
};

const GoogleMaps = ({ sx, addresses }) => {
  const [googleResponse, setResponse] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "truckar-order-map",
    googleMapsApiKey: googleMapsConfig.apiKey || "",
    libraries,
  });

  const mapOptions = useMemo(
    () => ({ mapTypeId: "hybrid", disableDefaultUI: true }),
    []
  );

  const directionsCallback = useCallback(
    (response) => {
      if (!response) {
        return;
      }

      if (response.status === "OK") {
        if (JSON.stringify(googleResponse) === JSON.stringify(response)) {
          return;
        }

        setResponse(response);

        const distance = response.routes?.[0]?.legs?.reduce((sum, leg) => {
          const legDistance = leg?.distance?.value || 0;
          return sum + legDistance;
        }, 0);

        setTotalDistance(distance || 0);
      } else {
        console.log("Directions request failed", response);
      }
    },
    [googleResponse]
  );

  if (loadError || !googleMapsConfig.apiKey) {
    return <div>Unable to load Google Maps.</div>;
  }

  if (!isLoaded) {
    return <div>Loading map...</div>;
  }

  return (
    <GoogleMap
      sx={sx}
      options={mapOptions}
      mapContainerStyle={mapContainerStyle}
      center={{
        lat: 22.309425,
        lng: 72.13623,
      }}
      zoom={5}
    >
      {addresses.origin && addresses.destination && (
        <DirectionsService
          // required
          options={{
            origin: addresses.origin,
            destination: addresses.destination,
            waypoints: addresses.waypoints,
            travelMode: "DRIVING",
            optimizeWaypoints: true,
          }}
          // required
          callback={directionsCallback}
        />
      )}

      {googleResponse && (
        <DirectionsRenderer
          // required
          options={{
            // eslint-disable-line react-perf/jsx-no-new-object-as-prop
            directions: googleResponse,
          }}
        />
      )}
    </GoogleMap>
  );
};

export default React.memo(GoogleMaps);
