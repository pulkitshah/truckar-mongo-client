import { createContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { initSockets } from "../sockets";

export const SocketContext = createContext({
  location: {},
});

export const SocketProvider = (props) => {
  const { children } = props;
  const [value, setValue] = useState({
    location: {},
  });

  useEffect(() => initSockets({ setValue }), [initSockets]);
  // Note, we are passing setValue ^ to initSockets
  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const SocketConsumer = SocketContext.Consumer;
