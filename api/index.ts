import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getVaPlayerStream, getVidLinkStream } from '../src/scraper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { imdb, tmdb, s, e } = req.query;

    if (!imdb && !tmdb) {
        res.status(400).json({ error: 'Missing imdb or tmdb parameter' });
        return;
    }

    let id = '';
    let idType: 'imdb' | 'tmdb' = 'imdb';

    if (tmdb && typeof tmdb === 'string') {
        id = tmdb;
        idType = 'tmdb';
    } else if (imdb && typeof imdb === 'string') {
        id = imdb;
        idType = 'imdb';
    }

    const sStr = typeof s === 'string' ? s : undefined;
    const eStr = typeof e === 'string' ? e : undefined;

    // Fetch from all sources concurrently
    const [vaPlayerResult, vidLinkResult] = await Promise.allSettled([
        getVaPlayerStream(id, idType, sStr, eStr),
        getVidLinkStream(id, idType, sStr, eStr)
    ]);

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'movie-scraper.vercel.app';
    const baseUrl = `${protocol}://${host}`;

    const streams = [];
    let captions: any[] = [];

    // Process VidLink (Priority 1)
    if (vidLinkResult.status === 'fulfilled' && vidLinkResult.value) {
        const proxiedStreamUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(vidLinkResult.value.playlist)}`;
        streams.push({
            name: "VidLink (Multi-Lang)",
            url: proxiedStreamUrl
        });
        if (vidLinkResult.value.captions && vidLinkResult.value.captions.length > 0) {
            captions = [...vidLinkResult.value.captions];
        }
    }

    // Process VaPlayer (Priority 2)
    if (vaPlayerResult.status === 'fulfilled' && vaPlayerResult.value) {
        if (vaPlayerResult.value.stream_urls && vaPlayerResult.value.stream_urls.length > 0) {
            const rawVaPlayerUrl = vaPlayerResult.value.stream_urls[0];
            const proxiedVaPlayerUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(rawVaPlayerUrl)}`;
            streams.push({
                name: "VaPlayer (Fast)",
                url: proxiedVaPlayerUrl
            });
        }
    }

    if (streams.length === 0) {
        res.status(404).json({ error: 'Not found or failed to fetch streams' });
        return;
    }

    res.status(200).json({
        success: true,
        streams: streams,
        captions: captions
    });
}
