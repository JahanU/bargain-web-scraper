import Item from '../interfaces/Item';
// import mockData from './mock-data.json'; // Import the data 

const BASE_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : 'https://bargain-web-scraper-8bbn.onrender.com';

// Straight after a deploy the backend answers 503 + Retry-After while its first scrape finishes.
const MAX_RETRIES = 3;
const DEFAULT_RETRY_SECONDS = 10;
const MIN_RETRY_SECONDS = 1;
const MAX_RETRY_SECONDS = 60;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The server's Retry-After in ms (seconds form): the default when absent or odd, never below 1s. */
const retryAfterMs = (response: Response): number => {
    const header = response.headers.get("Retry-After")?.trim();
    const seconds = Number(header);
    const valid = !!header && Number.isFinite(seconds) && seconds >= 0 && seconds <= MAX_RETRY_SECONDS;
    return Math.max(valid ? seconds : DEFAULT_RETRY_SECONDS, MIN_RETRY_SECONDS) * 1000;
};

const getItemsService = async (wait: (ms: number) => Promise<unknown> = sleep): Promise<Item[]> => {
    const url = `${BASE_URL}/webscrape/getBestDeals`;
    let response = await fetch(url);

    // Still loading: wait as asked and try again, rather than showing the error page.
    for (let attempt = 0; response.status === 503 && attempt < MAX_RETRIES; attempt++) {
        await wait(retryAfterMs(response));
        response = await fetch(url);
    }

    return response.json();
};

// const getItemsService = async (): Promise<Item[]> => mockData;

export { getItemsService };
