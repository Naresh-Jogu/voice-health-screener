import express from "express";
import cors from "cors";
import http from "http";

import { PORT, CLIENT_URL } from "./config/env.js";
import { setupCallWebSocket } from "./websocket/callHandler.js";

const app = express();

app.use(
  cors({
    origin: CLIENT_URL,
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Voice Health Screener API is running..." });
});

const server = http.createServer(app);

setupCallWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`WebSocket server ready on: ws://localhost:${PORT}`);
});
