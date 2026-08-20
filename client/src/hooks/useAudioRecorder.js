import { useRef, useState } from "react";

export function useAudioRecorder(onAudioChunk, onSilenceDetected) {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const hasDetectedSpeechRef = useRef(false);
  const silenceStartRef = useRef(null);
  const isStoppingRef = useRef(false);

  const SILENCE_DURATION = 1200; // 1.2 seconds
  const SPEECH_THRESHOLD = 0.015;

  const stopSilenceDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    silenceStartRef.current = null;
    hasDetectedSpeechRef.current = false;

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      stopSilenceDetection();

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        setIsRecording(false);
        isStoppingRef.current = false;
        resolve();
        return;
      }

      mediaRecorder.addEventListener(
        "stop",
        () => {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());

          mediaRecorderRef.current = null;

          setIsRecording(false);
          isStoppingRef.current = false;

          resolve();
        },
        { once: true },
      );

      mediaRecorder.stop();
    });
  };

  const checkSilence = () => {
    const analyser = analyserRef.current;

    if (!analyser || !mediaRecorderRef.current) {
      return;
    }

    const dataArray = new Float32Array(analyser.fftSize);

    analyser.getFloatTimeDomainData(dataArray);

    let sum = 0;

    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }

    const rms = Math.sqrt(sum / dataArray.length);

    const isSpeech = rms > SPEECH_THRESHOLD;

    if (isSpeech) {
      hasDetectedSpeechRef.current = true;
      silenceStartRef.current = null;
    } else if (hasDetectedSpeechRef.current) {
      if (!silenceStartRef.current) {
        silenceStartRef.current = Date.now();
      }

      const silenceDuration = Date.now() - silenceStartRef.current;

      if (silenceDuration >= SILENCE_DURATION && !isStoppingRef.current) {
        console.log("Silence detected. Ending user turn.");

        isStoppingRef.current = true;

        stopRecording().then(() => {
          if (onSilenceDetected) {
            onSilenceDetected();
          }
        });

        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(checkSilence);
  };

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

      // Audio analysis for silence detection
      const audioContext = new AudioContext();

      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;

      const microphone = audioContext.createMediaStreamSource(stream);

      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      hasDetectedSpeechRef.current = false;
      silenceStartRef.current = null;
      isStoppingRef.current = false;

      await audioContext.resume();

      mediaRecorder.start(500);

      setIsRecording(true);

      console.log("Recording started");

      checkSilence();
    } catch (error) {
      console.error("Microphone access denied or unsupported:", error);
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
