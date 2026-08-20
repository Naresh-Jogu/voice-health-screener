import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateHealthReport(transcriptHistory) {
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    messages: [
      {
        role: "system",
        content: `
You are a medical intake report generator.

Create a concise preliminary health intake report from the conversation.

Return ONLY valid JSON. Do not use markdown or code fences.

The JSON must have exactly these fields:
{
  "patientName": "",
  "primarySymptom": "",
  "onsetDuration": "",
  "severity": "",
  "associatedSymptoms": "",
  "summary": "",
  "recommendation": ""
}

Do not diagnose the patient.
This is only a preliminary intake summary.
        `,
      },
      ...transcriptHistory,
    ],

    temperature: 0.2,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content?.trim();

  console.log("RAW REPORT RESPONSE:", content);

  if (!content) {
    throw new Error("LLM returned no report");
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse report JSON:", error);
    throw new Error("LLM returned invalid report JSON");
  }
}
