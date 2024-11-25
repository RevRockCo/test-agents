import { Ai } from '@cloudflare/ai';

export default async function calendarAgent(payload, env) {
  if (!env?.AI) {
    console.error("AI binding is missing or invalid.");
    return { error: "AI binding is not configured correctly." };
  }

  const ai = new Ai(env.AI);

  try {
    // Simulated database summary
    const fakeDbSummary = `
      - Date: 2024-01-01, City: New York, Event: New Year's Celebration
      - Date: 2024-02-14, City: Los Angeles, Event: Valentine's Day Dinner
    `;

    const messages = [
      {
        role: "system",
        content: `
          You are a smart assistant managing a calendar system. You can:
          1. Add events to the database.
          2. Sync events with Google Calendar.
          3. Answer questions about the calendar.

          Current calendar summary:
          ${fakeDbSummary}
        `,
      },
      { role: "user", content: `Query: "${payload.query}"` },
    ];

    const llmResponse = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages,
      stream: false,
    });

    const responseText =
      llmResponse?.response ||
      llmResponse?.choices?.[0]?.message?.content?.trim() ||
      "No valid response from LLM.";

    console.log("LLM Response:", responseText);

    return { llmReasoning: responseText };
  } catch (error) {
    console.error("Error in calendarAgent:", error);
    return { error: `An error occurred: ${error.message}` };
  }
}
