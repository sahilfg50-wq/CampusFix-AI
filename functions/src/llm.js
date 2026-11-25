// One small interface over the AI providers CampusFix can use, all free:
//   1. Gemini (Google AI Studio free tier)  - when GEMINI key is configured
//   2. Ollama (free, runs on this computer) - when the Ollama app is running locally
//   3. none                                 - callers then use their rule-based fallback
//
// generateJson({ system, prompt, schema }) returns the raw JSON text from the model.
// `schema` is a standard JSON Schema object (lowercase types).

import { GoogleGenAI } from '@google/genai';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

function geminiProvider({ apiKey, model }) {
  const ai = new GoogleGenAI({ apiKey });
  return {
    name: 'gemini',
    label: 'Gemini AI',
    async generateJson({ system, prompt, schema, temperature = 0.3 }) {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          temperature,
        },
      });
      if (!response.text) throw new Error('Gemini returned no text.');
      return response.text;
    },
  };
}

function ollamaProvider({ model }) {
  return {
    name: 'ollama',
    label: `Local AI (${model})`,
    async generateJson({ system, prompt, schema, temperature = 0.3 }) {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          format: schema,
          options: { temperature },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`Ollama error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const body = await res.json();
      const text = body?.message?.content;
      if (!text) throw new Error('Ollama returned no text.');
      return text;
    },
  };
}

// True when the Ollama app is running and has the model downloaded.
async function ollamaHasModel(model) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return false;
    const { models = [] } = await res.json();
    return models.some((m) => m.name === model || m.name === `${model}:latest` || m.model === model);
  } catch {
    return false;
  }
}

// Picks the first available provider. Returns null when none is available.
export async function getLlm({ geminiKey, geminiModel, ollamaModel, allowOllama = true }) {
  if (geminiKey) return geminiProvider({ apiKey: geminiKey, model: geminiModel });
  if (allowOllama && ollamaModel && (await ollamaHasModel(ollamaModel))) {
    return ollamaProvider({ model: ollamaModel });
  }
  return null;
}
