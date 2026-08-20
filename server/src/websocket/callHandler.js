import { WebSocketServer } from "ws";

import { transcribeAudio } from "../services/sttService.js";
import { getAIResponse } from "../services/llmService.js";
import { synthesizeSpeech } from "../services/ttsService.js";
import { generateHealthReport } from "../services/reportService.js";

export function setupCallWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    const session = {
      transcriptHistory: [],
      isProcessing: false,
      callStartedAt: null,
      audioChunks: [],
      userTurnCount: 0,
      intakeComplete: false,
    };

    ws.on("message", async (message, isBinary) => {
      try {
        // --------------------------------
        // AUDIO CHUNK
        // --------------------------------
        if (isBinary) {
          console.log("Received audio chunk:", message.length, "bytes");

          session.audioChunks.push(Buffer.from(message));

          return;
        }

        const payload = JSON.parse(message.toString());

        console.log("Received event:", payload.event);

        switch (payload.event) {
          // ==========================================
          // START CALL
          // ==========================================
          case "START_CALL": {
            session.transcriptHistory = [];
            session.isProcessing = false;
            session.callStartedAt = new Date();
            session.audioChunks = [];
            session.userTurnCount = 0;
            session.intakeComplete = false;

            const greeting =
              "Hello! I'm here to help with your health intake. May I know your name?";

            session.transcriptHistory.push({
              role: "assistant",
              content: greeting,
            });

            ws.send(
              JSON.stringify({
                event: "TRANSCRIPT_UPDATE",
                data: {
                  role: "assistant",
                  text: greeting,
                },
              }),
            );

            // Convert greeting to speech
            const greetingAudio = await synthesizeSpeech(greeting);

            console.log(
              "Generated greeting TTS audio:",
              greetingAudio.length,
              "bytes",
            );

            // Send greeting audio
            ws.send(greetingAudio, {
              binary: true,
            });

            break;
          }

          // ==========================================
          // END USER TURN
          // ==========================================
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
              // --------------------------------
              // 1. Combine audio
              // --------------------------------
              const audioBuffer = Buffer.concat(session.audioChunks);

              console.log("Transcribing audio:", audioBuffer.length, "bytes");

              // --------------------------------
              // 2. Speech → Text
              // --------------------------------
              const result = await transcribeAudio(audioBuffer);

              const transcript = result.transcript?.trim();

              console.log("Transcript:", transcript);

              if (!transcript) {
                ws.send(
                  JSON.stringify({
                    event: "ERROR",
                    message:
                      "I couldn't understand the audio. Please try again.",
                  }),
                );

                break;
              }

              // --------------------------------
              // 3. Save user message
              // --------------------------------
              session.transcriptHistory.push({
                role: "user",
                content: transcript,
              });

              session.userTurnCount += 1;

              console.log("User turn:", session.userTurnCount);

              // --------------------------------
              // 4. Send transcript to frontend
              // --------------------------------
              ws.send(
                JSON.stringify({
                  event: "TRANSCRIPT_UPDATE",
                  data: {
                    role: "user",
                    text: transcript,
                  },
                }),
              );

              // ==========================================
              // 5. CHECK IF THIS IS THE FINAL ANSWER
              // ==========================================

              if (session.userTurnCount === 5) {
                console.log("All 5 intake fields collected.");

                // --------------------------------
                // Generate final closing response
                // --------------------------------
                const aiResponse = await getAIResponse(
                  session.transcriptHistory,
                );

                console.log("Final AI response:", aiResponse);

                // Save assistant response
                session.transcriptHistory.push({
                  role: "assistant",
                  content: aiResponse,
                });

                // Send closing text
                ws.send(
                  JSON.stringify({
                    event: "AGENT_TEXT",
                    text: aiResponse,
                  }),
                );

                // Generate TTS
                const ttsAudioBuffer = await synthesizeSpeech(aiResponse);

                console.log(
                  "Generated TTS audio:",
                  ttsAudioBuffer.length,
                  "bytes",
                );

                // Send TTS
                ws.send(ttsAudioBuffer, {
                  binary: true,
                });

                // --------------------------------
                // Generate health report
                // --------------------------------
                console.log("Generating final health report...");

                const report = await generateHealthReport(
                  session.transcriptHistory,
                );

                console.log("FINAL HEALTH REPORT:", report);

                // --------------------------------
                // Send report to frontend
                // --------------------------------
                ws.send(
                  JSON.stringify({
                    event: "SCREENING_COMPLETE",
                    data: {
                      report,
                    },
                  }),
                );

                // Clear audio
                session.audioChunks = [];

                break;
              }

              // ==========================================
              // NORMAL CONVERSATION
              // ==========================================

              const aiResponse = await getAIResponse(session.transcriptHistory);

              console.log("AI response:", aiResponse);

              // --------------------------------
              // 6. Save AI response
              // --------------------------------
              session.transcriptHistory.push({
                role: "assistant",
                content: aiResponse,
              });

              // --------------------------------
              // 7. Send AI text
              // --------------------------------
              ws.send(
                JSON.stringify({
                  event: "AGENT_TEXT",
                  text: aiResponse,
                }),
              );

              // --------------------------------
              // 8. AI → Speech
              // --------------------------------
              const ttsAudioBuffer = await synthesizeSpeech(aiResponse);

              console.log(
                "Generated TTS audio:",
                ttsAudioBuffer.length,
                "bytes",
              );

              // --------------------------------
              // 9. Send AI audio
              // --------------------------------
              ws.send(ttsAudioBuffer, {
                binary: true,
              });

              // --------------------------------
              // 10. Clear audio
              // --------------------------------
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

          // ==========================================
          // END CALL
          // ==========================================
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

          // ==========================================
          // UNKNOWN EVENT
          // ==========================================
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
