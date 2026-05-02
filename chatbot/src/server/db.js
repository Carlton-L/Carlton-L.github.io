/**
 * db.js — SQLite database with sqlite-vec for vector search
 *
 * Handles:
 * - Knowledge chunk storage and retrieval
 * - Vector similarity search via sqlite-vec
 * - Semantic response caching
 * - Conversation logging for analytics
 *
 * All data lives in a single SQLite file — no external database needed.
 */

import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export class ChatDatabase {
  constructor(dbPath) {
    // Ensure data directory exists
    mkdirSync(dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrent read performance

    // Load sqlite-vec extension
    sqliteVec.load(this.db);

    this._initSchema();
  }

  _initSchema() {
    this.db.exec(`
      -- Knowledge chunks with metadata
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        heading TEXT NOT NULL,
        file_title TEXT,
        source_file TEXT NOT NULL,
        topic TEXT,
        keywords TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Virtual table for vector search (sqlite-vec)
      -- IMPORTANT: distance_metric=cosine gives distance 0-2 where similarity = 1 - distance
      CREATE VIRTUAL TABLE IF NOT EXISTS chunk_embeddings USING vec0(
        chunk_id INTEGER PRIMARY KEY,
        embedding FLOAT[768] distance_metric=cosine
      );

      -- Semantic cache for fast repeated answers
      CREATE TABLE IF NOT EXISTS response_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_text TEXT NOT NULL,
        response_text TEXT NOT NULL,
        chunks_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        hit_count INTEGER DEFAULT 0
      );

      -- Cache embeddings for similarity matching
      CREATE VIRTUAL TABLE IF NOT EXISTS cache_embeddings USING vec0(
        cache_id INTEGER PRIMARY KEY,
        embedding FLOAT[768] distance_metric=cosine
      );

      -- Conversation log for analytics
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        response TEXT NOT NULL,
        chunks_used TEXT,
        cached INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  /**
   * Insert a knowledge chunk with its embedding.
   */
  insertChunk(chunk, embedding) {
    const insert = this.db.prepare(`
      INSERT INTO knowledge_chunks (content, heading, file_title, source_file, topic, keywords)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      chunk.content,
      chunk.heading,
      chunk.fileTitle || null,
      chunk.source,
      chunk.topic || null,
      JSON.stringify(chunk.keywords || [])
    );

    const chunkId = Number(result.lastInsertRowid);

    // Insert embedding into vector table
    // NOTE: sqlite-vec's vec0 tables cannot resolve two positional params (?, ?)
    // when one is a Float32Array — the integer PK must be interpolated directly.
    // This is safe because chunkId is always an integer from lastInsertRowid.
    this.db.prepare(
      `INSERT INTO chunk_embeddings (chunk_id, embedding) VALUES (${chunkId}, ?)`
    ).run(new Float32Array(embedding));

    return chunkId;
  }

  /**
   * Search for similar chunks using vector similarity.
   * Returns chunks sorted by similarity (highest first).
   */
  searchChunks(queryEmbedding, threshold = 0.72, limit = 5) {
    const results = this.db.prepare(`
      SELECT
        ce.chunk_id,
        ce.distance,
        kc.content,
        kc.heading,
        kc.file_title,
        kc.source_file,
        kc.topic
      FROM chunk_embeddings ce
      JOIN knowledge_chunks kc ON kc.id = ce.chunk_id
      WHERE ce.embedding MATCH ?
        AND ce.k = ?
      ORDER BY ce.distance
    `).all(new Float32Array(queryEmbedding), limit * 2); // Fetch extra, filter by threshold

    // With distance_metric=cosine: distance ranges 0 (identical) to 2 (opposite)
    // Similarity = 1 - distance (verified by test: same=0/1.0, ortho=1.0/0.0, opposite=2.0/-1.0)
    return results
      .map((r) => ({
        ...r,
        similarity: 1 - r.distance,
      }))
      .filter((r) => r.similarity >= threshold)
      .slice(0, limit);
  }

  /**
   * Check the semantic cache for a similar previous query.
   */
  findCachedResponse(queryEmbedding, threshold = 0.95) {
    const results = this.db.prepare(`
      SELECT
        ce.cache_id,
        ce.distance,
        rc.response_text,
        rc.chunks_json
      FROM cache_embeddings ce
      JOIN response_cache rc ON rc.id = ce.cache_id
      WHERE ce.embedding MATCH ?
        AND ce.k = 1
    `).all(new Float32Array(queryEmbedding));

    if (results.length === 0) return null;

    const best = results[0];
    const similarity = 1 - best.distance;

    if (similarity < threshold) return null;

    // Update hit count
    this.db.prepare('UPDATE response_cache SET hit_count = hit_count + 1 WHERE id = ?')
      .run(best.cache_id);

    return {
      response: best.response_text,
      chunks: JSON.parse(best.chunks_json),
      similarity,
    };
  }

  /**
   * Cache a response for future similar queries.
   */
  cacheResponse(queryEmbedding, queryText, responseText, chunks) {
    const insert = this.db.prepare(`
      INSERT INTO response_cache (query_text, response_text, chunks_json)
      VALUES (?, ?, ?)
    `);

    const result = insert.run(
      queryText,
      responseText,
      JSON.stringify(
        chunks.map((c) => ({
          heading: c.heading,
          file_title: c.file_title,
          source_file: c.source_file,
          similarity: c.similarity,
        }))
      )
    );

    const cacheId = Number(result.lastInsertRowid);

    // Same vec0 param binding workaround — interpolate integer PK directly
    this.db.prepare(
      `INSERT INTO cache_embeddings (cache_id, embedding) VALUES (${cacheId}, ?)`
    ).run(new Float32Array(queryEmbedding));
  }

  /**
   * Log a conversation for analytics.
   */
  logConversation(query, response, chunks, cached) {
    this.db.prepare(`
      INSERT INTO conversations (query, response, chunks_used, cached)
      VALUES (?, ?, ?, ?)
    `).run(
      query,
      response,
      JSON.stringify(chunks.map((c) => c.heading)),
      cached ? 1 : 0
    );
  }

  /**
   * Get the number of knowledge chunks.
   */
  getChunkCount() {
    return this.db.prepare('SELECT COUNT(*) as count FROM knowledge_chunks').get().count;
  }

  /**
   * Get analytics stats.
   */
  getStats() {
    const totalConversations = this.db
      .prepare('SELECT COUNT(*) as count FROM conversations')
      .get().count;

    const cachedResponses = this.db
      .prepare('SELECT COUNT(*) as count FROM conversations WHERE cached = 1')
      .get().count;

    const topQueries = this.db
      .prepare(`
        SELECT query, COUNT(*) as count
        FROM conversations
        GROUP BY query
        ORDER BY count DESC
        LIMIT 20
      `)
      .all();

    const recentConversations = this.db
      .prepare(`
        SELECT query, response, cached, created_at
        FROM conversations
        ORDER BY created_at DESC
        LIMIT 10
      `)
      .all();

    const chunksUsed = this.db
      .prepare('SELECT COUNT(*) as count FROM knowledge_chunks')
      .get().count;

    const cacheEntries = this.db
      .prepare('SELECT COUNT(*) as count FROM response_cache')
      .get().count;

    return {
      totalConversations,
      cachedResponses,
      cacheHitRate: totalConversations > 0
        ? ((cachedResponses / totalConversations) * 100).toFixed(1) + '%'
        : '0%',
      knowledgeChunks: chunksUsed,
      cacheEntries,
      topQueries,
      recentConversations,
    };
  }

  /**
   * Clear all chunks and embeddings (used before re-embedding).
   */
  clearChunks() {
    this.db.exec('DELETE FROM knowledge_chunks');
    this.db.exec('DELETE FROM chunk_embeddings');
  }

  /**
   * Clear the semantic cache.
   */
  clearCache() {
    this.db.exec('DELETE FROM response_cache');
    this.db.exec('DELETE FROM cache_embeddings');
  }
}
