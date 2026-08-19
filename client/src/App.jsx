import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAudioRecorder } from "./hooks/useAudioRecorder";

function App() {
  const {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    sendAudioChunk,
  } = useWebSocket();

  const { isRecording, startRecording, stopRecording } =
    useAudioRecorder(sendAudioChunk);

  const [isCallActive, setIsCallActive] = useState(false);

  const startCall = async () => {
    try {
      await connect();

      sendMessage({
        event: "START_CALL",
      });

      setIsCallActive(true);
    } catch (error) {
      console.error("Failed to start call:", error);
    }
  };

  const startUserTurn = async () => {
    if (!isCallActive || isRecording) {
      return;
    }

    await startRecording();
  };

  const endUserTurn = async () => {
    if (!isRecording) {
      return;
    }

    await stopRecording();

    sendMessage({
      event: "END_USER_TURN",
    });
  };

  const endCall = () => {
    if (isRecording) {
      stopRecording();
    }

    sendMessage({
      event: "END_CALL",
    });

    setIsCallActive(false);
    disconnect();
  };

  return (
    <div>
      <h1>Voice Health Screener</h1>

      <p>WebSocket Status: {isConnected ? "Connected" : "Disconnected"}</p>

      <p>Call Status: {isCallActive ? "Active" : "Inactive"}</p>

      <p>Microphone: {isRecording ? "Recording" : "Not Recording"}</p>

      <button onClick={startCall} disabled={isCallActive}>
        Start Call
      </button>

      <button onClick={startUserTurn} disabled={!isCallActive || isRecording}>
        Start Recording
      </button>

      <button onClick={endUserTurn} disabled={!isRecording}>
        Send Answer
      </button>

      <button onClick={endCall} disabled={!isCallActive}>
        End Call
      </button>

      {lastMessage && <pre>{JSON.stringify(lastMessage, null, 2)}</pre>}
    </div>
  );
}

export default App;
