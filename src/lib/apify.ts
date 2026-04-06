export async function transcribeReel(reelUrl: string): Promise<{ transcript: string; language: string } | null> {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_TOKEN) return null;

  try {
    const response = await fetch(
      'https://api.apify.com/v2/acts/bulletproof~instagram-transcript-extractor/run-sync-get-dataset-items?token=' + APIFY_TOKEN,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [reelUrl],
          format: 'json',
          includeMetadata: false
        })
      }
    );

    if (!response.ok) {
      console.error('Apify transcription failed:', response.status, await response.text());
      return null;
    }

    const results = await response.json();
    if (results && results.length > 0) {
      const item = results[0];
      const transcript = item.fullText || item.text ||
        (item.segments ? item.segments.map((s: any) => s.text).join(' ') : '');
      return {
        transcript: transcript.trim(),
        language: item.language || 'es'
      };
    }
    return null;
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}
