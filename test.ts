import { getVaPlayerStream, getVidLinkStream } from './src/scraper';

async function test() {
    console.log("Testing Movie tt1375666 (IMDB) with VaPlayer...");
    const movie = await getVaPlayerStream('tt1375666');
    console.log("VaPlayer Output:", movie ? "Success" : "Failed");

    console.log("\nTesting Spider-Noir 220102 S1 E1 (TMDB) with VidLink...");
    const show = await getVidLinkStream('220102', 'tmdb', 1, 1);
    console.log("VidLink Output:", show ? show.playlist : "Failed");
}

test();
