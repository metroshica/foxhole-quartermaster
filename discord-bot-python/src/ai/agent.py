"""AI agent for processing user messages with Gemini."""

import re
from typing import Any

import google.generativeai as genai

from .gemini import get_gemini_model, execute_function_call
from .prompts import build_system_prompt
from ..utils.logger import logger


def strip_wrapping_code_blocks(text: str) -> str:
    """Strip triple-backtick code blocks that wrap the entire response.

    Gemini sometimes wraps responses in code blocks despite being told not to.
    This strips them so Discord markdown (bold, emoji, etc.) renders properly.
    Only strips if the entire response is wrapped — leaves inline code blocks alone.
    """
    stripped = text.strip()
    # Match responses wrapped entirely in ``` ... ``` (with optional language tag)
    match = re.match(r"^```\w*\n?(.*?)```$", stripped, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


async def process_with_ai(
    user_message: str,
    regiment_id: str | None = None,
    user_id: str | None = None,
    user_name: str | None = None,
    channel_id: str | None = None,
    guild_name: str | None = None,
    conversation_history: list[tuple[str, str]] | None = None,
) -> str:
    """Process a user message with the AI assistant.

    Args:
        user_message: The user's message
        regiment_id: Discord guild ID of the regiment
        user_id: Discord user ID
        user_name: User's display name
        channel_id: Discord channel ID
        guild_name: Discord server name
        conversation_history: Recent conversation as (role, content) tuples

    Returns:
        AI response text
    """
    # Generate request ID for log correlation
    request_id = logger.generate_request_id()
    logger.set_request_id(request_id)
    logger.separator()

    logger.debug("agent", "Processing started", {
        "regiment": regiment_id,
        "user": user_name,
        "guild": guild_name,
    })

    model = get_gemini_model()
    system_prompt = build_system_prompt(regiment_id, user_name, guild_name)

    # Build chat history - this is what Gemini sees as context
    history = [
        genai.protos.Content(
            role="user",
            parts=[genai.protos.Part(text=f"System instructions: {system_prompt}")],
        ),
        genai.protos.Content(
            role="model",
            parts=[genai.protos.Part(text="Understood. I'm ready to help with regiment logistics.")],
        ),
    ]

    # Inject conversation history for multi-turn context
    if conversation_history:
        history.append(
            genai.protos.Content(
                role="user",
                parts=[genai.protos.Part(text=(
                    "Here is the recent conversation for context. "
                    "This is ONLY for understanding references like 'the first one' or 'yes'. "
                    "The data in these messages may be stale — you MUST still call tools to get current data for every new question."
                ))],
            )
        )
        history.append(
            genai.protos.Content(
                role="model",
                parts=[genai.protos.Part(text="Understood. I'll use this history only for conversational context and will always call tools for fresh data.")],
            )
        )
        for role, content in conversation_history:
            history.append(
                genai.protos.Content(
                    role=role,
                    parts=[genai.protos.Part(text=content)],
                )
            )
        logger.debug("agent", f"Injected {len(conversation_history)} history messages into chat context")

    # Log the system prompt in debug mode
    logger.debug("gemini", "=== SYSTEM PROMPT START ===")
    if logger._logger.level <= 10:  # DEBUG level
        print(system_prompt)
    logger.debug("gemini", "=== SYSTEM PROMPT END ===")

    # Start a chat session
    chat = model.start_chat(history=history)

    # Track timing and tools for summary
    logger.time("agent-total")
    tools_called: list[str] = []

    # Log the user message being sent
    logger.debug("gemini", "=== USER MESSAGE TO GEMINI (iteration 1) ===")
    if logger._logger.level <= 10:
        print(user_message)
    logger.debug("gemini", "=== END USER MESSAGE ===")

    logger.time("gemini-request")
    response = await chat.send_message_async(user_message)
    gemini_time = logger.time_end("gemini-request")

    # Handle function calls in a loop (may need multiple calls)
    iterations = 1
    max_iterations = 5

    while iterations <= max_iterations:
        # Check for function calls
        function_calls = []
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    function_calls.append(part.function_call)

        if not function_calls:
            # No more function calls - log the final response
            final_text = response.text
            logger.debug("gemini", f"=== GEMINI FINAL RESPONSE [{gemini_time}ms] ===")
            if logger._logger.level <= 10:
                print(final_text)
            logger.debug("gemini", "=== END GEMINI RESPONSE ===")
            break

        # Log the function calls
        logger.debug("gemini", f"=== GEMINI RESPONSE [{gemini_time}ms] - FUNCTION CALLS ===")
        for call in function_calls:
            logger.debug("mcp", f">>> Calling: {call.name}", {"args": dict(call.args)})
        logger.debug("gemini", "=== END GEMINI RESPONSE ===")

        # Execute each function call
        function_responses = []
        for call in function_calls:
            # Inject regimentId if not provided but available
            args: dict[str, Any] = dict(call.args)
            injected: list[str] = []
            if regiment_id and "regimentId" not in args:
                args["regimentId"] = regiment_id
                injected.append("regimentId")
            if user_id and "userId" not in args:
                args["userId"] = user_id
                injected.append("userId")

            logger.debug("mcp", f">>> Calling MCP tool: {call.name}", {
                "originalArgs": dict(call.args),
                "injectedFields": injected if injected else None,
                "finalArgs": args,
            })
            logger.time(f"tool-{call.name}")

            function_result = await execute_function_call(call.name, args)
            tool_time = logger.time_end(f"tool-{call.name}")

            # Log full tool result
            logger.debug("mcp", f"=== TOOL RESULT: {call.name} [{tool_time}ms] ===")
            if logger._logger.level <= 10:
                print(function_result[:500] + "..." if len(function_result) > 500 else function_result)
            logger.debug("mcp", "=== END TOOL RESULT ===")

            tools_called.append(call.name)

            function_responses.append(
                genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=call.name,
                        response={"result": function_result},
                    )
                )
            )

        iterations += 1

        # Send function responses back to Gemini
        logger.debug("gemini", f"=== FUNCTION RESULTS TO GEMINI (iteration {iterations}) ===")
        logger.time("gemini-request")
        response = await chat.send_message_async(function_responses)
        gemini_time = logger.time_end("gemini-request")

    # Extract the final text response and clean up code block wrapping
    text = strip_wrapping_code_blocks(response.text)
    total_time = logger.time_end("agent-total")

    # Log summary
    unique_tools = list(set(tools_called))
    logger.info(
        "agent",
        f"Complete: {total_time}ms | {iterations} iteration{'s' if iterations > 1 else ''} | {len(unique_tools)} tool{'s' if len(unique_tools) != 1 else ''}",
    )

    logger.set_request_id(None)

    if not text:
        return "I processed your request but couldn't generate a response. Please try again."

    return text
