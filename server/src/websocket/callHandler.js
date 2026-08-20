import { WebSocketServer } from "ws";
import { transcribeAudio } from "../services/sttService.js";
import { getAIResponse } from "../services/llmService.js";
import { synthesizeSpeech } from "../services/ttsService.js";

export function setupCallWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    const session = {
      transcriptHistory: [],
      isProcessing: false,
      callStartedAt: null,
      audioChunks: [],
    };

    ws.on("message", async (message, isBinary) => {
      try {
        // AUDIO_CHUNK will be binary data.
        if (isBinary) {
          console.log("Received audio chunk:", message.length, "bytes");

          session.audioChunks.push(Buffer.from(message));

          return;
        }

        const payload = JSON.parse(message.toString());

        console.log("Received event:", payload.event);

        switch (payload.event) {
          case "START_CALL": {
            session.transcriptHistory = [];
            session.isProcessing = false;
            session.callStartedAt = new Date();
            session.audioChunks = [];

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
          }

          case "END_USER_TURN": {
            if (session.isProcessing) {
              ws.send(
                JSON.stringify({
                  event: "ERROR",
                  message: "The previous response is still being processed.",
                }),
              );

              break;
            }

            if (session.audioChunks.length === 0) {
              ws.send(
                JSON.stringify({
                  event: "ERROR",
                  message: "No audio was recorded for this turn.",
                }),
              );

              break;
            }

            session.isProcessing = true;

            try {
              const audioBuffer = Buffer.concat(session.audioChunks);

              console.log("Transcribing audio:", audioBuffer.length, "bytes");

              const result = await transcribeAudio(audioBuffer);

              console.log("Transcript:", result.transcript);

              if (!result.transcript?.trim()) {
                ws.send(
                  JSON.stringify({
                    event: "ERROR",
                    message:
                      "I couldn't understand the audio. Please try again.",
                  }),
                );

                break;
              }

              session.transcriptHistory.push({
                role: "user",
                content: result.transcript,
              });

              ws.send(
                JSON.stringify({
                  event: "TRANSCRIPT_UPDATE",
                  data: {
                    role: "user",
                    text: result.transcript,
                  },
                }),
              );

              const aiResponse = await getAIResponse(session.transcriptHistory);

              const ttsAudioBuffer = await synthesizeSpeech(aiResponse);

              console.log("AI response:", aiResponse);
              console.log(
                "Generated TTS audio:",
                ttsAudioBuffer.length,
                "bytes",
              );

              session.transcriptHistory.push({
                role: "assistant",
                content: aiResponse,
              });

              ws.send(
                JSON.stringify({
                  event: "AGENT_TEXT",
                  text: aiResponse,
                }),
              );

              // Send AI voice audio as a binary WebSocket message
              ws.send(ttsAudioBuffer, { binary: true });

              // Clear audio after successful transcription.
              session.audioChunks = [];
            } catch (error) {
              console.error("Voice pipeline processing error:", error);

              ws.send(
                JSON.stringify({
                  event: "ERROR",
                  message:
                    "I couldn't process your response. Please try again.",
                }),
              );
            } finally {
              session.isProcessing = false;
            }

            break;
          }

          case "END_CALL": {
            const endedAt = new Date();

            console.log("Call ended");

            ws.send(
              JSON.stringify({
                event: "CALL_ENDED",
                data: {
                  startedAt: session.callStartedAt,
                  endedAt,
                },
              }),
            );

            break;
          }

          default: {
            ws.send(
              JSON.stringify({
                event: "ERROR",
                message: `Unknown event type: ${payload.event}`,
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
