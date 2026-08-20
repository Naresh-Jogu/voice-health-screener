import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateHealthReport(intakeData) {
  const response = await groq.chat.completions.create({
    model: "qwen/qwen3.6-27b",

    messages: [
      {
        role: "system",
        content: `
You are a medical intake report generator.

Create a concise preliminary health intake report using the structured patient intake data provided by the application.

Return ONLY valid JSON.
Do not use markdown or code fences.

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

Keep the recommendation general and safe.
    `,
      },
      {
        role: "user",
        content: JSON.stringify(intakeData),
      },
    ],

    temperature: 0.2,
    max_tokens: 1000,
  });

  const rawContent = response.choices?.[0]?.message?.content?.trim() || "";

  console.log("RAW REPORT RESPONSE:", rawContent);

  if (!rawContent) {
    throw new Error("LLM returned no report");
  }

  const cleanedContent = rawContent
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  console.log("CLEANED REPORT RESPONSE:", cleanedContent);

  if (!cleanedContent) {
    throw new Error("LLM returned no report after cleaning");
  }

  try {
    return JSON.parse(cleanedContent);
  } catch (error) {
    console.error("Failed to parse report JSON:", error);
    console.error("Content that failed JSON parsing:", cleanedContent);

    throw new Error("LLM returned invalid report JSON");
  }
}
