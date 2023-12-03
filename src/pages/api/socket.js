// import { Server } from "socket.io";

// const SocketHandler = (req, res) => {
//   if (res.socket.server.io) {
//     console.log("Socket is already running");
//   } else {
//     console.log("Socket is initializing");
//     const io = new Server(res.socket.server);
//     res.socket.server.io = io;

//     io.on("connection", (socket) => {
//       console.log(socket.nsp.name);
//       socket.on("input-change", (msg) => {
//         socket.broadcast.emit("update-input", msg);
//       });
//     });
//   }
//   res.end();
// };

// export default SocketHandler;

// import { PORT } from "@/config/app";
import { Server as HTTPServer } from "http";
import { Socket as NetSocket } from "net";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";
import { Server } from "socket.io";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function SocketHandler(_req, res) {
  // if (res.socket.server.io) {
  //   res.status(200).json({
  //     success: true,
  //     message: "Socket is already running",
  //     socket: `:4001`,
  //   });
  //   return;
  // }
  // console.log("Starting Socket.IO server on port:4001");
  // //@ts-expect-error
  // const io = new Server({
  //   path: "/api/socket",
  //   addTrailingSlash: false,
  //   cors: { origin: "*" },
  // }).listen(4001);
  // io.on("connect", (socket) => {
  //   const _socket = socket;
  //   console.log("socket connect", socket.id);
  //   _socket.broadcast.emit("welcome", `Welcome ${_socket.id}`);
  //   socket.on("disconnect", async () => {
  //     console.log("socket disconnect");
  //   });
  // });
  // res.socket.server.io = io;
  // res.status(201).json({
  //   success: true,
  //   message: "Socket is started",
  //   socket: `:${4000 + 1}`,
  // });
}
