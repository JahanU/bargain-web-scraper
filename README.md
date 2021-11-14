# Bargain Web Scraper
Express Node.js application to find highly discounted JD sale items and notify me.

## Overview
Bargain Web Scraper is a Node.js application that polls the JD website every 45 seconds, checking items that meet my criteria, with a subsequent asynchronous call to check if that item is in stock and the available sizes.

Node server (hosted locally) pings the Telegram Bot API with item description and link to view.

## Features
- Regex
- Web Scraping via Cheerio library
- Asynchronous Programming (via Axios)
- Telegram API Bot

## Example
<img width="405" alt="Name jordan all over print vest" src="https://user-images.githubusercontent.com/34219176/141662160-fca1f9b2-bff4-4f0e-a009-9ba65296ddcd.png">

## Installation
```bash
npm install
npm start
```
