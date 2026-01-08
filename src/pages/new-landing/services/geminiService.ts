import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
// Note: In a real production app, ensure calls are proxied or handled securely.
// For this demo, we assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateSchoolImage = async (prompt: string): Promise<string | null> => {
  if (!process.env.API_KEY) {
    console.warn("API Key not found. Skipping AI generation.");
    return null;
  }

  try {
    const fullPrompt = `A high quality, photorealistic, wide-angle photo of a modern Korean school environment, bright and clean atmosphere, education theme: ${prompt}`;
    
    // Using Nano Banana (gemini-2.5-flash-image) as requested
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};