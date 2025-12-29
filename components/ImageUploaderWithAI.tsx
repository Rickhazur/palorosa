  // pages/api/gemini-generate.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error al procesar la imagen' });
    }

    const imageFile = files.image as formidable.File;
    const imageBuffer = fs.readFileSync(imageFile.filepath);

    try {
      // Llamada a la API de Gemini (ejemplo usando Vertex AI o REST API)
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: 'Genera 4 variantes creativas de este arreglo floral.',
                },
                {
                  inlineData: {
                    mimeType: imageFile.mimetype,
                    data: imageBuffer.toString('base64'),
                  },
                },
              ],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Simulamos que recibimos 4 URLs de imágenes generadas
      const mockImageUrls = [
        'https://via.placeholder.com/200x200?text=Imagen+1',
        'https://via.placeholder.com/200x200?text=Imagen+2',
        'https://via.placeholder.com/200x200?text=Imagen+3',
        'https://via.placeholder.com/200x200?text=Imagen+4',
      ];

      res.status(200).json({ imageUrls: mockImageUrls });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al llamar a Gemini' });
    }
  });
}
