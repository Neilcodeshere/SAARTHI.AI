// Server-only AI configuration. Never import this from src/ — the key must not reach the browser bundle.

// Production model with strict json_schema support (verified against console.groq.com/docs/models
// and /docs/structured-outputs, Oct 2026). Override with GROQ_MODEL.
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

// Models Groq documents as supporting strict json_schema output. Others fall back to JSON-object mode.
export const STRICT_SCHEMA_MODELS = new Set(['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']);

const PLACEHOLDER = /^(|your[_-].*|changeme|replace[_-]?me|xxx+|<.*>)$/i;

export function readAiConfig(env = process.env) {
  const key = (env.GROQ_API_KEY || '').trim();
  const model = (env.GROQ_MODEL || '').trim() || DEFAULT_GROQ_MODEL;
  const timeoutMs = Number(env.GROQ_TIMEOUT_MS) > 0 ? Number(env.GROQ_TIMEOUT_MS) : 20000;
  let problem = null;
  if (PLACEHOLDER.test(key)) problem = 'GROQ_API_KEY is not set. Add it to .env on the server and restart the dev server.';
  else if (!key.startsWith('gsk_')) problem = 'GROQ_API_KEY does not look like a Groq key (expected prefix gsk_).';
  return { apiKey: problem ? null : key, model, timeoutMs, configured: !problem, problem };
}
