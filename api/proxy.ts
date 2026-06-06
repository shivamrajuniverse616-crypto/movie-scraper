import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';
import http from 'http';

const REFERER = 'https://vidlink.pro/';
const ORIGIN  = 'https://vidlink.pro';
const UA      = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124';

function fetchUpstream(url: string, redirects = 0): Promise<any> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    (url.startsWith('https') ? https : http).get(url, {
      headers: { Referer: REFERER, Origin: ORIGIN, 'User-Agent': UA, Accept: '*/*' }
    }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location;
        return resolve(fetchUpstream(loc.startsWith('http') ? loc : new URL(loc, url).href, redirects + 1));
      }
      resolve(res);
    }).on('error', reject);
  });
}

function rewriteM3u8(body: string, url: string, req: VercelRequest) {
  const base = url.split('?')[0];
  const baseDir = base.substring(0, base.lastIndexOf('/') + 1);
  const origin = new URL(url).origin;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost:3000';
  return body.split('\n').map(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return line;
    const abs = t.startsWith('http') ? t : t.startsWith('/') ? origin + t : baseDir + t;
    return `${protocol}://${host}/api/proxy?url=` + encodeURIComponent(abs);
  }).join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const urlParam = req.query.url;
    if (!urlParam || typeof urlParam !== 'string') {
        return res.status(400).json({ error: "url is required" });
    }

    try {
        const decodedUrl = decodeURIComponent(urlParam);
        const upstream = await fetchUpstream(decodedUrl);
        
        const ct = (upstream.headers['content-type'] || '').toLowerCase();
        const isM3u8 = ct.includes('mpegurl') || ct.includes('m3u8') || /\.m3u8?(\?|$)/i.test(decodedUrl.split('?')[0]);

        if (isM3u8) {
            const chunks: Buffer[] = [];
            for await (const chunk of upstream) chunks.push(chunk);
            const body = Buffer.concat(chunks).toString('utf8');
            
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            return res.send(rewriteM3u8(body, decodedUrl, req));
        } else {
            res.setHeader('Content-Type', ct || 'application/octet-stream');
            if (upstream.headers['content-length']) {
                res.setHeader('Content-Length', upstream.headers['content-length']);
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.status(upstream.statusCode || 200);
            upstream.pipe(res);
        }
    } catch (err: any) {
        console.error("[PROXY ERROR]", err.message);
        res.status(502).json({ error: err.message });
    }
}
