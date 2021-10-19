const express = require('express');
const cheerio = require('cheerio'); // JQuery under the hood
const axios = require('axios');

const urls = require('./urls');
const filterData = require('./filterData');
const telegram = require('./telegram');

const app = express();

axios(urls.urlAll)
    .then(response => {
        let allItems = [];
        const html = response.data;
        const $ = cheerio.load(html); // can now access all html elements via cheerio api

        $('.productListItem').each((index, element) => {

            let url = $(element).find('a').attr('href');
            let itemName = $(element).find('.itemTitle').text().trim().toLowerCase();
            let wasPrice = $(element).find('.was').text().substring(3).trim();
            let nowPrice = $(element).find('.now').text().substring(3).trim();
            let discount = $(element).find('.sav').text().trim().substring(5, 7);

            if (filterData.removeUnnecessaryItem(itemName)) return; // Don't like item, continue searching

            allItems.push({
                itemName,
                wasPrice,
                nowPrice,
                discount,
                url,
            });
        });

        filterData.sortByDiscount(allItems); // personal use, logging

        console.log(allItems);
        console.log('All items length: ', allItems.length);

        telegram.pingBot(allItems);


    }).catch(err => console.log(err));


const PORT = 8000;
app.listen(PORT, () => console.log(`listening on port: ${PORT}`));