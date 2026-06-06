import axios from 'axios';

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
 * Fetch streams for a movie or TV show.
 * @param imdb IMDB ID (e.g. tt1375666)
 * @param season Season number (optional, only for TV)
 * @param episode Episode number (optional, only for TV)
 */
export async function getStreams(imdb: string, season?: string | number, episode?: string | number): Promise<StreamData | null> {
    try {
        const type = (season && episode) ? 'tv' : 'movie';
        const params: Record<string, any> = {
            imdb,
            type
        };
        
        if (type === 'tv') {
            params.season = season;
            params.episode = episode;
        }

        const response = await axios.get<ApiResponse>(STREAM_API_URL, {
            params,
            headers: HEADERS
        });

        const resData = response.data;
        // Check if response is successful (string '200' or number 200)
        if (resData && (resData.status_code === '200' || resData.status_code === 200) && resData.data) {
            return resData.data;
        }
        
        return null;
    } catch (error) {
        console.error("Error fetching stream data:", error);
        return null;
    }
}
