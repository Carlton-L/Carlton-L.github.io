# Accuracy Testing Plan

How to evaluate whether the chatbot gives good, accurate, well-grounded answers.

---

## Testing Principles

1. **Wrong answers are worse than no answer.** A chatbot that confidently says false things about you damages trust. The "I don't know" path must work reliably.
2. **Test what visitors will actually ask.** Focus on realistic questions, not edge cases.
3. **Test iteratively.** Run the test suite after every knowledge base update or prompt change.

---

## Test Categories

### Category 1: Factual Accuracy (Must Pass)

Questions with objectively correct answers based on the knowledge base.

| # | Question | Expected Answer Contains | Failure Mode |
|---|----------|-------------------------|--------------|
| 1 | "Where did you work before Futurity?" | Apple, Pensar | Invents companies, wrong dates |
| 2 | "What did you do at Apple?" | Vision Products Group, hardware engineering, Vision Pro | Invents specific projects, claims software role |
| 3 | "What's the Immersive Experience Builder?" | Framework, 100+ components, sensor-driven, spatial experiences | Wrong project description |
| 4 | "What's your tech stack?" | React, TypeScript, Python, Node.js | Claims languages not in knowledge base |
| 5 | "Where did you get your Master's?" | Harbour.Space University, Barcelona, Interaction Design | Wrong school or degree |
| 6 | "What is FAST?" | Futures-as-a-service, AI, network graph science, foresight | Wrong product description |
| 7 | "What's Futures Garden?" | EU initiative, 2040, digital souls, LLM, NFC, Orb | Confuses with another project |
| 8 | "Are you available for hire?" | Mentions current role, interest in AI+UX/frontend roles, contact email | Makes commitments or says "not available" if that's wrong |

### Category 2: "I Don't Know" Handling (Must Pass)

Questions the chatbot should NOT answer confidently because the knowledge base doesn't cover them.

| # | Question | Expected Behavior |
|---|----------|-------------------|
| 9 | "What's your salary?" | Declines, redirects to contact |
| 10 | "What do you think about the 2026 election?" | Politely says it's outside their domain |
| 11 | "Can you help me write a cover letter?" | Explains it's focused on Carlton's background, not general tasks |
| 12 | "What's your blood type?" | Declines gracefully |
| 13 | "Tell me about your project called QuantumBridge" | Says it doesn't have information about that project (it's made up) |
| 14 | "What GPA did you graduate with?" | Says it doesn't have that specific detail |

### Category 3: Tone & Character (Should Pass)

The chatbot should sound like Carlton — warm, technical, a maker.

| # | Question | Check For |
|---|----------|-----------|
| 15 | "Why should I hire you?" | Enthusiastic but grounded; references specific skills and projects, not generic claims |
| 16 | "What makes you different?" | Mentions the hardware+software intersection, practical experience |
| 17 | "Tell me about yourself" | Conversational, first-person, hits key career arc points |
| 18 | "What are you passionate about?" | Authentic-sounding, references specific interests from knowledge base |

### Category 4: Conversation Quality (Should Pass)

Multi-turn and edge-case behavior.

| # | Scenario | Check For |
|---|----------|-----------|
| 19 | Ask about Apple, then follow up "Tell me more about that" | Maintains context, elaborates on Apple role |
| 20 | Ask 3 questions in a row without waiting | Handles all gracefully, no crashes |
| 21 | Send a very long message (500+ chars) | Truncates or handles without error |
| 22 | Send empty or whitespace-only message | Input validation prevents send |
| 23 | Ask the same question twice | Gives consistent (not identical) answers |

---

## Scoring Rubric

For each test question, score 0-3:

- **3 — Excellent:** Accurate, well-sourced, good tone, appropriate detail level
- **2 — Acceptable:** Mostly accurate, minor tone issues or slightly too verbose/brief
- **1 — Poor:** Contains inaccuracies, wrong tone, or fails to cite sources
- **0 — Fail:** Hallucinated facts, confidently wrong, or crashed

**Passing threshold:** Average score >= 2.0 across all tests, with zero scores of 0 in Category 1 or 2.

---

## Automated Testing Script

Save this as `chatbot/tests/run-accuracy-tests.js` and run it against your deployed endpoint.

```javascript
/**
 * Automated accuracy test runner.
 * Sends test questions to the chatbot API and checks responses
 * against expected patterns.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co node chatbot/tests/run-accuracy-tests.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL;

const tests = [
  // Category 1: Factual Accuracy
  {
    id: 1,
    category: 'factual',
    question: 'Where did you work before Futurity Systems?',
    mustContain: ['apple', 'pensar'],
    mustNotContain: ['google', 'microsoft', 'meta'],
  },
  {
    id: 2,
    category: 'factual',
    question: 'What is the Immersive Experience Builder?',
    mustContain: ['framework', 'spatial', 'experience'],
    mustNotContain: [],
  },
  {
    id: 3,
    category: 'factual',
    question: "Where did you study for your Master's degree?",
    mustContain: ['harbour', 'space', 'barcelona'],
    mustNotContain: ['mit', 'stanford', 'carnegie'],
  },
  {
    id: 4,
    category: 'factual',
    question: 'What is FAST?',
    mustContain: ['futures', 'foresight'],
    mustNotContain: [],
  },

  // Category 2: I Don't Know
  {
    id: 9,
    category: 'refusal',
    question: "What's your salary?",
    mustContain: ["don't have", "reach", "contact", "carlton@"],
    mustNotContain: ['$', 'salary is', 'I make', 'I earn'],
    anyContain: true, // pass if ANY of mustContain matches
  },
  {
    id: 13,
    category: 'refusal',
    question: 'Tell me about your QuantumBridge project',
    mustContain: ["don't have", "not familiar", "no information"],
    mustNotContain: ['quantumbridge is', 'I built quantumbridge'],
    anyContain: true,
  },
  {
    id: 10,
    category: 'refusal',
    question: 'What are your thoughts on the 2026 presidential election?',
    mustContain: ['outside', 'work', 'projects', 'skills'],
    mustNotContain: [],
    anyContain: true,
  },
];

async function runTest(test) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: test.question }],
      }),
    });

    // Collect streamed response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullText += parsed.delta.text;
          } else if (parsed.choices?.[0]?.delta?.content) {
            fullText += parsed.choices[0].delta.content;
          }
        } catch {}
      }
    }

    const lower = fullText.toLowerCase();

    // Check mustContain
    const containCheck = test.anyContain
      ? test.mustContain.some((term) => lower.includes(term.toLowerCase()))
      : test.mustContain.every((term) => lower.includes(term.toLowerCase()));

    // Check mustNotContain
    const notContainCheck = test.mustNotContain.every(
      (term) => !lower.includes(term.toLowerCase())
    );

    const passed = containCheck && notContainCheck;

    return {
      ...test,
      passed,
      response: fullText.slice(0, 200) + (fullText.length > 200 ? '...' : ''),
      containCheck,
      notContainCheck,
    };
  } catch (error) {
    return {
      ...test,
      passed: false,
      response: `ERROR: ${error.message}`,
      containCheck: false,
      notContainCheck: true,
    };
  }
}

async function main() {
  console.log('Running accuracy tests...\n');

  const results = [];
  for (const test of tests) {
    process.stdout.write(`  Test #${test.id}: "${test.question.slice(0, 50)}..." `);
    const result = await runTest(test);
    results.push(result);
    console.log(result.passed ? 'PASS' : 'FAIL');
    if (!result.passed) {
      console.log(`    Response: ${result.response}`);
      console.log(`    Contains check: ${result.containCheck}`);
      console.log(`    Not-contains check: ${result.notContainCheck}`);
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\nResults: ${passed}/${total} passed`);

  const factualFails = results.filter(
    (r) => r.category === 'factual' && !r.passed
  );
  if (factualFails.length > 0) {
    console.log('\nCRITICAL: Factual accuracy failures:');
    factualFails.forEach((f) =>
      console.log(`  - Test #${f.id}: ${f.question}`)
    );
  }

  process.exit(passed === total ? 0 : 1);
}

main();
```

---

## When to Run Tests

- After editing any knowledge base file and re-embedding
- After changing the system prompt
- After switching LLM providers or models
- Before deploying to production
- Weekly spot-check with 2-3 manual questions

---

## Expanding the Test Suite

As real visitors use the chatbot, review the conversation logs (stored in `chat_conversations` table) to:

1. **Find common questions** you haven't covered — add them to the knowledge base
2. **Find failure cases** — add them as test cases
3. **Find questions with mediocre answers** — improve the relevant knowledge base section
4. **Track what topics get the most questions** — prioritize those for depth
