export async function transcribeAudio(audioBuffer) {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error("No audio data available for transcription.");
  }

  const audioBlob = new Blob([audioBuffer], {
    type: "audio/webm",
  });

  const formData = new FormData();

  formData.append("file", audioBlob, "recording.webm");

  formData.append("model", "saaras:v3");
  formData.append("mode", "transcribe");

  const response = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: {
      "api-subscription-key": process.env.SARVAM_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(`Sarvam STT failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  return {
    transcript: result.transcript || "",
    languageCode: result.language_code || null,
  };
}
