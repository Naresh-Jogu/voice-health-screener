import { useCallback, useRef, useState } from "react";

const WEBSOCKET_URL = "ws://localhost:5000";

export function useWebSocket() {
  const socketRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

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
        resolve();
      };

      socket.onmessage = async (event) => {
        try {
          // Binary message = AI-generated audio
          if (event.data instanceof Blob) {
            console.log("Received AI audio:", event.data.size, "bytes");

            const audioUrl = URL.createObjectURL(event.data);

            const audio = new Audio(audioUrl);

            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
            };

            await audio.play();

            return;
          }

          // Text message = JSON event
          const message = JSON.parse(event.data);

          console.log("Server message:", message);

          setLastMessage(message);
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
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    sendAudioChunk,
  };
}
