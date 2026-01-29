
import { STRICT_LIST } from "../config/constants";
import { Prompts } from "./prompts";

export async function processChat(history: any[], currentState: any, env: any) {
    if (!env || !env.AI) throw new Error("AI Binding missing");

    
    const availableTokensText = STRICT_LIST.map(t => 
        `- ${t.symbol}: ${t.name || 'Solana Token'} (Mint: ${t.mint})`
    ).join('\n');

    const fullState = {
      ...currentState,
      
    };

    const dynamicSystemPrompt = `
${Prompts.AXIS_SYSTEM_PROMPT}

### AVAILABLE TOKEN LIST
You can ONLY use tokens from the list below. Do not hallucinate other tickers.
Select a diverse mix based on the user's risk appetite.

${availableTokensText}

### CURRENT SESSION STATE
${JSON.stringify(fullState)}
`;

    const systemMessage = {
        role: 'system',
        content: dynamicSystemPrompt
    };

    
    const messages = [
        systemMessage,
        ...history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }))
    ];

    
    try {
        const response: any = await env.AI.run('@cf/meta/llama-3-8b-instruct', { 
            messages,
            temperature: 0.6,
            max_tokens: 1000,
        });

        
        let jsonStr = response.response;
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
             jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
        }
        
        const parsed = JSON.parse(jsonStr);

        
        if (parsed.data && parsed.data.composition) {
            const validatedComposition: any[] = [];

            for (const item of parsed.data.composition) {
                const targetSymbol = item.token.symbol.toUpperCase();
                
                const foundToken = STRICT_LIST.find(t => t.symbol.toUpperCase() === targetSymbol);

                if (foundToken) {
                    validatedComposition.push({
                        token: foundToken,
                        weight: item.weight
                    });
                } else {
                    console.warn(`AI Hallucinated token: ${targetSymbol}`);
                }
            }
            
            parsed.data.composition = validatedComposition;
        }

        return parsed;

    } catch (e: any) {
        console.error("Cloudflare AI Error:", e);
        return {
            message: "Tactical computer offline. Retrying connection...",
            uiAction: "NONE",
            data: {}
        };
    }
}
