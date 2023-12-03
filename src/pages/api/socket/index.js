import { Server } from "socket.io";
import { socketEvents } from "./events";

export const config = {
  api: {
    bodyParser: false,
  },
};

export const io = new Server({
  path: "/api/socket",
  addTrailingSlash: false,
  cors: { origin: "*" },
}).listen(4001);

export default function SocketHandler(_req, res) {
  if (res.socket.server.io) {
    res.status(200).json({
      success: true,
      message: "Socket is already running",
      socket: `:4001`,
    });
    return;
  }

  console.log("Starting Socket.IO server on port:4001");

  socketEvents();

  res.socket.server.io = io;

  res.status(201).json({
    success: true,
    message: "Socket is started",
    socket: `:${4000 + 1}`,
  });
}
