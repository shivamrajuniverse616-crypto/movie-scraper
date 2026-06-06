import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStreams } from '../src/scraper';

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

    const { imdb, s, e } = req.query;

    if (!imdb || typeof imdb !== 'string') {
        res.status(400).json({ error: 'Missing or invalid imdb parameter' });
        return;
    }

    const streams = await getStreams(
        imdb, 
        typeof s === 'string' ? s : undefined, 
        typeof e === 'string' ? e : undefined
    );

    if (!streams) {
        res.status(404).json({ error: 'Not found or failed to fetch streams' });
        return;
    }

    res.status(200).json(streams);
}
