import { getGeminiModel, executeFunctionCall } from "./gemini.js";
import { buildSystemPrompt } from "./prompts.js";
import { logger } from "../utils/logger.js";

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

  // Generate request ID for log correlation
  const requestId = logger.generateRequestId();
  logger.setRequestId(requestId);
  logger.separator();

  logger.debug("agent", "Processing started", {
    regiment: regimentId,
    user: userName,
    guild: guildName,
  });

  const model = getGeminiModel();
  const systemPrompt = buildSystemPrompt({ regimentId, userName, guildName });

  logger.trace("agent", `System prompt loaded (${systemPrompt.length} chars)`);

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

  // Track timing and tools for summary
  logger.time("agent-total");
  const toolsCalled: string[] = [];

  // Send the user message
  logger.debug("gemini", ">>> Iteration 1", { message: userMessage });
  logger.time("gemini-request");
  let response = await chat.sendMessage(userMessage);
  let geminiTime = logger.timeEnd("gemini-request");
  let result = response.response;

  // Handle function calls in a loop (may need multiple calls)
  let iterations = 1;
  const maxIterations = 5;

  while (iterations <= maxIterations) {
    const functionCalls = result.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      // No more function calls, log final response
      const textPreview = result.text()?.slice(0, 100);
      logger.debug("gemini", `<<< Final response [${geminiTime}ms]`, textPreview);
      break;
    }

    // Log the response with function calls
    const callNames = functionCalls.map((c) => c.name);
    logger.debug("gemini", `<<< Response [${geminiTime}ms]`, {
      functionCalls: callNames,
    });

    // Execute each function call
    const functionResponses = [];
    for (const call of functionCalls) {
      // Inject regimentId if not provided but available
      const args: Record<string, unknown> = { ...(call.args || {}) };
      if (regimentId && !args["regimentId"]) {
        args["regimentId"] = regimentId;
      }
      if (userId && !args["userId"]) {
        args["userId"] = userId;
      }

      logger.debug("mcp", `Tool: ${call.name}`, { args });
      logger.time(`tool-${call.name}`);

      const functionResult = await executeFunctionCall(call.name, args);
      const toolTime = logger.timeEnd(`tool-${call.name}`);

      // Try to summarize the result
      let resultSummary: string;
      try {
        const parsed = JSON.parse(functionResult);
        if (Array.isArray(parsed)) {
          resultSummary = `${parsed.length} items`;
        } else if (typeof parsed === "object" && parsed !== null) {
          resultSummary = Object.keys(parsed).slice(0, 5).join(", ");
        } else {
          resultSummary = String(parsed).slice(0, 100);
        }
      } catch {
        resultSummary = functionResult.slice(0, 100);
      }

      logger.debug("mcp", `Result [${toolTime}ms]: ${resultSummary}`);
      toolsCalled.push(call.name);

      functionResponses.push({
        name: call.name,
        response: { result: functionResult },
      });
    }

    iterations++;

    // Send function results back to Gemini
    logger.debug("gemini", `>>> Iteration ${iterations} (function result)`);
    logger.time("gemini-request");
    response = await chat.sendMessage(
      functionResponses.map((fr) => ({
        functionResponse: {
          name: fr.name,
          response: fr.response,
        },
      }))
    );
    geminiTime = logger.timeEnd("gemini-request");
    result = response.response;
  }

  // Extract the final text response
  const text = result.text();
  const totalTime = logger.timeEnd("agent-total");

  // Log summary
  const uniqueTools = [...new Set(toolsCalled)];
  logger.info(
    "agent",
    `Complete: ${totalTime}ms | ${iterations} iteration${iterations > 1 ? "s" : ""} | ${uniqueTools.length} tool${uniqueTools.length !== 1 ? "s" : ""}`
  );

  logger.setRequestId(null);

  if (!text) {
    return "I processed your request but couldn't generate a response. Please try again.";
  }

  return text;
}
