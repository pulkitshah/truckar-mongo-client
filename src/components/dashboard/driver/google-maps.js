import React, { useRef, useEffect, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";

const GoogleMaps = ({ sx, position }) => {
  const [positionState, setPosition] = useState(position);

  useEffect(() => {
    setPosition(position);
  }, [position]);

  if (!position.lat) return "Please connect device to load maps";

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
      <MarkerF position={positionState} />
    </GoogleMap>
  );
};

export default GoogleMaps;
