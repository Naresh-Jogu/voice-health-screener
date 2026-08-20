import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Mandatory system prompt provided in the assignment.
export const INTAKE_SYSTEM_PROMPT = `
You are a empathetic medical intake voice assistant conducting a preliminary health screening.
Your goal is to collect the following information efficiently and gently:
1. Patient's Name
2. Primary Symptom / Chief Complaint
3. Onset and Duration (When did it start?)
4. Severity rating (1 to 10 or qualitative description)
5. Any secondary or associated symptoms

RULES:
- Ask only ONE question at a time.
- Keep responses concise (maximum 1-2 short sentences) since your output will be converted to speech.
- Be supportive and professional.
- If the user's response is vague, ask a brief clarifying follow-up.
- Speak in simple language, avoiding overly complex clinical terminology.
- You can communicate in English or Hindi depending on the language used by the user.
`;

export async function getAIResponse(transcriptHistory) {
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      {
        role: "system",
        content: INTAKE_SYSTEM_PROMPT,
      },
      ...transcriptHistory,
    ],
    temperature: 0.3,
    max_tokens: 100,
  });

  return response.choices[0].message.content.trim();
}
