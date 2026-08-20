import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function extractIntakeData(transcriptHistory) {
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    messages: [
      {
        role: "system",
        content: `
You are a healthcare intake data extraction assistant.

Extract information from the conversation.

Return ONLY valid JSON.
Do not use markdown.
Do not add explanations.

Return exactly this structure:

{
  "patientName": null,
  "primarySymptom": null,
  "onsetDuration": null,
  "severity": null,
  "associatedSymptoms": null
}

Rules:

- Only extract information explicitly provided by the user.
- Do not guess missing information.
- Keep missing fields as null.
- severity should be the number provided by the user.
- associatedSymptoms can contain multiple symptoms.
- Do not diagnose the patient.
        `,
      },

      ...transcriptHistory,
    ],

    temperature: 0.1,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content?.trim();

  console.log("RAW INTAKE EXTRACTION:", content);

  if (!content) {
    throw new Error("LLM returned no intake data");
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse intake JSON:", error);

    throw new Error("LLM returned invalid intake JSON");
  }
}
