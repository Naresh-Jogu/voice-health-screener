import { WebSocketServer } from "ws";

export function setupCallWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const payload = JSON.parse(message.toString());
        console.log("Received event:", payload.event);

        switch (payload.event) {
          case "START_CALL":
            ws.send(JSON.stringify({ event: "STATUS", data: "CONNECTED" }));
            break;

          case "END_CALL":
            ws.send(JSON.stringify({ event: "CALL_ENDED" }));
            break;

          default:
            ws.send(
              JSON.stringify({ event: "ERROR", message: "Unknown event type" }),
            );
        }
      } catch (error) {
        console.error("Websocket message error:", error);
        ws.send(
          JSON.stringify({
            event: "ERROR",
            message: "Invalid Websocket message",
          }),
        );
      }
    });

    ws.on("close", () => {
      console.log("Websocket client disconnected");
    });
  });
}
