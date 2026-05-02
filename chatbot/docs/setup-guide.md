# Setup Guide: Digital Twin Chatbot

Step-by-step instructions to get the chatbot running.

---

## Prerequisites

- Node.js 18+
- A Supabase account (free tier: https://supabase.com)
- An OpenAI API key (for embeddings — costs ~$0.001 for the full knowledge base)
- An Anthropic API key OR OpenAI API key (for LLM generation)

## Step 1: Set Up Supabase

1. Create a new project at https://supabase.com/dashboard
2. Go to **SQL Editor** and paste the contents of `chatbot/src/supabase-schema.sql`
3. Click **Run** to create the tables and functions
4. Note your project URL and keys from **Settings > API**:
   - `SUPABASE_URL` (e.g., `https://abcdefg.supabase.co`)
   - `SUPABASE_ANON_KEY` (public, used by the frontend)
   - `SUPABASE_SERVICE_ROLE_KEY` (secret, used by the embedding script)

## Step 2: Install Dependencies

```bash
cd chatbot
npm init -y
npm install @supabase/supabase-js openai
```

## Step 3: Populate the Knowledge Base

Edit the markdown files in `chatbot/knowledge-base/` to fill in your details. Look for `<!-- TODO -->` comments — these mark sections that need your personal input.

Priority files to complete first:
1. `01-background.md` — Your bio (mostly done)
2. `08-faq.md` — Common questions (mostly done)
3. `03-skills.md` — Technical skills (mostly done)
4. Project files in `04-projects/` — Add technical detail

## Step 4: Generate Embeddings

```bash
OPENAI_API_KEY=sk-... \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_KEY=eyJ... \
node chatbot/src/embed-knowledge-base.js
```

This reads all knowledge base files, chunks them by heading, generates vector embeddings, and stores them in Supabase. Run it again whenever you update the knowledge base.

## Step 5: Deploy the Edge Function

Install the Supabase CLI if you haven't:

```bash
npm install -g supabase
```

Link your project and deploy:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  # if using Claude
supabase functions deploy chat --no-verify-jwt
```

The `--no-verify-jwt` flag allows anonymous access (your portfolio is public). In production, you can add rate limiting via Supabase's built-in features.

## Step 6: Test the Edge Function

```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is your background?"}]}'
```

You should get a streaming response in Carlton's voice.

## Step 7: Add the Widget to Your Site

In your main `App.jsx`:

```jsx
import ChatWidget from './chatbot/src/ChatWidget';

function App() {
  return (
    <>
      {/* Your existing app content */}
      <ChatWidget supabaseUrl="https://your-project.supabase.co" />
    </>
  );
}
```

## Step 8: Configure CORS (Production)

In the Edge Function (`chat/index.ts`), update the CORS header:

```ts
'Access-Control-Allow-Origin': 'https://carlton.dev'
```

## Cost Monitoring

Check your usage at:
- **Supabase Dashboard > Reports** — Edge Function invocations, database size
- **OpenAI Dashboard > Usage** — Embedding and (if used) generation costs
- **Anthropic Console > Usage** — Claude API costs

At portfolio traffic levels (~100-200 conversations/month), expect under $2/month total.
