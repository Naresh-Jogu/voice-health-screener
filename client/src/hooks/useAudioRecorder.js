import { useState, useRef } from "react";

export function useAudioRecorder(onAudioChunk) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && onAudioChunk) {
          onAudioChunk(event.data);
        }
      };

      mediaRecorder.start(500);

      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied or unsupported:", error);
    }
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        setIsRecording(false);
        resolve();
        return;
      }

      mediaRecorder.addEventListener(
        "stop",
        () => {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());

          setIsRecording(false);
          resolve();
        },
        { once: true },
      );

      mediaRecorder.stop();
    });
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
