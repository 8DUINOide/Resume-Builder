// Vercel Serverless Function — Gemini API Proxy
// Keeps the GEMINI_API_KEY secure on the server side

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const { action, imageBase64, mimeType, prompt } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'Missing action parameter' });
        }

        // ============================================
        // ACTION: extractResume — OCR resume from image
        // ============================================
        if (action === 'extractResume') {
            if (!imageBase64) {
                return res.status(400).json({ error: 'Missing imageBase64' });
            }

            const extractPrompt = `You are a resume data extraction AI. Analyze this image of a resume and extract ALL the information you can find into the following JSON structure. Be thorough — extract every detail visible.

Return ONLY valid JSON with this exact structure (use empty strings for missing fields, empty arrays for missing sections):
{
  "personalInfo": {
    "fullName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": ""
  },
  "summary": "",
  "experience": [
    {
      "title": "",
      "company": "",
      "startDate": "",
      "endDate": "",
      "description": ""
    }
  ],
  "education": [
    {
      "degree": "",
      "school": "",
      "startDate": "",
      "endDate": "",
      "gpa": ""
    }
  ],
  "skills": [
    { "name": "" }
  ],
  "projects": [
    {
      "name": "",
      "description": ""
    }
  ]
}

Important rules:
- For experience descriptions, put each bullet point on a new line
- For dates, use the format shown in the resume (e.g., "Jan 2020", "2020", "Present")
- Extract ALL work experiences, education entries, skills, and projects visible
- If a section doesn't exist in the resume, use an empty array
- Return ONLY the JSON object, no markdown, no code fences, no explanation`;

            const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: extractPrompt },
                                {
                                    inlineData: {
                                        mimeType: mimeType || 'image/jpeg',
                                        data: imageBase64
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 4096
                        }
                    })
                }
            );

            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                console.error('Gemini API error:', errText);
                return res.status(geminiRes.status).json({ error: 'Gemini API error', details: errText });
            }

            const geminiData = await geminiRes.json();
            const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Try to parse the JSON from the response
            let parsedData;
            try {
                // Remove potential markdown code fences
                const cleaned = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                parsedData = JSON.parse(cleaned);
            } catch (parseErr) {
                console.error('JSON parse error:', parseErr, 'Raw:', textContent);
                return res.status(422).json({ error: 'Failed to parse AI response', raw: textContent });
            }

            return res.status(200).json({ success: true, data: parsedData });
        }

        // ============================================
        // ACTION: businessAttire — Transform photo
        // ============================================
        if (action === 'businessAttire') {
            if (!imageBase64) {
                return res.status(400).json({ error: 'Missing imageBase64' });
            }

            const attirePrompt = prompt || "Change the person's clothing to professional business attire: a well-fitted charcoal gray suit with a crisp white dress shirt and a subtle dark tie. Keep the person's face, expression, hair, skin tone, and background exactly the same. The result should look natural, professionally photographed, and suitable for a formal resume or LinkedIn profile photo. Do NOT change anything about the person's face or identity.";

            const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: attirePrompt },
                                {
                                    inlineData: {
                                        mimeType: mimeType || 'image/jpeg',
                                        data: imageBase64
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            responseModalities: ["TEXT", "IMAGE"]
                        }
                    })
                }
            );

            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                console.error('Gemini API error:', errText);
                return res.status(geminiRes.status).json({ error: 'Gemini API error', details: errText });
            }

            const geminiData = await geminiRes.json();
            
            // Look for image data in the response
            const parts = geminiData.candidates?.[0]?.content?.parts || [];
            let resultImageBase64 = null;
            let resultMimeType = 'image/png';

            for (const part of parts) {
                if (part.inlineData) {
                    resultImageBase64 = part.inlineData.data;
                    resultMimeType = part.inlineData.mimeType || 'image/png';
                    break;
                }
            }

            if (!resultImageBase64) {
                // If no image was returned, report error with any text response
                const textParts = parts.filter(p => p.text).map(p => p.text).join('\n');
                return res.status(422).json({ 
                    error: 'No image generated', 
                    message: textParts || 'The AI did not return an image. Try a different photo.' 
                });
            }

            return res.status(200).json({ 
                success: true, 
                imageBase64: resultImageBase64,
                mimeType: resultMimeType
            });
        }

        return res.status(400).json({ error: 'Unknown action: ' + action });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
