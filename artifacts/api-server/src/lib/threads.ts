const BASE = 'https://graph.threads.net/v1.0';

function getToken(): string {
  return process.env.THREADS_ACCESS_TOKEN || '';
}

function getUserId(): string {
  return process.env.THREADS_USER_ID || '';
}

export async function threadsFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  url.searchParams.set('access_token', getToken());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Threads API Error ${res.status}: ${JSON.stringify(error)}`);
  }
  return res.json();
}

export async function getAllThreads() {
  return threadsFetch(`/${getUserId()}/threads`, {
    fields: 'id,text,timestamp,permalink,media_type,shortcode,is_quote_post',
    limit: '50'
  });
}

export async function getThreadInsights(threadId: string) {
  return threadsFetch(`/${threadId}/insights`, {
    metric: 'views,likes,replies,reposts,quotes'
  });
}

export async function getThreadsProfile() {
  return threadsFetch(`/${getUserId()}/threads_profile`, {
    fields: 'id,username,name,threads_profile_picture_url,threads_biography'
  });
}

export async function publishThread(text: string) {
  const containerRes = await fetch(`${BASE}/${getUserId()}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      media_type: 'TEXT',
      text,
      access_token: getToken()
    })
  });
  const container = await containerRes.json();
  if (!container.id) throw new Error('Failed to create thread container');

  const publishRes = await fetch(`${BASE}/${getUserId()}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: container.id,
      access_token: getToken()
    })
  });
  return publishRes.json();
}

export async function replyToThread(threadId: string, text: string) {
  const containerRes = await fetch(`${BASE}/${getUserId()}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      media_type: 'TEXT',
      text,
      reply_to_id: threadId,
      access_token: getToken()
    })
  });
  const container = await containerRes.json();
  if (!container.id) throw new Error('Failed to create reply container');

  const publishRes = await fetch(`${BASE}/${getUserId()}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: container.id,
      access_token: getToken()
    })
  });
  return publishRes.json();
}

export async function searchThreads(query: string) {
  return threadsFetch(`/${getUserId()}/threads_keyword_search`, {
    q: query,
    fields: 'id,text,timestamp,username,permalink'
  });
}

export async function getThreadReplies(threadId: string) {
  return threadsFetch(`/${threadId}/replies`, {
    fields: 'id,text,timestamp,username,like_count'
  });
}

export async function getThreadConversation(threadId: string) {
  return threadsFetch(`/${threadId}/conversation`, {
    fields: 'id,text,timestamp,username'
  });
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
