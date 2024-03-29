# Bargain Web Scraper 

#### Try it out:  
🕊 https://t.me/JD_sales_bot <br> 👕 https://bargain-scraper.netlify.app/

## Overview 🤔
- Full-stack application to find discounted clothing items, with subsequent optimised HTTP calls to check whether they are truly in stock and get their sizes, display them to a clean minimal React Web App
- Developed Telegram API Bot that handles user sign up, FAQ queries and sends live updates of when new items are found
- ```Express, Node.js, Firebase, React.js```


## Features 🚀
### Frontend
- [React Web App](https://bargain-scraper.netlify.app/)
- Redux
- Tailwind CSS
- Filtering, Sorting, Search, Toggling
- React Router (Search Params)

### Backend
- Firebase/Firestore (Store Users)
- Performed Typescript migration
- Telegram API Bot (User Sign-up, FAQ queries, Live Updates)
- Software design patterns followed (MVC, DRY, High Cohesion, Low Coupling etc)
- Web Scraping via Cheerio library
- Asynchronous Programming (Promises, Promise.all)
- Regex

### Tech 💻
- Frontend hosted on Netlify 
- Backend hosted on Heroku with New Relic APM (Application Performance Monitoring) addon
- CI/CD (Quick automatic deployments from master branch)
- Google Analytics

### Design
#### Basic 
![Web-Scraper-System-Design drawio](https://user-images.githubusercontent.com/34219176/177620459-f9cdb093-a84c-476b-ba8c-939084a710bc.png)

#### intermediate
![web-scraper-syste-design-intermediate drawio](https://user-images.githubusercontent.com/34219176/177883186-abcd6a7d-3a0c-40f3-afc7-3d0ff507949a.png)


## Example
### Telegram
<p>
<img width="405" alt="Telegram Bot example" src="https://user-images.githubusercontent.com/34219176/150880209-067e370c-8045-457b-a3ac-3980242cc4db.jpg">
</p>

## Installation
```bash
cd frontend
npm install
npm start

cd backend
npm install
npm start
```
- (Need your own Telegram & Firebase API Key; Or comment those files out from the index.ts as they are not required for solo development)
