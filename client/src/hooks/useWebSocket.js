import { useCallback, useRef, useState } from "react";

const WEBSOCKET_URL = "ws://localhost:5000";

export function useWebSocket() {
  const socketRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [healthReport, setHealthReport] = useState(null);
  const [screeningComplete, setScreeningComplete] = useState(false);

  const connect = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        resolve();
        return;
      }

      const socket = new WebSocket(WEBSOCKET_URL);

      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setScreeningComplete(false);
        setHealthReport(null);
        setConversation([]);
        resolve();
      };

      socket.onmessage = async (event) => {
        try {
          // Binary message = AI-generated audio
          if (event.data instanceof Blob) {
            console.log("Received AI audio:", event.data.size, "bytes");

            setIsAISpeaking(true);

            const audioUrl = URL.createObjectURL(event.data);

            const audio = new Audio(audioUrl);

            audio.onended = () => {
              console.log("AI finished speaking");

              URL.revokeObjectURL(audioUrl);
              setIsAISpeaking(false);
            };

            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              setIsAISpeaking(false);
            };

            await audio.play();

            return;
          }

          // Text message = JSON event
          const message = JSON.parse(event.data);

          console.log("Server message:", message);

          setLastMessage(message);

          if (message.event === "TRANSCRIPT_UPDATE") {
            const { role, text } = message.data || {};

            if (role && text) {
              setConversation((prev) => [
                ...prev,
                {
                  role,
                  text,
                },
              ]);
            }
          }

          if (message.event === "AGENT_TEXT") {
            setConversation((prev) => [
              ...prev,
              {
                role: "assistant",
                text: message.text,
              },
            ]);
          }

          if (message.event === "SCREENING_COMPLETE") {
            console.log("Screening completed:", message.data?.report);
            setHealthReport(message.data?.report || null);
            setScreeningComplete(true);
          }

          if (message.event === "CALL_ENDED") {
            console.log("Call ended");
          }

          if (message.event === "ERROR") {
            console.error("Server error:", message.message);
          }
        } catch (error) {
          console.error("Failed to process WebSocket message:", error);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);

        if (socketRef.current === socket) {
          socketRef.current = null;
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      socketRef.current = socket;
    });
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message) => {
    const socket = socketRef.current;

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  const sendAudioChunk = useCallback((audioChunk) => {
    const socket = socketRef.current;

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(audioChunk);
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  return {
    isConnected,
    isAISpeaking,
    lastMessage,
    conversation,
    healthReport,
    screeningComplete,
    connect,
    disconnect,
    sendMessage,
    sendAudioChunk,
  };
}
