// Browser client for the server-side AI suitability endpoint. Holds no credentials:
// the Groq key lives only on the server. Failures resolve to { error } so the
// deterministic workflow never depends on this call.

async function call(url, init) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { error: { code: 'OFFLINE', message: 'Browser is offline.' } };
  }
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => null);
    if (!res.ok) return { error: body?.error || { code: `HTTP_${res.status}`, message: 'AI service returned an error.' } };
    return { data: body };
  } catch {
    return { error: { code: 'UNREACHABLE', message: 'AI service is not reachable (the static build has no API server).' } };
  }
}

export const getAiStatus = () => call('/api/ai/status');

/** Sends the current central state; the server re-derives everything it gives the model. */
export const requestPredictions = (central, conflictId, force = false) => call(`/api/conflicts/${encodeURIComponent(conflictId)}/predictions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ central, force }),
});
