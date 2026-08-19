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

      await startRecording();

      setIsCallActive(true);
    } catch (error) {
      console.error("Failed to start call:", error);
    }
  };

  const endCall = () => {
    stopRecording();

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

      <button onClick={endCall} disabled={!isCallActive}>
        End Call
      </button>

      {lastMessage && <pre>{JSON.stringify(lastMessage, null, 2)}</pre>}
    </div>
  );
}

export default App;
