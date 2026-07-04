/**
 * mockLlm — canned-response "LLM" for generative-UI demos (master plan §0).
 *
 * No live model, no API calls: keyed prompt→response fixtures with simulated
 * streaming (chunked emission + seeded jitter, so replays look organic but
 * stay deterministic).
 *
 * @example
 *   const llm = createMockLlm(
 *     [{ match: /solid.state/i, response: 'Solid-state batteries…' }],
 *     { fallback: "I don't have a canned answer for that." }
 *   );
 *   for await (const chunk of llm.stream(prompt)) append(chunk);
 */

/** Tiny deterministic PRNG (mulberry32) so "jitter" replays identically. */
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {Array<{match: RegExp|string, response: string}>} fixtures
 * @param {Object} [opts]
 * @param {string} [opts.fallback] - response when nothing matches
 * @param {number} [opts.chunkSize=3]  - words per emitted chunk
 * @param {number} [opts.delayMs=55]   - mean inter-chunk delay
 * @param {number} [opts.jitter=0.6]   - 0..1 delay variance
 * @param {number} [opts.seed=1337]
 */
export function createMockLlm(fixtures = [], opts = {}) {
  const { fallback = '…', chunkSize = 3, delayMs = 55, jitter = 0.6, seed = 1337 } = opts;

  const match = (prompt) => {
    for (const f of fixtures) {
      if (typeof f.match === 'string' ? prompt.toLowerCase().includes(f.match.toLowerCase()) : f.match.test(prompt)) {
        return f.response;
      }
    }
    return fallback;
  };

  async function* stream(prompt) {
    const rand = rng(seed + prompt.length);
    const words = match(prompt).split(/(\s+)/).filter(Boolean);
    for (let i = 0; i < words.length; i += chunkSize * 2) {
      // *2: words interleaved with whitespace tokens
      yield words.slice(i, i + chunkSize * 2).join('');
      await sleep(delayMs * (1 - jitter / 2 + rand() * jitter));
    }
  }

  return { match, stream };
}
