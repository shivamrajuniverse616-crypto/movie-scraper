import { getStreams } from './src/scraper';

async function test() {
    console.log("Testing Movie tt1375666 (IMDB)...");
    const movie = await getStreams('tt1375666');
    console.log("Movie Output:", JSON.stringify(movie, null, 2));

    console.log("\nTesting Movie 27205 (TMDB Inception)...");
    const movieTmdb = await getStreams('27205', 'tmdb');
    console.log("Movie TMDB Output:", JSON.stringify(movieTmdb, null, 2));

    console.log("\nTesting TV 76479 S1 E1 (TMDB The Boys)...");
    const tv = await getStreams('76479', 'tmdb', 1, 1);
    console.log("TV Output:", JSON.stringify(tv, null, 2));
}

test();
