import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT, STRICT_LIST } from "../config/constants";

export async function processChat(history: any[], currentState: any, apiKey: string) {
    if (!apiKey) throw new Error("API Key missing");

    // 1. History formatting
    let chatHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
    if (chatHistory.length > 0 && chatHistory[0].role === 'model') chatHistory.shift();

    const lastUserMessage = chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user' 
      ? chatHistory.pop() 
      : { parts: [{ text: "Start creation process." }] };

    const promptText = lastUserMessage.parts[0].text;

    // 2. Prompt generation
    const fullState = {
      ...currentState,
      available_tokens: STRICT_LIST.map(t => t.symbol).join(", ")
    };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        systemInstruction: SYSTEM_PROMPT.replace("{{CURRENT_STATE}}", JSON.stringify(fullState)),
        generationConfig: { responseMimeType: "application/json" }
    });

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(promptText);
    const responseText = result.response.text();
    
    const parsed = JSON.parse(responseText);

    // 3. Token substitution
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
}
