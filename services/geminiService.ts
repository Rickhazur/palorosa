/// <reference types="vite/client" />

import { GoogleGenAI } from "@google/genai";

export const generateSentimentMessage = async (
  recipientName: string,
  occasion: string,
  tone: string
): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'imagen-3.0-generate-001',
      contents: {
        parts: [{ text: `A professional, high-quality, boutique florist photograph of: ${description}. Soft natural lighting, elegant background, 4k resolution, editorial style.` }]
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
    // Fallback error logging
    if (error instanceof Error) console.error(error.message);
    return null;
  }
};

import { FLORAL_ARCHITECT_PROMPT } from './prompts';

export const analyzeFloralImage = async (base64Image: string): Promise<string> => {
  try {
    // Robust key check for Vite and Legacy envs
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key not found");

    const ai = new GoogleGenAI({ apiKey });

    // Clean base64 if it has prefix
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // Using 1.5 Flash for vision efficiency
      contents: [
        {
          role: 'user',
          parts: [
            { text: FLORAL_ARCHITECT_PROMPT },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
              }
            }
          ]
        }
      ]
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo analizar la imagen.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "Error al conectar con el Arquitecto Floral. Verifica tu conexión.";
  }
};

export const refineFloralPrompt = async (base64Image: string, previousResponse: string, instruction: string): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key not found");

    const ai = new GoogleGenAI({ apiKey });

    // Clean base64 if it has prefix
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: FLORAL_ARCHITECT_PROMPT },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
              }
            }
          ]
        },
        {
          role: 'model',
          parts: [{ text: previousResponse }]
        },
        {
          role: 'user',
          parts: [{ text: `INSTRUCCIÓN DE REFINAMIENTO: ${instruction}\n\nPor favor, actualiza el Análisis y los tres (3) Prompts (Option 1, Option 2, Option 3) incorporando estrictamente esta nueva instrucción. Mantén el formato estructurado.` }]
        }
      ]
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo refinar el resultado.";
  } catch (error) {
    console.error("Error refining prompt:", error);
    return "Error al conectar con el Arquitecto Floral para la refinación.";
  }
};
