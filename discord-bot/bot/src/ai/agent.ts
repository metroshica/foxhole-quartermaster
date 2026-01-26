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

  // Build chat history - this is what Gemini sees as context
  const history = [
    {
      role: "user" as const,
      parts: [{ text: `System instructions: ${systemPrompt}` }],
    },
    {
      role: "model" as const,
      parts: [{ text: "Understood. I'm ready to help with regiment logistics." }],
    },
  ];

  // Log the FULL system prompt that Gemini receives
  logger.debug("gemini", "=== SYSTEM PROMPT START ===");
  console.log(systemPrompt);
  logger.debug("gemini", "=== SYSTEM PROMPT END ===");

  // Start a chat session
  const chat = model.startChat({ history });

  // Track timing and tools for summary
  logger.time("agent-total");
  const toolsCalled: string[] = [];

  // Log the FULL user message being sent
  logger.debug("gemini", "=== USER MESSAGE TO GEMINI (iteration 1) ===");
  console.log(userMessage);
  logger.debug("gemini", "=== END USER MESSAGE ===");
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
      // No more function calls - log the FULL final response from Gemini
      const finalText = result.text();
      logger.debug("gemini", `=== GEMINI FINAL RESPONSE [${geminiTime}ms] ===`);
      console.log(finalText);
      logger.debug("gemini", `=== END GEMINI RESPONSE ===`);
      break;
    }

    // Log the FULL function calls Gemini wants to make
    logger.debug("gemini", `=== GEMINI RESPONSE [${geminiTime}ms] - FUNCTION CALLS ===`);
    console.log(JSON.stringify(functionCalls.map((c) => ({
      name: c.name,
      args: c.args,
    })), null, 2));
    logger.debug("gemini", `=== END GEMINI RESPONSE ===`);

    // Execute each function call
    const functionResponses = [];
    for (const call of functionCalls) {
      // Inject regimentId if not provided but available
      const args: Record<string, unknown> = { ...(call.args || {}) };
      const injected: string[] = [];
      if (regimentId && !args["regimentId"]) {
        args["regimentId"] = regimentId;
        injected.push("regimentId");
      }
      if (userId && !args["userId"]) {
        args["userId"] = userId;
        injected.push("userId");
      }

      logger.debug("mcp", `>>> Calling MCP tool: ${call.name}`, {
        originalArgs: call.args,
        injectedFields: injected.length > 0 ? injected : undefined,
        finalArgs: args,
      });
      logger.time(`tool-${call.name}`);

      const functionResult = await executeFunctionCall(call.name, args);
      const toolTime = logger.timeEnd(`tool-${call.name}`);

      // Log full result at trace level, summary at debug
      // Log FULL tool result
      logger.debug("mcp", `=== TOOL RESULT: ${call.name} [${toolTime}ms] ===`);
      console.log(functionResult);
      logger.debug("mcp", `=== END TOOL RESULT ===`);

      toolsCalled.push(call.name);

      functionResponses.push({
        name: call.name,
        response: { result: functionResult },
      });
    }

    iterations++;

    // Build the function response payload - this is EXACTLY what gets sent to Gemini
    const functionResponsePayload = functionResponses.map((fr) => ({
      functionResponse: {
        name: fr.name,
        response: fr.response,
      },
    }));

    // Log the FULL payload being sent to Gemini
    logger.debug("gemini", `=== FUNCTION RESULTS TO GEMINI (iteration ${iterations}) ===`);
    console.log(JSON.stringify(functionResponsePayload, null, 2));
    logger.debug("gemini", `=== END FUNCTION RESULTS ===`);

    logger.time("gemini-request");
    response = await chat.sendMessage(functionResponsePayload);
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
