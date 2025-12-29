// pages/api/analyze-floral.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import formidable from 'formidable';
import { GoogleGenAI } from '@google/genai';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor' });

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error al parsear formulario' });

    try {
      const file = files.image as formidable.File;
      const buffer = fs.readFileSync(file.filepath);
      const base64 = buffer.toString('base64');

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash', // verifica que este sea válido para visión en tu SDK
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Analiza esta imagen y sugiere 4 variantes de arreglos florales, explicando estilo y colores.' },
              { inlineData: { mimeType: file.mimetype || 'image/jpeg', data: base64 } }
            ]
          }
        ]
      });

      // Depura la forma exacta de la respuesta:
      // console.log(JSON.stringify(response, null, 2));
      const text = response?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text ?? null;
      // Extraer inlineData si el modelo devuelve imágenes:
      const images: string[] = [];
      const candidateParts = response?.candidates?.[0]?.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData?.data) images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }

      return res.status(200).json({ text, images });
    } catch (error: any) {
      console.error('Error Gemini:', error?.response?.data || error.message || error);
      return res.status(500).json({ error: 'Error al conectar con Gemini', details: error?.response?.data || error.message });
    }
  });
}
