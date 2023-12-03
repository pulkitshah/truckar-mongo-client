export const emitDriverLocationUpdate = (res, driver) => {
  res.socket.server.io.emit(`${driver._id}-LOCATION_UPDATE`, driver);
};
