import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { auth } from "@/lib/auth";
import { aiRequestSchema } from "@/lib/validations";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });

const PROMPTS = {
  summarize: (content: string) =>
    `You are a document assistant. Summarize the following document content concisely in 3-5 bullet points. Focus on key ideas and decisions.\n\nDocument:\n${content}`,

  grammar: (content: string) =>
    `You are a grammar and writing assistant. Fix all grammar, spelling, and punctuation errors in the following text. Return ONLY the corrected text, nothing else.\n\nText:\n${content}`,

  expand: (content: string) =>
    `You are a writing assistant. Expand and elaborate on the following content with more detail, examples, and context while maintaining the same tone and style. Keep it professional.\n\nContent:\n${content}`,

  tone: (content: string, tone?: string) =>
    `Rewrite the following content in a ${tone ?? "professional"} tone. Maintain all the core information but adjust the language and style accordingly.\n\nContent:\n${content}`,
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const parsed = aiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
    });
  }

  const { content, action, tone } = parsed.data;
  const prompt =
    action === "tone" ? PROMPTS.tone(content, tone) : PROMPTS[action](content);

  const result = await streamText({
    model: groq("llama-3.3-70b-versatile"),
    prompt,
    maxOutputTokens: 2000,
  });

  return result.toTextStreamResponse();
}
