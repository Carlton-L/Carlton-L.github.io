/**
 * ollama.js — Ollama API client for local inference
 *
 * Handles both embedding generation and streaming chat completion
 * via Ollama's REST API (runs locally on the same machine).
 */

/**
 * Generate an embedding vector for a text string.
 * Uses Ollama's /api/embeddings endpoint.
 *
 * @param {string} host - Ollama host URL (e.g., http://localhost:11434)
 * @param {string} model - Embedding model name (e.g., nomic-embed-text)
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
export async function ollamaEmbed(host, model, text) {
  const response = await fetch(`${host}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama embedding error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.embedding;
}

/**
 * Stream a chat completion from Ollama.
 * Yields text chunks as they're generated.
 *
 * @param {string} host - Ollama host URL
 * @param {string} model - Chat model name (e.g., phi3:3.8b)
 * @param {string} systemPrompt - System prompt with context
 * @param {Array<{role: string, content: string}>} messages - Conversation messages
 * @yields {string} Text chunks
 */
export async function* ollamaChat(host, model, systemPrompt, messages) {
  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      options: {
        temperature: 0.3,       // Low temperature for factual accuracy
        top_p: 0.9,
        num_predict: 512,       // Max tokens to generate
        repeat_penalty: 1.1,    // Reduce repetition
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama chat error (${response.status}): ${err}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          yield data.message.content;
        }
        if (data.done) return;
      } catch {
        // Skip unparseable lines
      }
    }
  }
}

/**
 * Check if Ollama is running and has the required models.
 *
 * @param {string} host - Ollama host URL
 * @param {string[]} requiredModels - Model names to check for
 * @returns {Promise<{ok: boolean, models: string[], missing: string[]}>}
 */
export async function checkOllama(host, requiredModels) {
  try {
    const response = await fetch(`${host}/api/tags`);
    const data = await response.json();
    const available = data.models?.map((m) => m.name) || [];

    const missing = requiredModels.filter(
      (req) => !available.some((a) => a.startsWith(req.split(':')[0]))
    );

    return { ok: missing.length === 0, models: available, missing };
  } catch {
    return { ok: false, models: [], missing: requiredModels };
  }
}
