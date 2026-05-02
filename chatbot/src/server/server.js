/**
 * server.js — Self-hosted RAG chatbot API
 *
 * Runs on Raspberry Pi 5 with Ollama for local inference.
 * No external API dependencies — everything runs on-device.
 *
 * Endpoints:
 *   POST /api/chat     — Main chat endpoint (streaming)
 *   GET  /api/health    — Health check
 *   GET  /api/stats     — Basic analytics (protected)
 *
 * Environment variables:
 *   OLLAMA_HOST      — Ollama API base URL (default: http://localhost:11434)
 *   CHAT_MODEL       — Model for generation (default: phi3:3.8b)
 *   EMBED_MODEL      — Model for embeddings (default: nomic-embed-text)
 *   DB_PATH          — Path to SQLite database (default: ./data/chatbot.db)
 *   PORT             — Server port (default: 3001)
 *   STATS_PASSWORD   — Password for /api/stats endpoint
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ChatDatabase } from './db.js';
import { ollamaEmbed, ollamaChat } from './ollama.js';
import { buildPrompt } from './prompt.js';

// ─── Config ──────────────────────────────────────────────

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const CHAT_MODEL = process.env.CHAT_MODEL || 'phi3:3.8b';
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';
const DB_PATH = process.env.DB_PATH || './data/chatbot.db';
const PORT = parseInt(process.env.PORT || '3001', 10);
const SIMILARITY_THRESHOLD = 0.72;
const MAX_CHUNKS = 5;
const CACHE_SIMILARITY_THRESHOLD = 0.95;
const MAX_CONVERSATION_TURNS = 6;

// ─── Initialize ──────────────────────────────────────────

const db = new ChatDatabase(DB_PATH);
const app = Fastify({
  logger: true,
  trustProxy: true,   // Required: Cloudflare Tunnel proxies all requests
  bodyLimit: 2048,     // Reject oversized request bodies (2KB is plenty for chat)
});

await app.register(cors, {
  origin: ['https://carlton.dev', 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
});

await app.register(rateLimit, {
  max: 10,
  timeWindow: '1 minute',
  // Behind Cloudflare Tunnel, req.ip is always 127.0.0.1 or a CF edge IP.
  // Use CF-Connecting-IP header to rate-limit by actual visitor IP.
  keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.ip,
  errorResponseBuilder: () => ({
    error: "I'm getting a lot of questions right now — please wait a moment and try again.",
    retryAfter: 60,
  }),
});

// ─── Health Check ────────────────────────────────────────

app.get('/api/health', async (req, reply) => {
  try {
    // Check Ollama is running
    const ollamaRes = await fetch(`${OLLAMA_HOST}/api/tags`);
    const ollamaData = await ollamaRes.json();
    const models = ollamaData.models?.map((m) => m.name) || [];

    // Check database
    const chunkCount = db.getChunkCount();

    return {
      status: 'healthy',
      uptime: process.uptime(),
      models,
      knowledgeBaseChunks: chunkCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
});

// ─── Chat Endpoint ───────────────────────────────────────

app.post('/api/chat', async (req, reply) => {
  const { messages } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    reply.code(400);
    return { error: 'messages array is required' };
  }

  // Get the latest user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage) {
    reply.code(400);
    return { error: 'No user message found' };
  }

  const query = lastUserMessage.content.trim().slice(0, 500); // Enforce max length

  try {
    // 1. Check semantic cache
    const queryEmbedding = await ollamaEmbed(OLLAMA_HOST, EMBED_MODEL, query);
    const cached = db.findCachedResponse(queryEmbedding, CACHE_SIMILARITY_THRESHOLD);

    if (cached) {
      // Return cached response (non-streaming for speed)
      db.logConversation(query, cached.response, cached.chunks, true);

      reply.header('Content-Type', 'application/json');
      return {
        response: cached.response,
        sources: cached.chunks,
        cached: true,
      };
    }

    // 2. Vector similarity search
    const chunks = db.searchChunks(queryEmbedding, SIMILARITY_THRESHOLD, MAX_CHUNKS);

    // 3. Build the prompt
    const recentMessages = messages.slice(-MAX_CONVERSATION_TURNS);
    const { systemPrompt, userMessages } = buildPrompt(recentMessages, chunks);

    // 4. Stream response from Ollama
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Retrieval-Count': String(chunks.length),
      'X-Cached': 'false',
    });

    let fullResponse = '';

    // Send sources first as a metadata event
    reply.raw.write(
      `data: ${JSON.stringify({
        type: 'sources',
        sources: chunks.map((c) => ({
          heading: c.heading,
          fileTitle: c.file_title,
          source: c.source_file,
          similarity: c.similarity,
        })),
      })}\n\n`
    );

    // Stream the LLM response
    for await (const chunk of ollamaChat(OLLAMA_HOST, CHAT_MODEL, systemPrompt, userMessages)) {
      fullResponse += chunk;
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`
      );
    }

    // Send done event
    reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    reply.raw.end();

    // 5. Cache the response and log
    if (fullResponse.trim()) {
      db.cacheResponse(queryEmbedding, query, fullResponse, chunks);
      db.logConversation(query, fullResponse, chunks, false);
    }
  } catch (error) {
    app.log.error(error, 'Chat endpoint error');

    // If headers haven't been sent yet
    if (!reply.raw.headersSent) {
      reply.code(500);
      return {
        error: "I'm having trouble thinking right now. Please try again in a moment.",
      };
    } else {
      // If we're mid-stream, send an error event
      reply.raw.write(
        `data: ${JSON.stringify({
          type: 'error',
          message: 'Something went wrong mid-response.',
        })}\n\n`
      );
      reply.raw.end();
    }
  }
});

// ─── Stats Endpoint (Protected) ──────────────────────────

app.get('/api/stats', async (req, reply) => {
  const password = req.headers['x-stats-password'] || req.query.password;
  if (!process.env.STATS_PASSWORD || password !== process.env.STATS_PASSWORD) {
    reply.code(401);
    return { error: 'Unauthorized' };
  }

  return db.getStats();
});

// ─── Start ───────────────────────────────────────────────

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`\n🤖 Carlton's Digital Twin is running on port ${PORT}`);
  console.log(`   Chat model: ${CHAT_MODEL}`);
  console.log(`   Embed model: ${EMBED_MODEL}`);
  console.log(`   Knowledge base: ${db.getChunkCount()} chunks`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
