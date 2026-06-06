import { getStreams } from './src/scraper';

async function test() {
    console.log("Testing Movie tt1375666...");
    const movie = await getStreams('tt1375666');
    console.log("Movie Output:", JSON.stringify(movie, null, 2));

    console.log("\nTesting TV tt1190634 S1 E1...");
    const tv = await getStreams('tt1190634', 1, 1);
    console.log("TV Output:", JSON.stringify(tv, null, 2));
}

test();
