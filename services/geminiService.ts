
import { GoogleGenAI } from "@google/genai";

export const generateSentimentMessage = async (
  recipientName: string,
  occasion: string,
  tone: string
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Con mucho cariño para ti en este día tan especial.";

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Actúa como un poeta y experto en etiqueta floral. Escribe un mensaje corto, 
    conmovedor y elegante para una tarjeta de regalo de flores.
    Destinatario: ${recipientName}
    Ocasión: ${occasion}
    Tono deseado: ${tone}.
    Idioma: Español de Colombia.
    Máximo 40 palabras.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Con mucho cariño para ti.";
  } catch (error) {
    console.error("Error generating message:", error);
    return "Que este detalle llene tu día de color y alegría.";
  }
};

export const generateFloralInspiration = async (description: string): Promise<string | null> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional, high-quality, boutique florist photograph of: ${description}. Soft natural lighting, elegant background, 4k resolution, editorial style.` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
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
