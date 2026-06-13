import Anthropic from '@anthropic-ai/sdk';
import { ConversationTurn } from '../types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

export async function generateSalesCoaching(
  latestTranscript: string,
  prospectContext: string,
  callGoal: string,
  objectionLibrary: string,
  history: ConversationTurn[]
): Promise<string> {
  const systemPrompt = SALES_SYSTEM_PROMPT
    .replace('{{PROSPECT_CONTEXT}}', prospectContext.trim() || 'Not provided')
    .replace('{{CALL_GOAL}}', callGoal.trim() || 'Book a follow-up call or close the deal')
    .replace('{{OBJECTION_LIBRARY}}', objectionLibrary.trim() || FALLBACK_OBJECTION_LIBRARY);

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-8).map((t) => ({
      role: t.role,
      content: t.content,
    })),
    {
      role: 'user',
      content: `New transcript: "${latestTranscript}"`,
    },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 80,
    system: systemPrompt,
    messages,
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text.trim() : 'HOLD';
}
