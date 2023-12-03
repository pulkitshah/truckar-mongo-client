import io from "socket.io-client";
import { socketEvents } from "./events";

export const socket = io(`:${4000 + 1}`, {
  path: "/api/socket",
  addTrailingSlash: false,
});

export const initSockets = ({ setValue }) => {
  socketEvents({ setValue });
  // setValue    ^ is passed on to be used by socketEvents
};
