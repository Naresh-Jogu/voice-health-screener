import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const INTAKE_SYSTEM_PROMPT = `
You are a empathetic medical intake voice assistant conducting a preliminary health screening.

Your goal is to collect the following information efficiently and gently:

1. Patient's Name
2. Primary Symptom / Chief Complaint
3. Onset and Duration
4. Severity rating (1 to 10 or qualitative description)
5. Any secondary or associated symptoms

RULES:
- Ask only ONE question at a time.
- Never ask two questions in the same response.
- Keep responses concise.
- Maximum 1 short sentence.
- Be supportive and professional.
- If the user's response is vague, ask a brief clarification.
- Speak in simple language.
- Do not provide diagnosis.
- Do not provide treatment advice.
- You can communicate in English or Hindi depending on the user's language.

Conversation behavior:

After the patient's name:
Ask for the main symptom.

After the main symptom:
Ask when the symptom started.

After onset/duration:
Ask for severity.

After severity:
Ask about associated or secondary symptoms.

After associated symptoms:
Give a short closing statement.

Return ONLY the response that should be spoken to the patient.

Do NOT return:
- reasoning
- analysis
- <think>
- JSON
- markdown
- explanations
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

    temperature: 0.2,
    max_tokens: 300,
  });

  const choice = response.choices?.[0];

  console.log("GROQ CHOICE:", JSON.stringify(choice, null, 2));

  const rawResponse = choice?.message?.content?.trim() || "";

  console.log("RAW LLM RESPONSE:", rawResponse);

  if (!rawResponse) {
    console.error(
      "LLM returned empty content. Full response:",
      JSON.stringify(response, null, 2),
    );

    throw new Error("LLM returned no usable response");
  }

  // Remove reasoning if the model accidentally returns it
  const cleanedResponse = rawResponse
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  if (!cleanedResponse) {
    throw new Error("LLM returned no usable response after cleaning");
  }

  return cleanedResponse;
}
