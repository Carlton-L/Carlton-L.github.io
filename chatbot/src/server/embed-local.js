/**
 * embed-local.js — Local embedding pipeline using Ollama
 *
 * Replaces the OpenAI-dependent embed-knowledge-base.js with a fully local version.
 * Uses Ollama's nomic-embed-text model and sqlite-vec for storage.
 *
 * Usage:
 *   cd chatbot/src/server
 *   npm install
 *   node embed-local.js
 *
 * Prerequisites:
 *   - Ollama running with nomic-embed-text model pulled
 *   - npm dependencies installed
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { ChatDatabase } from './db.js';
import { ollamaEmbed, checkOllama } from './ollama.js';

// ─── Config ──────────────────────────────────────────────

const KNOWLEDGE_BASE_DIR = new URL('../../knowledge-base', import.meta.url).pathname;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';
const DB_PATH = process.env.DB_PATH || './data/chatbot.db';

// ─── Chunking (same logic as embed-knowledge-base.js) ────

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, content: text };

  const metadata = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      let value = rest.join(':').trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      }
      metadata[key.trim()] = value;
    }
  }
  return { metadata, content: match[2] };
}

function chunkByHeading(content, sourceFile) {
  const lines = content.split('\n');
  const chunks = [];
  let fileTitle = '';
  let currentHeading = '';
  let currentContent = [];

  for (const line of lines) {
    if (line.trim().startsWith('<!--') || line.trim().endsWith('-->')) continue;

    if (line.startsWith('# ') && !line.startsWith('## ')) {
      fileTitle = line.replace('# ', '').trim();
      continue;
    }

    if (line.startsWith('## ')) {
      if (currentHeading && currentContent.length > 0) {
        const text = currentContent.join('\n').trim();
        if (text.length > 30) {
          chunks.push({ heading: currentHeading, fileTitle, content: text, source: sourceFile });
        }
      }
      currentHeading = line.replace('## ', '').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeading && currentContent.length > 0) {
    const text = currentContent.join('\n').trim();
    if (text.length > 30) {
      chunks.push({ heading: currentHeading, fileTitle, content: text, source: sourceFile });
    }
  }

  if (chunks.length === 0 && content.trim().length > 30) {
    chunks.push({
      heading: fileTitle || sourceFile,
      fileTitle,
      content: content.replace(/^# .*\n/, '').trim(),
      source: sourceFile,
    });
  }

  return chunks;
}

async function findMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
      files.push(fullPath);
    }
  }
  return files;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  // 1. Check Ollama
  console.log('🔍 Checking Ollama...');
  const { ok, models, missing } = await checkOllama(OLLAMA_HOST, [EMBED_MODEL]);
  if (!ok) {
    console.error(`❌ Missing models: ${missing.join(', ')}`);
    console.error(`   Run: ollama pull ${missing.join(' && ollama pull ')}`);
    process.exit(1);
  }
  console.log(`   ✓ Ollama running with models: ${models.join(', ')}`);

  // 2. Read knowledge base
  console.log('\n📚 Reading knowledge base...');
  const files = await findMarkdownFiles(KNOWLEDGE_BASE_DIR);
  console.log(`   Found ${files.length} markdown files`);

  // 3. Parse and chunk
  const allChunks = [];
  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const { metadata, content } = parseFrontmatter(raw);
    const relPath = relative(KNOWLEDGE_BASE_DIR, filePath);
    const chunks = chunkByHeading(content, relPath);

    for (const chunk of chunks) {
      allChunks.push({
        ...chunk,
        embeddingText: `${chunk.fileTitle} — ${chunk.heading}\n\n${chunk.content}`,
        topic: metadata.topic || '',
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
      });
    }
  }

  console.log(`\n🔪 Created ${allChunks.length} chunks:`);
  for (const chunk of allChunks) {
    console.log(`   [${chunk.source}] "${chunk.heading}" (${chunk.content.length} chars)`);
  }

  // 4. Initialize database and clear existing data
  const db = new ChatDatabase(DB_PATH);
  console.log('\n🗑️  Clearing existing embeddings...');
  db.clearChunks();
  db.clearCache(); // Also clear cache since knowledge base changed

  // 5. Generate embeddings and insert
  console.log('\n🧠 Generating embeddings with Ollama...');
  let successCount = 0;

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    process.stdout.write(`   [${i + 1}/${allChunks.length}] "${chunk.heading}"...`);

    try {
      const embedding = await ollamaEmbed(OLLAMA_HOST, EMBED_MODEL, chunk.embeddingText);
      db.insertChunk(chunk, embedding);
      console.log(' ✓');
      successCount++;
    } catch (err) {
      console.log(` ✗ ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Embedded ${successCount}/${allChunks.length} chunks into ${DB_PATH}`);
  console.log(`💰 Cost: $0.00 (fully local)`);
  console.log(`\n🚀 Start the server with: npm start`);
}

main().catch(console.error);
