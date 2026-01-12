
import { STRICT_LIST } from "../config/constants";
import { Prompts } from "./prompts";

export async function processChat(history: any[], currentState: any, env: any) {
    if (!env || !env.AI) throw new Error("AI Binding missing");

    // 1. Prepare Context
    // We append the current state to the system prompt so the AI knows what has been collected so far.
    const fullState = {
      ...currentState,
      // available_tokens is already in the system prompt text, but adding it here ensures consistency if state is used explicitly
    };

    const systemMessage = {
        role: 'system',
        content: Prompts.AXIS_SYSTEM_PROMPT + `\n\n### CURRENT SESSION STATE\n${JSON.stringify(fullState)}`
    };

    // 2. Format Messages for Llama-3
    const messages = [
        systemMessage,
        ...history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }))
    ];

    // 3. Run Inference
    
    try {
        const response: any = await env.AI.run('@cf/meta/llama-3-8b-instruct', { 
            messages
        });

        // 4. Extract JSON
        let jsonStr = response.response;
        // Clean up markdown code blocks if present
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
             jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
        }
        
        const parsed = JSON.parse(jsonStr);

        // 5. Token substitution logic (Legacy compatibility)
        if (parsed.data && parsed.data.composition) {
            parsed.data.composition = parsed.data.composition.map((item: any) => {
                const fullToken = STRICT_LIST.find(t => t.symbol === item.token.symbol) || STRICT_LIST[0];
                return {
                    token: fullToken,
                    weight: item.weight
                };
            });
        }

        return parsed;

    } catch (e: any) {
        console.error("Cloudflare AI Error:", e);
        // Return a safe error response structure that the frontend expects
        return {
            message: "I'm having trouble connecting to the neural core. Please try again.",
            uiAction: "NONE",
            data: {}
        };
    }
}
