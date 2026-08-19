import { WebSocketServer } from "ws";

export function setupCallWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    // Session state for this connection

    const session = {
      transcriptHistory: [],
      isProcessing: false,
      callStartedAt: null,
    };

    ws.on("message", (message, isBinary) => {
      try {
        // AUDIO_CHUNK will be binary data.

        if (isBinary) {
          console.log("Received audio chunk:", message.length, "bytes");
          // STT integration will be added in Phase 3.
          return;
        }

        const payload = JSON.parse(message.toString());
        console.log("Received event:", payload.event);

        switch (payload.event) {
          case "START_CALL":
            {
              session.transcriptHistory = [];
              session.isProcessing = false;
              session.callStartedAt = new Date();
            }

            ws.send(
              JSON.stringify({
                event: "TRANSCRIPT_UPDATE",
                data: {
                  role: "assistant",
                  text: "Hello! I'm here to help with your health intake. May I know your name?",
                },
              }),
            );
            break;

          case "END_CALL":
            {
              const endedAt = new Date();

              console.log("Call ended");

              ws.send(
                JSON.stringify({
                  event: "CALL_ENDED",
                  data: { startedAt: session.callStartedAt, endedAt },
                }),
              );
            }
            break;

          default: {
            ws.send(
              JSON.stringify({
                event: "ERROR",
                message: `Unknown event type: ${payload.event} `,
              }),
            );
          }
        }
      } catch (error) {
        console.error("WebSocket message processing error:", error);

        ws.send(
          JSON.stringify({
            event: "ERROR",
            message: "Failed to process WebSocket message.",
          }),
        );
      }
    });

    ws.on("close", () => {
      console.log("Websocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("Websocket error:", error);
    });
  });
}
