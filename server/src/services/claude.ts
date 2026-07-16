import Anthropic from '@anthropic-ai/sdk';
import { ConversationTurn, HardConversationScenario } from '../types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COACHING_MODEL = 'claude-sonnet-4-6';
const COACHING_MAX_TOKENS = 96;

/**
 * Called as the coaching response streams in, once per sentence-boundary chunk
 * (a complete thought). Lets the caller pipeline each chunk into TTS without
 * waiting for the full response. See {@link createChunker} for the chunking rules.
 */
export type ChunkHandler = (chunk: string) => void;

/**
 * Incremental sentence-boundary buffer. Tokens are appended via `push`; whenever
 * the buffer ends on `.`/`!`/`?` OR grows past ~28 chars, the accumulated text
 * is flushed as one chunk. `flush` emits any trailing remainder at end-of-stream.
 *
 * We chunk so each piece handed to TTS is a complete-ish thought — this is what
 * lets the first audio byte leave the server long before Claude finishes
 * generating the whole (short) coaching line.
 */
function createChunker(onChunk: ChunkHandler) {
  let buffer = '';

  const tryFlush = () => {
    const trimmed = buffer.trim();
    if (!trimmed) return;
    const endsSentence = /[.!?]$/.test(trimmed);
    if (endsSentence || trimmed.length >= 28) {
      onChunk(trimmed);
      buffer = '';
    }
  };

  return {
    push(textDelta: string) {
      buffer += textDelta;
      tryFlush();
    },
    flush() {
      const trimmed = buffer.trim();
      if (trimmed) onChunk(trimmed);
      buffer = '';
    },
  };
}

function firstTextBlock(content: Array<{ type?: string; text?: string }> | undefined): string | null {
  const block = content?.find((item): item is { type: 'text'; text: string } =>
    Boolean(item) && item.type === 'text' && typeof item.text === 'string'
  );
  return block?.text.trim() ?? null;
}

/**
 * Stream a coaching completion. Emits sentence-boundary chunks through
 * `onChunk` as tokens arrive and resolves with the full concatenated text once
 * the stream ends. If `onChunk` is omitted this is a plain (non-pipelined)
 * completion — behaviour is identical to the old `messages.create` path, so all
 * existing callers keep working unchanged.
 */
async function streamCoaching(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  const createPlainCompletion = async (): Promise<string> => {
    const response = await anthropic.messages.create({
      model: COACHING_MODEL,
      max_tokens: COACHING_MAX_TOKENS,
      system: systemPrompt,
      messages,
    }, { signal });
    return firstTextBlock(response.content as Array<{ type?: string; text?: string }> | undefined) ?? 'HOLD';
  };

  if (!onChunk) {
    return createPlainCompletion();
  }

  const chunker = createChunker((chunk) => {
    // Never speak the HOLD sentinel — it's a "stay silent" signal, not coaching.
    if (chunk.trim() === 'HOLD') return;
    onChunk(chunk);
  });

  try {
    const stream = anthropic.messages.stream({
      model: COACHING_MODEL,
      max_tokens: COACHING_MAX_TOKENS,
      system: systemPrompt,
      messages,
    }, { signal });

    stream.on('text', (textDelta) => chunker.push(textDelta));

    const finalText = (await stream.finalText()).trim();
    // Flush any trailing partial sentence that never hit a boundary.
    chunker.flush();
    return finalText || 'HOLD';
  } catch (error) {
    if (signal?.aborted) throw error;
    const message = error instanceof Error ? error.message : String(error);
    // Anthropic can occasionally close a stream before a text content block is
    // emitted. Fall back to a normal completion so live coaching still works.
    if (/without producing a content block|content block/i.test(message)) {
      const fallback = await createPlainCompletion();
      if (fallback && fallback !== 'HOLD') onChunk(fallback);
      return fallback || 'HOLD';
    }
    throw error;
  }
}

const SALES_SYSTEM_PROMPT = `You are an AI sales coach whispering live coaching to a salesperson during a call. They hear you through their earpiece — only they can hear you.

RULES:
- Only respond when there is something genuinely useful to say. Silence is better than noise.
- Maximum 15 words per coaching suggestion. Shorter is better.
- No preamble, no labels — just the actionable suggestion.
- Never repeat yourself. If you've already given a piece of advice, don't repeat it.
- If nothing actionable, respond with exactly: HOLD

PRIORITY ORDER:
1. Objection detected → immediate rebuttal (e.g. "Price objection: ask what ROI they need to see")
2. Buying signal spotted → "Close it: [specific next step]"
3. You're talking too much → "Let them talk. Ask: [open question]"
4. Awkward silence or stall → suggest a relevant question
5. Prospect mentioned something from their context → surface it

PROSPECT CONTEXT:
{{PROSPECT_CONTEXT}}

CALL GOAL: {{CALL_GOAL}}

OBJECTION LIBRARY:
{{OBJECTION_LIBRARY}}`;

const FALLBACK_OBJECTION_LIBRARY = `- "Too expensive" → Ask: "What ROI would make this a no-brainer for you?"
- "Not the right time" → Ask: "What would need to change for the timing to work?"
- "Need to think about it" → Ask: "What specific questions can I answer right now?"
- "We already have a solution" → Ask: "What's the one thing your current solution doesn't do well?"
- "Need to check with my boss" → Ask: "If it were just your decision, would you move forward?"`;

/**
 * Build the message list sent to Claude. `history` is already the rolling,
 * summarized context assembled by the Session (see Session.ts), so we send it
 * as-is rather than re-slicing here.
 */
function buildMessages(
  history: ConversationTurn[],
  latestTranscript: string
): Anthropic.MessageParam[] {
  return [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    {
      role: 'user',
      content: `New transcript: "${latestTranscript}"`,
    },
  ];
}

export async function generateSalesCoaching(
  latestTranscript: string,
  prospectContext: string,
  callGoal: string,
  objectionLibrary: string,
  history: ConversationTurn[],
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  const systemPrompt = SALES_SYSTEM_PROMPT
    .replace('{{PROSPECT_CONTEXT}}', prospectContext.trim() || 'Not provided')
    .replace('{{CALL_GOAL}}', callGoal.trim() || 'Book a follow-up call or close the deal')
    .replace('{{OBJECTION_LIBRARY}}', objectionLibrary.trim() || FALLBACK_OBJECTION_LIBRARY);

  return streamCoaching(systemPrompt, buildMessages(history, latestTranscript), onChunk, signal);
}

// Shared live-coaching rules for the dating/networking/pitching modes. These
// modes cap suggestions at 12 words (vs. 15 for sales) per product spec.
const LIVE_RULES = `RULES:
- Only respond when there is something genuinely useful to say. Silence is better than noise.
- If the user has gone several turns without a tip, give one short context-aware nudge instead of staying silent.
- Prefer a specific callback, follow-up question, or repair move based on the transcript.
- Avoid generic advice when transcript context exists.
- Maximum 12 words per coaching suggestion. Shorter is better.
- No preamble, no labels — just the actionable suggestion.
- Never repeat yourself. If you've already given a piece of advice, don't repeat it.
- If nothing actionable, respond with exactly: HOLD`;

async function generateCoaching(
  systemPrompt: string,
  latestTranscript: string,
  history: ConversationTurn[],
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  return streamCoaching(systemPrompt, buildMessages(history, latestTranscript), onChunk, signal);
}

export async function generateDatingCoaching(
  latestTranscript: string,
  name: string,
  profileUrl: string,
  intent: string,
  history: ConversationTurn[],
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  const systemPrompt = `You are an expert dating coach whispering live coaching to someone on a date. They hear you through their earpiece — only they can hear you.

${LIVE_RULES}

FOCUS:
- Detect awkward silences → suggest a conversation re-opener
- Read the emotional tone → flag positive or negative signals
- Spot callback opportunities (things they mentioned earlier)
- Ask follow-ups tied to the exact topic they just mentioned
- Avoid generic openers like "ask how her day was" after conversation starts
- If there are only fragments, suggest one simple grounding question
- Suggest escalation cues when the energy is high
- Alert when the user is over-talking (talk ratio)

DATE: ${name.trim() || 'Not provided'}
PROFILE: ${profileUrl.trim() || 'Not provided'}
INTENT: ${intent.trim() || 'Not provided'}`;

  return generateCoaching(systemPrompt, latestTranscript, history, onChunk, signal);
}

export async function generateNetworkingCoaching(
  latestTranscript: string,
  eventName: string,
  attendeeList: string,
  history: ConversationTurn[],
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  const systemPrompt = `You are an expert networking coach whispering live coaching to someone working a room. They hear you through their earpiece — only they can hear you.

${LIVE_RULES}

FOCUS:
- Surface relevant talking points based on who they're talking to
- Suggest graceful exits when a conversation is dying
- Remind them to capture contact info before leaving

EVENT: ${eventName.trim() || 'Not provided'}
TARGET CONTACTS:
${attendeeList.trim() || 'Not provided'}`;

  return generateCoaching(systemPrompt, latestTranscript, history, onChunk, signal);
}

export async function generatePitchingCoaching(
  latestTranscript: string,
  title: string,
  deck: string,
  audience: string,
  history: ConversationTurn[],
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  const systemPrompt = `You are an expert pitch coach whispering live coaching to a presenter mid-pitch. They hear you through their earpiece — only they can hear you.

${LIVE_RULES}

FOCUS:
- Track structure and timing → alert if running long on a section
- Surface answers when Q&A goes off-script
- Detect audience disengagement signals in speech
- Remind the presenter of key metrics if they seem to forget
- Suggest pauses and emphasis moments

PITCH: ${title.trim() || 'Not provided'}
AUDIENCE: ${audience.trim() || 'Not provided'}
DECK / KEY POINTS:
${deck.trim() || 'Not provided'}`;

  return generateCoaching(systemPrompt, latestTranscript, history, onChunk, signal);
}

/**
 * Condense a slice of older conversation turns into a few sentences, used by
 * the Session's rolling context window (see Session.ts). Runs as its own small,
 * non-streaming Claude call so it never blocks the live coaching path. Returns
 * an empty string on failure so the caller can fall back gracefully (keep the
 * raw turns) rather than dropping context.
 */
export async function summarizeConversation(
  turns: ConversationTurn[],
  priorSummary = '',
  signal?: AbortSignal
): Promise<string> {
  if (turns.length === 0) return priorSummary;

  const transcript = turns
    .map((t) => `${t.role === 'user' ? 'Speaker' : 'Coach'}: ${t.content}`)
    .join('\n');

  const priorBlock = priorSummary
    ? `Existing summary so far:\n${priorSummary}\n\nNewer turns to fold in:\n`
    : 'Conversation so far:\n';

  try {
    const response = await anthropic.messages.create({
      model: COACHING_MODEL,
      max_tokens: 200,
      system:
        'You compress conversation history for context. Output only the summary, no preamble.',
      messages: [
        {
          role: 'user',
          content: `${priorBlock}${transcript}\n\nSummarize the key points of this conversation so far in 3-5 sentences for context.`,
        },
      ],
    }, { signal });
    const summary = firstTextBlock(response.content as Array<{ type?: string; text?: string }> | undefined) ?? '';
    return summary || priorSummary;
  } catch {
    // On any failure, keep the prior summary; the Session will retain raw turns.
    return priorSummary;
  }
}

// Per-scenario coaching prompts for Hard Conversations mode. Each whispers
// scenario-specific guidance to someone in a high-stakes conversation.
export function getHardConversationPrompt(scenario: HardConversationScenario): string {
  switch (scenario) {
    case 'salary_negotiation':
      return `You are an expert salary negotiation coach. Provide short, real-time suggestions (≤12 words). Focus on: anchoring high, counter-offer framing, coaching the user to hold silence, flagging if they concede too quickly. After the session, summarize key moments and negotiation effectiveness.`;
    case 'firing':
      return `You are an HR and leadership coach specializing in difficult conversations. Provide short, real-time suggestions (≤12 words). Focus on: legally safe phrasing, empathy and humanity, de-escalation if emotions rise. After the session, summarize how the conversation went and what was handled well.`;
    case 'breakup':
      return `You are a compassionate communication coach. Provide short, real-time suggestions (≤12 words). Focus on: clear and kind language, detecting circular arguing, suggesting exit ramps when the conversation loops. After the session, summarize the emotional arc and key moments.`;
    case 'confrontation':
      return `You are a conflict resolution coach. Provide short, real-time suggestions (≤12 words). Focus on: non-accusatory framing, "I" statement coaching, de-escalation. After the session, summarize what was resolved and what remains open.`;
    case 'dispute':
      return `You are an assertive communication coach for disputes. Provide short, real-time suggestions (≤12 words). Focus on: surfacing relevant leverage, rights-aware language, professional assertiveness. After the session, summarize the outcome and next steps.`;
    case 'therapy':
      return `You are a therapy preparation coach. Provide short, real-time suggestions (≤12 words). Focus on: emotional vocabulary, surfacing key topics, reflection cues. After the session, provide structured notes: key topics surfaced, emotional themes, and items to raise with the therapist.`;
  }
}

export type SessionAnalysis = {
  summary: string;
  strengths: string[];
  improvements: string[];
  keyMoment: string;
  followUps: Array<{ timing: string; text: string }>;
  memory?: {
    interests: string[];
    personalDetails: string[];
    callbackTopics: string[];
  };
  secondDatePrep?: {
    recommendations: string[];
    conversationStarters: string[];
    nextDateIdea: string;
    remember: string[];
  };
};

export async function analyzeSession(input: {
  mode: string;
  transcriptText: string;
  coachingItems: string[];
  context: Record<string, string>;
}): Promise<SessionAnalysis | null> {
  const { mode, transcriptText, coachingItems, context } = input;
  if (!transcriptText.trim() && coachingItems.length === 0) return null;

  const contextBlock = Object.entries(context)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const coachingBlock = coachingItems.length > 0
    ? `\nLive coaching given:\n${coachingItems.map((c) => `- ${c}`).join('\n')}`
    : '';

  const modeLabel: Record<string, string> = {
    sales: 'sales call',
    dating: 'date',
    networking: 'networking event',
    pitching: 'pitch / presentation',
    hard_conversations: 'difficult conversation',
  };

  const followUpInstructions: Record<string, string> = {
    sales: 'Provide 1-2 follow-up actions with the prospect (e.g. "Send proposal", "Schedule demo").',
    dating: 'Provide 1-2 follow-up messages to send the date, with suggested timing (e.g. "Text tonight", "Wait 2 days").',
    networking: 'Provide 1-2 LinkedIn/email follow-up actions for key contacts met.',
    pitching: 'Provide 1-2 post-pitch follow-up steps (e.g. "Send deck", "Schedule Q&A call").',
    hard_conversations: 'Provide 1-2 concrete next steps based on the conversation outcome.',
  };

  const memoryInstructions: Record<string, string> = {
    sales: 'Capture concrete buying signals, priorities, decision criteria, and names from the transcript.',
    dating: 'Capture interests, personal details, hobbies, favorite places, family details, and callback topics.',
    networking: 'Capture employer, role, shared interests, goals, and who should be followed up with.',
    pitching: 'Capture objections, questions, priorities, and any audience-specific details worth remembering.',
    hard_conversations: 'Capture names, stakes, boundaries, and any details that should be remembered for the next conversation.',
  };

  try {
    const response = await anthropic.messages.create({
      model: COACHING_MODEL,
      max_tokens: 500,
      system: 'You are an expert communication coach. Analyze a completed session and return a JSON object. Output ONLY valid JSON — no markdown, no explanation.',
      messages: [
        {
          role: 'user',
          content: `Analyze this completed ${modeLabel[mode] ?? 'conversation'} session.

${contextBlock ? `Context:\n${contextBlock}\n` : ''}
Transcript:
${transcriptText || '(no transcript captured)'}
${coachingBlock}

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentences on how the session went overall",
  "strengths": ["specific thing done well", "another strength"],
  "improvements": ["specific thing to work on", "another improvement"],
  "keyMoment": "1 sentence describing the most pivotal moment",
  "followUps": [{ "timing": "timing label", "text": "action or message text" }],
  "memory": {
    "interests": ["what this person likes or cares about"],
    "personalDetails": ["important personal detail to remember"],
    "callbackTopics": ["topics, names, or details to bring up later"]
  },
  "secondDatePrep": {
    "recommendations": ["specific recommendation for the next date"],
    "conversationStarters": ["question or callback from this transcript"],
    "nextDateIdea": "one date idea that fits what they discussed",
    "remember": ["specific detail to remember from the first date"]
  }
}

${followUpInstructions[mode] ?? ''}
${memoryInstructions[mode] ? `For ${modeLabel[mode] ?? 'this'} sessions, fill memory using the full transcript and context. Keep the items specific and factual.` : ''}
For dating mode, fill secondDatePrep using the full transcript: callbacks, topics to revisit, what to avoid, and a next-date idea. For other modes, return empty arrays and an empty nextDateIdea.
Be specific and reference what actually happened in the transcript. Strengths and improvements arrays should have 2-3 items each.`,
        },
      ],
    });

    const rawText = firstTextBlock(response.content as Array<{ type?: string; text?: string }> | undefined);
    if (!rawText) return null;

    const raw = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    return JSON.parse(raw) as SessionAnalysis;
  } catch {
    return null;
  }
}

export type TextCoachSuggestion = {
  bestReply: string;
  alternateReplies: Array<{ label: string; text: string }>;
  nextMove: string;
  rationale: string;
  whatToAvoid: string[];
  confidence: number;
};

function parseTextCoachSuggestion(raw: string): TextCoachSuggestion | null {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleaned) as Partial<TextCoachSuggestion>;
    if (
      typeof parsed.bestReply !== 'string'
      || !Array.isArray(parsed.alternateReplies)
      || typeof parsed.nextMove !== 'string'
      || typeof parsed.rationale !== 'string'
      || !Array.isArray(parsed.whatToAvoid)
    ) {
      return null;
    }
    return {
      bestReply: parsed.bestReply.trim(),
      alternateReplies: parsed.alternateReplies
        .filter((item): item is { label: string; text: string } =>
          Boolean(item) && typeof item.label === 'string' && typeof item.text === 'string')
        .slice(0, 3)
        .map((item) => ({ label: item.label.trim(), text: item.text.trim() })),
      nextMove: parsed.nextMove.trim(),
      rationale: parsed.rationale.trim(),
      whatToAvoid: parsed.whatToAvoid
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4),
      confidence: Number.isFinite(parsed.confidence) ? Number(parsed.confidence) : 72,
    };
  } catch {
    return null;
  }
}

export async function generateTextMessageCoaching(input: {
  thread: string;
  latestMessage: string;
  goal: string;
  relationship: string;
  tone: string;
  length: 'short' | 'balanced' | 'warm' | 'direct';
}): Promise<TextCoachSuggestion | null> {
  const prompt = `You are an expert text-message coach.

Help the user reply naturally, clearly, and with the right tone.
- Return only valid JSON.
- Do not add markdown, code fences, or explanation.
- Keep the reply human, not robotic.
- If the thread lacks context, still provide the best possible reply.
- Keep the best reply short enough to send in a real text thread.

Return exactly this shape:
{
  "bestReply": "copy-ready reply",
  "alternateReplies": [
    { "label": "warmer", "text": "..." },
    { "label": "more direct", "text": "..." }
  ],
  "nextMove": "what to do after sending it",
  "rationale": "why this reply works",
  "whatToAvoid": ["things not to say", "another pitfall"],
  "confidence": 0
}

Context:
- Relationship: ${input.relationship.trim() || 'Not provided'}
- Goal: ${input.goal.trim() || 'Not provided'}
- Tone: ${input.tone}
- Length: ${input.length}

Conversation thread:
${input.thread.trim() || '(no thread provided)'}

Latest incoming message:
${input.latestMessage.trim() || '(no latest message provided)'}`;

  try {
    const response = await anthropic.messages.create({
      model: COACHING_MODEL,
      max_tokens: 450,
      system: prompt,
      messages: [
        {
          role: 'user',
          content: 'Draft the best reply and two alternatives.',
        },
      ],
    });
    const text = firstTextBlock(response.content as Array<{ type?: string; text?: string }> | undefined);
    if (!text) return null;
    return parseTextCoachSuggestion(text);
  } catch {
    return null;
  }
}

export type RoleplayTurn = {
  assistantReply: string;
  coaching: string;
  nextMove: string;
  followUpQuestion: string;
  intensity: 'low' | 'medium' | 'high';
  memory: {
    interests: string[];
    personalDetails: string[];
    callbackTopics: string[];
  };
};

function parseRoleplayTurn(raw: string): RoleplayTurn | null {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleaned) as Partial<RoleplayTurn>;
    if (
      typeof parsed.assistantReply !== 'string'
      || typeof parsed.coaching !== 'string'
      || typeof parsed.nextMove !== 'string'
      || typeof parsed.followUpQuestion !== 'string'
      || !['low', 'medium', 'high'].includes(parsed.intensity ?? '')
      || typeof parsed.memory !== 'object'
      || parsed.memory === null
    ) {
      return null;
    }
    return {
      assistantReply: parsed.assistantReply.trim(),
      coaching: parsed.coaching.trim(),
      nextMove: parsed.nextMove.trim(),
      followUpQuestion: parsed.followUpQuestion.trim(),
      intensity: parsed.intensity ?? 'medium',
      memory: {
        interests: Array.isArray(parsed.memory.interests)
          ? parsed.memory.interests.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 6)
          : [],
        personalDetails: Array.isArray(parsed.memory.personalDetails)
          ? parsed.memory.personalDetails.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 6)
          : [],
        callbackTopics: Array.isArray(parsed.memory.callbackTopics)
          ? parsed.memory.callbackTopics.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 6)
          : [],
      },
    };
  } catch {
    return null;
  }
}

export async function generateRoleplayTurn(input: {
  mode: string;
  scenario: string;
  goal: string;
  context: string;
  memory: {
    interests: string[];
    personalDetails: string[];
    callbackTopics: string[];
  };
  transcript: string;
  userMessage: string;
  turnCount: number;
  signal?: AbortSignal;
}): Promise<RoleplayTurn | null> {
  const prompt = `You are playing the OTHER person in a realistic practice conversation. Stay in character.

Return only valid JSON with this shape:
{
  "assistantReply": "what the other person says next",
  "coaching": "brief tip to the user",
  "nextMove": "what the user should do next",
  "followUpQuestion": "a helpful follow-up prompt for practice",
  "intensity": "low|medium|high",
  "memory": {
    "interests": ["specific interests learned"],
    "personalDetails": ["specific personal details learned"],
    "callbackTopics": ["topics to remember next time"]
  }
}

Mode: ${input.mode}
Scenario: ${input.scenario}
Goal: ${input.goal || 'Not provided'}
Context: ${input.context || 'Not provided'}
Known memory:
Interests: ${input.memory.interests.join('; ') || 'None yet'}
Personal details: ${input.memory.personalDetails.join('; ') || 'None yet'}
Callback topics: ${input.memory.callbackTopics.join('; ') || 'None yet'}

Conversation so far:
${input.transcript || '(none)'}

User just said:
${input.userMessage}

Rules:
- Keep it realistic and grounded in the scenario.
- Ask only one follow-up question at a time.
- Reflect the user's style and the mode appropriately.
- Do not mention that you are an AI.
- Prefer concrete details the user can reuse later.
- If it is a dating scenario, surface interests and callback topics naturally.
- If it is a sales or pitching scenario, surface objections, priorities, and next-step hooks.`;

  try {
    const response = await anthropic.messages.create({
      model: COACHING_MODEL,
      max_tokens: 450,
      system: 'You are a scenario roleplay partner and conversation coach. Output only valid JSON.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }, { signal: input.signal });
    const text = firstTextBlock(response.content as Array<{ type?: string; text?: string }> | undefined);
    if (!text) return null;
    return parseRoleplayTurn(text);
  } catch {
    return null;
  }
}

export async function generateHardConversationCoaching(
  latestTranscript: string,
  scenario: HardConversationScenario,
  situation: string,
  conversationGoal: string,
  history: ConversationTurn[],
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  const systemPrompt = `${getHardConversationPrompt(scenario)}

You are whispering live coaching into the user's earpiece — only they can hear you.

${LIVE_RULES}

SITUATION: ${situation.trim() || 'Not provided'}
GOAL: ${conversationGoal.trim() || 'Not provided'}`;

  return generateCoaching(systemPrompt, latestTranscript, history, onChunk, signal);
}
