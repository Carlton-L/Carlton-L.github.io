/**
 * embed-knowledge-base.js
 *
 * Reads all markdown files from the knowledge base, chunks them by heading,
 * generates embeddings via OpenAI, and upserts them into Supabase pgvector.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node chatbot/src/embed-knowledge-base.js
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js openai
 *
 * Run this script whenever you update the knowledge base files.
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ─── Config ──────────────────────────────────────────────
const KNOWLEDGE_BASE_DIR = new URL('../knowledge-base', import.meta.url).pathname;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const TABLE_NAME = 'knowledge_chunks';

// ─── Clients ─────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Chunking ────────────────────────────────────────────

/**
 * Parse frontmatter from a markdown file.
 * Returns { metadata: {...}, content: "..." }
 */
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, content: text };

  const metadata = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      let value = rest.join(':').trim();
      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      }
      metadata[key.trim()] = value;
    }
  }
  return { metadata, content: match[2] };
}

/**
 * Split markdown content into chunks by ## headings.
 * Each chunk includes the file-level # heading as context.
 */
function chunkByHeading(content, sourceFile) {
  const lines = content.split('\n');
  const chunks = [];
  let fileTitle = '';
  let currentHeading = '';
  let currentContent = [];

  for (const line of lines) {
    // Skip HTML comments (TODO markers)
    if (line.trim().startsWith('<!--')) continue;
    if (line.trim().endsWith('-->')) continue;

    if (line.startsWith('# ') && !line.startsWith('## ')) {
      fileTitle = line.replace('# ', '').trim();
      continue;
    }

    if (line.startsWith('## ')) {
      // Save previous chunk
      if (currentHeading && currentContent.length > 0) {
        const text = currentContent.join('\n').trim();
        if (text.length > 30) { // Skip near-empty chunks
          chunks.push({
            heading: currentHeading,
            fileTitle,
            content: text,
            source: sourceFile,
          });
        }
      }
      currentHeading = line.replace('## ', '').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Don't forget the last chunk
  if (currentHeading && currentContent.length > 0) {
    const text = currentContent.join('\n').trim();
    if (text.length > 30) {
      chunks.push({
        heading: currentHeading,
        fileTitle,
        content: text,
        source: sourceFile,
      });
    }
  }

  // If no ## headings were found, treat the whole file as one chunk
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

/**
 * Recursively find all .md files in a directory.
 */
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

// ─── Embedding ───────────────────────────────────────────

/**
 * Generate embedding for a text string.
 */
async function embed(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log('📚 Reading knowledge base files...');
  const files = await findMarkdownFiles(KNOWLEDGE_BASE_DIR);
  console.log(`   Found ${files.length} markdown files`);

  // Parse and chunk all files
  const allChunks = [];
  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const { metadata, content } = parseFrontmatter(raw);
    const relPath = relative(KNOWLEDGE_BASE_DIR, filePath);
    const chunks = chunkByHeading(content, relPath);

    for (const chunk of chunks) {
      // Build the text that gets embedded: heading + content for better retrieval
      const embeddingText = `${chunk.fileTitle} — ${chunk.heading}\n\n${chunk.content}`;
      allChunks.push({
        ...chunk,
        embeddingText,
        topic: metadata.topic || '',
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
      });
    }
  }

  console.log(`\n🔪 Created ${allChunks.length} chunks from ${files.length} files`);

  // Preview chunks
  for (const chunk of allChunks) {
    console.log(`   [${chunk.source}] "${chunk.heading}" (${chunk.content.length} chars)`);
  }

  // Clear existing data
  console.log('\n🗑️  Clearing existing embeddings...');
  const { error: deleteError } = await supabase.from(TABLE_NAME).delete().neq('id', 0);
  if (deleteError) {
    console.error('   Warning: Could not clear table (may not exist yet):', deleteError.message);
  }

  // Generate embeddings and upsert
  console.log('\n🧠 Generating embeddings...');
  let successCount = 0;

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    process.stdout.write(`   Embedding ${i + 1}/${allChunks.length}: "${chunk.heading}"...`);

    try {
      const embedding = await embed(chunk.embeddingText);

      const { error } = await supabase.from(TABLE_NAME).insert({
        content: chunk.content,
        heading: chunk.heading,
        file_title: chunk.fileTitle,
        source_file: chunk.source,
        topic: chunk.topic,
        keywords: chunk.keywords,
        embedding,
      });

      if (error) throw error;
      console.log(' ✓');
      successCount++;
    } catch (err) {
      console.log(` ✗ ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Embedded ${successCount}/${allChunks.length} chunks.`);

  // Report estimated cost
  const totalChars = allChunks.reduce((sum, c) => sum + c.embeddingText.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);
  const estimatedCost = (estimatedTokens / 1_000_000) * 0.02;
  console.log(`💰 Estimated embedding cost: ~$${estimatedCost.toFixed(4)} (${estimatedTokens} tokens)`);
}

main().catch(console.error);
