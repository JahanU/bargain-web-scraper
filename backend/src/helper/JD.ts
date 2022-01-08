import cheerio from 'cheerio';
const axios = require('axios');
const filterData = require('./filterData');

import { Item } from "../interfaces/Item";

function getJDItems(discountLimit: number): Promise<Item[]> {
    const JD = 'https://www.jdsports.co.uk';

    // JD_ALL_MEN, SHOES 
    const urls = [
        'https://www.jdsports.co.uk/men/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,tommy-hilfiger,calvin-klein-underwear,levis,columbia,jordan,emporio-armani-ea7,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics/sale/?sort=price-low-high&max=200',
        'https://www.jdsports.co.uk/men/mens-footwear/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,vans,tommy-hilfiger,calvin-klein-underwear,levis,columbia,reebok,jordan,fila,emporio-armani-ea7,puma,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics,converse/sale/?max=100&sort=price-low-high&max=200'
    ];

    return new Promise<Item[]>((resolve, reject) => {
        urls.forEach((url) => {
            axios.get(url).then((response: cheerio.Element) => {
                const items: Item[] = [];
                const html: cheerio.Element['data'] = response.data!;
                const $ = cheerio.load(html); // can now access all html elements via cheerio api

                $('.productListItem').each((index, element) => {

                    let discount = parseInt($(element).find('.sav').text().trim().substring(5, 7)); // Just get the tenth column number
                    if (discount < discountLimit) return; // don't care about items with less than 50% discount

                    const name = $(element).find('.itemTitle').text().trim().toLowerCase();
                    if (filterData(name)) return; // Don't like item, continue searching

                    const url = JD + $(element).find('a').attr('href');
                    const imageUrl = $(element).find('source').attr('data-srcset')?.split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                    const wasPrice = $(element).find('.was').text().substring(3).trim();
                    const nowPrice = $(element).find('.now').text().substring(3).trim();

                    items.push({ name, wasPrice, nowPrice, discount, url, imageUrl });
                });
                if (!items.length) console.error('No items found from JD');
                return items;
            }).then(async (items: Item[]) => {
                const detailedItems = await getStockAndSize(items);
                if (!detailedItems) console.error('Nothing in stock');
                return resolve(detailedItems);
            }).catch((err: Error) => {
                console.error(err);
                return reject(err);
            });
        });
    });
}

async function getStockAndSize(items: Item[]): Promise<Item[]> { // get size and if in stock, remove those not in stock

    return new Promise<Item[]>((resolve, reject) => {
        Promise.all(
            items.map(async (item) => {
                const html = await axios.get(item.url);
                const $ = cheerio.load(html.data!);

                // get stock
                const metaTag = $('meta')[28] as cheerio.TagElement;
                const inStock = metaTag.attribs.content;
                if (inStock === 'OUT OF STOCK') return;

                // get sizes
                const scriptTag = $('script')[3] as cheerio.TagElement;
                const objectStr = scriptTag.children[0].data!;
                const regex = /name:("\w+")/g;
                const sizes = [...objectStr.matchAll(regex)].map((i) => i[1].substring(1, i[1].length - 1));
                if (!sizes.length) return;

                return { ...item, sizes, inStock };
            })
        ).then((items) => {
            return resolve(items.filter((item) => item !== undefined));
        }).catch((err) => {
            console.error(err);
            return reject(err);
        });
    });
}

export default getJDItems;