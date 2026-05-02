-- ============================================
-- Supabase pgvector schema for digital twin chatbot
-- Run this in the Supabase SQL Editor to set up the database
-- ============================================

-- Enable the pgvector extension
create extension if not exists vector with schema extensions;

-- Knowledge chunks table
create table if not exists knowledge_chunks (
  id bigserial primary key,
  content text not null,                           -- The actual text content
  heading text not null,                           -- Section heading (e.g., "Who I Am")
  file_title text,                                 -- File-level title (e.g., "Professional Background")
  source_file text not null,                       -- Relative path to source markdown file
  topic text,                                      -- Topic from frontmatter (e.g., "professional-background")
  keywords text[] default '{}',                    -- Keywords from frontmatter
  embedding vector(1536),                          -- OpenAI text-embedding-3-small
  created_at timestamptz default now()
);

-- Index for fast vector similarity search
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);  -- For small datasets (<1000 rows), lists = sqrt(n) is fine

-- Function to search for similar chunks
-- Called from the Edge Function with: supabase.rpc('match_knowledge', { ... })
create or replace function match_knowledge(
  query_embedding vector(1536),
  match_threshold float default 0.72,
  match_count int default 5
)
returns table (
  id bigint,
  content text,
  heading text,
  file_title text,
  source_file text,
  topic text,
  similarity float
)
language sql stable
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.content,
    knowledge_chunks.heading,
    knowledge_chunks.file_title,
    knowledge_chunks.source_file,
    knowledge_chunks.topic,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- Optional: conversation log for analytics
create table if not exists chat_conversations (
  id uuid default gen_random_uuid() primary key,
  messages jsonb not null default '[]',
  created_at timestamptz default now(),
  user_agent text,
  ip_hash text  -- hash, not raw IP, for privacy
);

-- RLS: allow anonymous reads from knowledge_chunks, deny writes
alter table knowledge_chunks enable row level security;

create policy "Allow anonymous read access"
  on knowledge_chunks for select
  to anon
  using (true);

-- RLS for chat_conversations: allow anonymous inserts only
alter table chat_conversations enable row level security;

create policy "Allow anonymous insert"
  on chat_conversations for insert
  to anon
  with check (true);
