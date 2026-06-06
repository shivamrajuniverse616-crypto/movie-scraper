import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import sodium from 'libsodium-wrappers';

const STREAM_API_URL = "https://streamdata.vaplayer.ru/api.php";
const HEADERS = {
    'Referer': 'https://nextgencloudfabric.com/',
    'Origin': 'https://nextgencloudfabric.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

export interface StreamData {
    title: string;
    imdb_id: string;
    season?: string;
    episode?: string;
    file_name: string;
    backdrop: string;
    stream_urls: string[];
}

export interface ApiResponse {
    status_code: string | number;
    data?: StreamData;
    default_subs?: any[];
    thumbnails_url?: string;
}

/**
 * Fetch streams from VaPlayer.
 */
export async function getVaPlayerStream(id: string, idType: 'imdb' | 'tmdb' = 'imdb', season?: string | number, episode?: string | number): Promise<StreamData | null> {
    try {
        const type = (season && episode) ? 'tv' : 'movie';
        const params: Record<string, any> = { type };
        
        if (idType === 'tmdb') { params.tmdb = id; } 
        else { params.imdb = id; }
        
        if (type === 'tv') { params.season = season; params.episode = episode; }

        const response = await axios.get<ApiResponse>(STREAM_API_URL, { params, headers: HEADERS });
        const resData = response.data;
        if (resData && (resData.status_code === '200' || resData.status_code === 200) && resData.data) {
            return resData.data;
        }
        return null;
    } catch (error) {
        console.error("Error fetching VaPlayer stream:", error);
        return null;
    }
}

// ── WASM singleton for VidLink ──────────────────────────────────────────────────
let wasmReady = false;
let bootPromise: Promise<void> | null = null;

export function bootWasm(): Promise<void> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    try {
      (globalThis as any).window = globalThis;
      (globalThis as any).self = globalThis;
      (globalThis as any).document = { createElement: () => ({}), body: { appendChild: () => {} } };

      await sodium.ready;
      (globalThis as any).sodium = sodium;

      const apiDir = path.join(process.cwd(), 'api');
      const scriptCode = fs.readFileSync(path.join(apiDir, 'script.js'), 'utf8');
      
      // Evaluate Go WASM wrapper
      eval(scriptCode);

      const go = new (globalThis as any).Dm();
      const wasmBuf = fs.readFileSync(path.join(apiDir, 'fu.wasm'));
      const { instance } = await WebAssembly.instantiate(wasmBuf, go.importObject);
      go.run(instance);

      await new Promise(r => setTimeout(r, 500));
      if (typeof (globalThis as any).getAdv !== 'function') throw new Error('getAdv not found after WASM boot');
      wasmReady = true;
      console.log("VidLink WASM Booted successfully.");
    } catch(err) {
      console.error("Failed to boot Vidlink WASM:", err);
      throw err;
    }
  })();
  return bootPromise;
}

/**
 * Fetch streams from VidLink.
 */
export async function getVidLinkStream(id: string, idType: 'imdb' | 'tmdb' = 'imdb', season?: string | number, episode?: string | number): Promise<{playlist: string, captions: any[]} | null> {
    try {
        await bootWasm();
        const token = (globalThis as any).getAdv(String(id));
        if (!token) throw new Error('getAdv returned null');

        const isTv = (season && episode);
        const apiUrl = isTv
            ? `https://vidlink.pro/api/b/tv/${token}/${season}/${episode}?multiLang=1`
            : `https://vidlink.pro/api/b/movie/${token}?multiLang=1`;

        const response = await axios.get(apiUrl, {
            headers: { 
                'Referer': 'https://vidlink.pro/', 
                'Origin': 'https://vidlink.pro', 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124' 
            }
        });
        
        const data = response.data;
        const playlist = data?.stream?.playlist;
        if (!playlist) return null;
        
        return { 
            playlist, 
            captions: data?.stream?.captions || data?.stream?.subtitles || [] 
        };
    } catch (error: any) {
        console.error("Error fetching VidLink stream:", error.message);
        return null;
    }
}
