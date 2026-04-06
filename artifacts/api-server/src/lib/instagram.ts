const BASE = 'https://graph.facebook.com/v21.0';

function getToken(): string {
  return process.env.INSTAGRAM_ACCESS_TOKEN || '';
}

function getIgId(): string {
  return process.env.INSTAGRAM_ACCOUNT_ID || '';
}

export async function igFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  url.searchParams.set('access_token', getToken());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());

  const appUsage = res.headers.get('x-app-usage');
  if (appUsage) {
    try {
      const usage = JSON.parse(appUsage);
      if (usage.call_count > 85 || usage.total_cputime > 85 || usage.total_time > 85) {
        console.warn('Instagram API rate limit approaching:', usage);
        const data = await res.json();
        data._rateLimitWarning = true;
        return data;
      }
    } catch (_e) {}
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`IG API Error ${res.status}: ${JSON.stringify(error)}`);
  }
  return res.json();
}

export async function getAllMedia() {
  let allMedia: any[] = [];
  const params: Record<string, string> = {
    fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
    limit: '50'
  };

  let endpoint = `/${getIgId()}/media`;
  while (true) {
    const data = await igFetch(endpoint, params);
    allMedia = allMedia.concat(data.data || []);
    if (!data.paging?.cursors?.after) break;
    params.after = data.paging.cursors.after;
  }
  return allMedia;
}

export async function getMediaInsights(mediaId: string) {
  try {
    return await igFetch(`/${mediaId}/insights`, {
      metric: 'views,reach,saved,shares,likes,comments,ig_reels_avg_watch_time,clips_replays_count'
    });
  } catch (e) {
    console.warn(`Could not get full insights for ${mediaId}:`, e);
    return { data: [] };
  }
}

export async function getAccountInsights(period: string = 'day', since?: number, until?: number) {
  const params: Record<string, string> = {
    metric: 'reach,accounts_engaged,profile_views,follows_and_unfollows',
    period
  };
  if (since) params.since = since.toString();
  if (until) params.until = until.toString();
  return igFetch(`/${getIgId()}/insights`, params);
}

export async function getAccountProfile() {
  return igFetch(`/${getIgId()}`, {
    fields: 'id,username,name,biography,followers_count,follows_count,media_count'
  });
}

export async function getCompetitorData(username: string) {
  const cleaned = username.replace('@', '');
  return igFetch(`/${getIgId()}`, {
    fields: `business_discovery.username(${cleaned}){username,name,biography,followers_count,media_count,media.limit(30){id,caption,media_type,timestamp,like_count,comments_count,permalink}}`
  });
}

export async function getMediaComments(mediaId: string) {
  return igFetch(`/${mediaId}/comments`, {
    fields: 'id,text,timestamp,username,like_count',
    limit: '50'
  });
}

export async function replyToComment(commentId: string, message: string) {
  const url = `${BASE}/${commentId}/replies`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: getToken() })
  });
  return res.json();
}

export async function getConversations() {
  return igFetch(`/${getIgId()}/conversations`, {
    fields: 'id,participants,updated_time',
    platform: 'instagram'
  });
}

export async function getMessages(conversationId: string) {
  return igFetch(`/${conversationId}/messages`, {
    fields: 'id,message,from,created_time'
  });
}

export async function getOnlineFollowers() {
  return igFetch(`/${getIgId()}/insights`, {
    metric: 'online_followers',
    period: 'lifetime'
  });
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
