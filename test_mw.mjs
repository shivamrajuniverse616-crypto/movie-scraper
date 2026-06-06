import { makeProviders, makeStandardFetcher } from '@movie-web/providers';
import fetch from 'cross-fetch';

const providers = makeProviders({
    fetcher: makeStandardFetcher(fetch),
});

async function testMW() {
    try {
        console.log("Starting scrape...");
        const media = {
            type: 'movie',
            title: 'The Boys', // doesn't matter much for tmdb
            releaseYear: 2019,
            tmdbId: '76479', // Actually The Boys is a TV show, let's use a movie TMDB
        };
        // Let's use Inception (tmdb: 27205)
        const mediaMovie = {
            type: 'movie',
            title: 'Inception',
            releaseYear: 2010,
            tmdbId: '27205',
        };

        const result = await providers.runAll({
            media: mediaMovie,
            sourceOrder: ['vidsrc', 'flixhq', 'superstream', 'showbox']
        });

        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

testMW();
