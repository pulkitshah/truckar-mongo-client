import { io } from "./index";

export const socketEvents = () => {
  io.on("connect", (socket) => {
    const _socket = socket;

    console.log("socket connect", socket.id);

    socket.on("disconnect", async () => {
      console.log("socket disconnect");
    });
  });
};
