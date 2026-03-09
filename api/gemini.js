// api/gemini.js — Vercel Serverless Function
// Gemini API proxy. Key sadece sunucuda, tarayıcıya gönderilmez.

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY eksik. Vercel → Project → Settings → Environment Variables → GEMINI_API_KEY ekle.'
    });
  }

  try {
    const { system, messages, max_tokens } = req.body;

    const systemPrefix = system ? system + '\n\n---\n\n' : '';
    const geminiMessages = (messages || []).map((msg, i) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: (i === 0 && msg.role === 'user' ? systemPrefix : '') + msg.content }]
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: max_tokens || 1500,
          temperature: 0.7,
        },
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini hatası' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt alınamadı.';

    return res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (err) {
    return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
}
