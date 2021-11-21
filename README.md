# Bargain Web Scraper

### Try it out: 
@JD_sales_bot

Express Node.js application to find highly discounted JD sale items and notify me via a Telegram Bot.

## Overview
Bargain Web Scraper is a Node.js application that polls the JD website every 45 seconds, checking items that meet my criteria, with a subsequent asynchronous call to check if that item is in stock and the available sizes.

Node server (hosted locally) pings the Telegram Bot API with item description and link to view.

## Features
- Regex
- Web Scraping via Cheerio library
- Asynchronous Programming (via Axios)
- Telegram API Bot

## Example
<p>
<img width="405" alt="Name jordan all over print vest" src="https://user-images.githubusercontent.com/34219176/141662160-fca1f9b2-bff4-4f0e-a009-9ba65296ddcd.png">
<img width="375" alt="Name columbia cascades long sleeve t-shirt" src="https://user-images.githubusercontent.com/34219176/141678795-08158b16-f61d-4465-b787-d86cc681381d.png">
</p>

## Installation
```bash
npm install
npm start
```
