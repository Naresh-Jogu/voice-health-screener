const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";

export async function synthesizeSpeech(text) {
  const response = await fetch(SARVAM_TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": process.env.SARVAM_API_KEY,
    },

    body: JSON.stringify({
      inputs: [text],
      target_language_code: "en-IN",
      speaker: "anushka",
      model: "bulbul:v2",
      enable_preprocessing: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(`Sarvam TTS failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.audios?.[0]) {
    throw new Error("Sarvam TTS returned no audio.");
  }

  return Buffer.from(data.audios[0], "base64");
}
