import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAudioRecorder } from "./hooks/useAudioRecorder";

function App() {
  const {
    isConnected,
    lastMessage,
    conversation,
    isAISpeaking,
    screeningComplete,
    connect,
    disconnect,
    sendMessage,
    sendAudioChunk,
  } = useWebSocket();

  const [isCallActive, setIsCallActive] = useState(false);
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

  // -----------------------------
  // SERVER MESSAGES
  // -----------------------------
  useEffect(() => {
    if (!lastMessage) return;

    console.log("Processing server message:", lastMessage);

    if (lastMessage.event === "SCREENING_COMPLETE") {
      console.log("Screening complete:", lastMessage.data.report);

      setReport(lastMessage.data.report);
      setIsCallActive(false);
    }

    if (lastMessage.event === "CALL_ENDED") {
      setIsCallActive(false);
    }

    if (lastMessage.event === "ERROR") {
      console.error("Server error:", lastMessage.message);
    }
  }, [lastMessage]);

  // -----------------------------
  // START CALL
  // -----------------------------
  const startCall = async () => {
    try {
      await connect();

      setReport(null);

      sendMessage({
        event: "START_CALL",
      });

      setIsCallActive(true);
    } catch (error) {
      console.error("Failed to start call:", error);
    }
  };

  // -----------------------------
  // START RECORDING
  // -----------------------------
  const startUserTurn = async () => {
    if (!isCallActive || isRecording || isAISpeaking || screeningComplete) {
      return;
    }

    await startRecording();
  };
  // -----------------------------
  // END RECORDING
  // -----------------------------
  const endUserTurn = async () => {
    if (!isRecording) return;

    await stopRecording();

    sendMessage({
      event: "END_USER_TURN",
    });
  };

  // -----------------------------
  // END CALL
  // -----------------------------
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
    <div style={styles.container}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Voice Health Screener</h1>

          <p style={styles.subtitle}>AI-powered preliminary health intake</p>
        </div>

        <div style={styles.statusContainer}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: isConnected ? "#22c55e" : "#ef4444",
            }}
          />

          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={styles.main}>
        {/* CALL CONTROL CARD */}
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Voice Screening</h2>

          <div style={styles.callStatus}>
            <span>Call:</span>

            <strong>{isCallActive ? " Active" : " Inactive"}</strong>
          </div>

          <div style={styles.microphoneStatus}>
            <p>
              {isAISpeaking
                ? "🔊 AI is speaking..."
                : isRecording
                  ? "🎤 Listening..."
                  : "🎤 Ready"}
            </p>
          </div>

          <div style={styles.buttons}>
            <button
              onClick={startCall}
              disabled={isCallActive}
              style={styles.primaryButton}
            >
              Start Screening
            </button>

            <button
              onClick={startUserTurn}
              disabled={
                !isCallActive ||
                isRecording ||
                isAISpeaking ||
                screeningComplete
              }
            >
              🎤 Start Speaking
            </button>

            <button
              onClick={endUserTurn}
              disabled={!isRecording}
              style={styles.sendButton}
            >
              Send Answer
            </button>

            <button
              onClick={endCall}
              disabled={!isCallActive}
              style={styles.endButton}
            >
              End Call
            </button>
          </div>
        </section>

        {/* CONVERSATION */}
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Conversation</h2>

          <div style={styles.conversation}>
            {conversation.length === 0 ? (
              <p style={styles.empty}>
                Start a screening to begin the conversation.
              </p>
            ) : (
              conversation.map((message, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.message,
                    alignItems:
                      message.role === "assistant" ? "flex-start" : "flex-end",
                  }}
                >
                  <div
                    style={{
                      ...styles.bubble,
                      backgroundColor:
                        message.role === "assistant" ? "#eef2ff" : "#dcfce7",
                    }}
                  >
                    <strong>
                      {message.role === "assistant" ? "AI" : "You"}
                    </strong>

                    <p>{message.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* FINAL REPORT */}
        {report && (
          <section style={styles.reportCard}>
            <h2 style={styles.reportTitle}>Final Health Report</h2>

            <div style={styles.reportGrid}>
              <ReportItem label="Patient Name" value={report.patientName} />

              <ReportItem
                label="Primary Symptom"
                value={report.primarySymptom}
              />

              <ReportItem
                label="Onset / Duration"
                value={report.onsetDuration}
              />

              <ReportItem label="Severity" value={`${report.severity}/10`} />

              <ReportItem
                label="Associated Symptoms"
                value={report.associatedSymptoms}
              />
            </div>

            <div style={styles.reportSection}>
              <h3>Summary</h3>
              <p>{report.summary}</p>
            </div>

            <div style={styles.reportSection}>
              <h3>Recommendation</h3>
              <p>{report.recommendation}</p>
            </div>

            <p style={styles.disclaimer}>
              This is a preliminary intake summary and not a medical diagnosis.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

// -----------------------------
// REPORT ITEM
// -----------------------------

function ReportItem({ label, value }) {
  return (
    <div style={styles.reportItem}>
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

// -----------------------------
// STYLES
// -----------------------------

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "20px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    margin: 0,
    fontSize: "28px",
  },

  subtitle: {
    marginTop: "5px",
    color: "#64748b",
  },

  statusContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "600",
  },

  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },

  main: {
    maxWidth: "1000px",
    margin: "30px auto",
    padding: "0 20px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "25px",
    marginBottom: "25px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },

  sectionTitle: {
    marginTop: 0,
  },

  callStatus: {
    marginBottom: "10px",
  },

  microphoneStatus: {
    marginBottom: "20px",
    color: "#475569",
  },

  buttons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  primaryButton: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  },

  recordButton: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#16a34a",
    color: "#ffffff",
    cursor: "pointer",
  },

  sendButton: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#64748b",
    color: "#ffffff",
    cursor: "pointer",
  },

  endButton: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#dc2626",
    color: "#ffffff",
    cursor: "pointer",
  },

  conversation: {
    minHeight: "150px",
  },

  empty: {
    color: "#94a3b8",
  },

  message: {
    display: "flex",
    marginBottom: "12px",
  },

  bubble: {
    padding: "12px 16px",
    borderRadius: "10px",
    maxWidth: "70%",
  },

  reportCard: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "30px",
    marginBottom: "40px",
    border: "2px solid #2563eb",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },

  reportTitle: {
    marginTop: 0,
    color: "#1d4ed8",
  },

  reportGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
  },

  reportItem: {
    padding: "15px",
    background: "#f8fafc",
    borderRadius: "8px",
  },

  reportSection: {
    marginTop: "20px",
  },

  disclaimer: {
    marginTop: "25px",
    color: "#64748b",
    fontSize: "13px",
  },
};

export default App;
