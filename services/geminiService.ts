// pages/api/gemini.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

export const config = {
  api: {
    bodyParser: false, // necesario para formidable
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ error: 'Error al procesar la imagen' });
    }

    const file = files.image as formidable.File;
    if (!file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }

    try {
      const buffer = fs.readFileSync(file.filepath);
      const base64 = buffer.toString('base64');

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'API key no configurada' });
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Genera 4 variantes creativas de este arreglo floral.' },
              { inlineData: { mimeType: file.mimetype || 'image/jpeg', data: base64 } },
            ],
          },
        ],
      });

      const images: string[] = [];
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }

      return res.status(200).json({ images });
    } catch (error: any) {
      console.error('Error llamando a Gemini:', error?.response?.data || error.message || error);
      return res.status(500).json({ error: 'Error al llamar a Gemini' });
    }
  });
}
