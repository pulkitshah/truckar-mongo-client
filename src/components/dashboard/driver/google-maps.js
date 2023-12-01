import React, { useState } from "react";
import {
  GoogleMap,
  MarkerF,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api";

const GoogleMaps = ({ sx, position }) => {
  const [googleResponse, setResponse] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);

  let directionsCallback = (response) => {
    if (response !== null) {
      if (response.status === "OK") {
        if (JSON.stringify(googleResponse) === JSON.stringify(response)) {
          return;
        } else {
          setTotalDistance(0);
          setResponse(response);

          response.routes[0].legs.map((leg) => {
            setTotalDistance(totalDistance + leg.distance.value);
          });
        }
      } else {
        console.log("response: ");
      }
    }
  };
  // console.log(totalDistance);

  return (
    <GoogleMap
      sx={sx}
      options={{ mapTypeId: "hybrid", disableDefaultUI: true }}
      mapContainerStyle={{
        width: "100%",
        height: "100%",
        minHeight: "12rem",
        maxHeight: "16rem",
      }}
      center={position}
      zoom={13}
    >
      <MarkerF position={position} />
    </GoogleMap>
  );
};

export default React.memo(GoogleMaps);
