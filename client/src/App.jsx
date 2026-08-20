import { useEffect, useState, useCallback } from "react";

import { useWebSocket } from "./hooks/useWebSocket";
import { useAudioRecorder } from "./hooks/useAudioRecorder";

function App() {
  const {
    isConnected,
    lastMessage,
    healthReport,
    screeningComplete,
    isAISpeaking,
    conversation,
    connect,
    disconnect,
    sendMessage,
    sendAudioChunk,
  } = useWebSocket();

  const [isCallActive, setIsCallActive] = useState(false);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [report, setReport] = useState(null);

  const handleSilenceDetected = useCallback(() => {
    console.log("User finished speaking");

    sendMessage({
      event: "END_USER_TURN",
    });
  }, [sendMessage]);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder(
    sendAudioChunk,
    handleSilenceDetected,
  );

  // -----------------------------------------
  // Handle messages received from backend
  // -----------------------------------------
  useEffect(() => {
    if (!lastMessage) {
      return;
    }

    console.log("Processing server message:", lastMessage);

    // Final report
    if (lastMessage.event === "SCREENING_COMPLETE") {
      console.log("Screening complete:", lastMessage.data.report);

      setReport(lastMessage.data.report);
      setIsCallActive(false);
    }

    // Call ended
    if (lastMessage.event === "CALL_ENDED") {
      setIsCallActive(false);
    }

    // Error
    if (lastMessage.event === "ERROR") {
      console.error("Server error:", lastMessage.message);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!isCallActive) {
      return;
    }

    if (!hasStartedConversation) {
      return;
    }

    if (isAISpeaking) {
      return;
    }

    if (screeningComplete) {
      return;
    }

    if (isRecording) {
      return;
    }

    console.log("AI finished speaking. Starting microphone...");

    startRecording();
  }, [
    isCallActive,
    isAISpeaking,
    screeningComplete,
    isRecording,
    startRecording,
  ]);

  // -----------------------------------------
  // START CALL
  // -----------------------------------------
  const startCall = async () => {
    try {
      await connect();

      // Reset previous conversation

      setReport(null);

      setHasStartedConversation(false);

      sendMessage({
        event: "START_CALL",
      });

      setIsCallActive(true);
    } catch (error) {
      console.error("Failed to start call:", error);
    }
  };

  // -----------------------------------------
  // START USER TURN
  // -----------------------------------------
  const startUserTurn = async () => {
    if (!isCallActive || isRecording) {
      return;
    }

    await startRecording();
  };

  // -----------------------------------------
  // END USER TURN
  // -----------------------------------------
  const endUserTurn = async () => {
    if (!isRecording) {
      return;
    }

    await stopRecording();

    sendMessage({
      event: "END_USER_TURN",
    });
  };

  // -----------------------------------------
  // END CALL
  // -----------------------------------------
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

      {/* Connection status */}
      <p>WebSocket Status: {isConnected ? "Connected" : "Disconnected"}</p>

      {/* Call status */}
      <p>Call Status: {isCallActive ? "Active" : "Inactive"}</p>

      {/* Microphone status */}
      <p>Microphone: {isRecording ? "Recording" : "Not Recording"}</p>

      <hr />

      {/* Controls */}
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

      {/* Conversation */}
      <hr />

      <h2>Conversation</h2>

      {conversation.length === 0 ? (
        <p>No conversation yet.</p>
      ) : (
        conversation.map((message, index) => (
          <div key={index}>
            <strong>{message.role === "assistant" ? "AI" : "You"}:</strong>{" "}
            {message.text}
          </div>
        ))
      )}

      {/* Final report */}
      {report && (
        <>
          <hr />

          <h2>Final Health Report</h2>

          <p>
            <strong>Patient Name:</strong> {report.patientName}
          </p>

          <p>
            <strong>Primary Symptom:</strong> {report.primarySymptom}
          </p>

          <p>
            <strong>Onset / Duration:</strong> {report.onsetDuration}
          </p>

          <p>
            <strong>Severity:</strong> {report.severity}
          </p>

          <p>
            <strong>Associated Symptoms:</strong> {report.associatedSymptoms}
          </p>

          <p>
            <strong>Summary:</strong> {report.summary}
          </p>

          <p>
            <strong>Recommendation:</strong> {report.recommendation}
          </p>
        </>
      )}

      {/* Debug information */}
      {lastMessage && (
        <>
          <hr />

          <h3>Last Server Message</h3>

          <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
        </>
      )}
    </div>
  );
}

export default App;
