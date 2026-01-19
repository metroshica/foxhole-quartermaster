import { getGeminiModel, executeFunctionCall } from "./gemini.js";
import { buildSystemPrompt } from "./prompts.js";

export interface ProcessAIOptions {
  userMessage: string;
  regimentId?: string;
  userId?: string;
  userName?: string;
  channelId?: string;
  guildName?: string;
}

export async function processWithAI(options: ProcessAIOptions): Promise<string> {
  const { userMessage, regimentId, userId, userName, guildName } = options;

  const model = getGeminiModel();
  const systemPrompt = buildSystemPrompt({ regimentId, userName, guildName });

  // Start a chat session
  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: `System instructions: ${systemPrompt}` }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I'm ready to help with regiment logistics." }],
      },
    ],
  });

  // Send the user message
  let response = await chat.sendMessage(userMessage);
  let result = response.response;

  // Handle function calls in a loop (may need multiple calls)
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    const functionCalls = result.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      // No more function calls, return the text response
      break;
    }

    // Execute each function call
    const functionResponses = [];
    for (const call of functionCalls) {
      console.log(`Executing function: ${call.name}`, call.args);

      // Inject regimentId if not provided but available
      const args: Record<string, unknown> = { ...(call.args || {}) };
      if (regimentId && !args["regimentId"]) {
        args["regimentId"] = regimentId;
      }
      if (userId && !args["userId"]) {
        args["userId"] = userId;
      }

      const functionResult = await executeFunctionCall(call.name, args);

      functionResponses.push({
        name: call.name,
        response: { result: functionResult },
      });
    }

    // Send function results back to Gemini
    response = await chat.sendMessage(
      functionResponses.map((fr) => ({
        functionResponse: {
          name: fr.name,
          response: fr.response,
        },
      }))
    );
    result = response.response;
    iterations++;
  }

  // Extract the final text response
  const text = result.text();

  if (!text) {
    return "I processed your request but couldn't generate a response. Please try again.";
  }

  return text;
}
