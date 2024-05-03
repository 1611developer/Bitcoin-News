const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const app = express();

const PORT = 8000;
const GOOGLE_NEWS_URL = 'https://news.google.com/search?q=bitcoin';

app.get('/news', (req, res) => {
  axios.get(GOOGLE_NEWS_URL)
    .then(response => {
      const html = response.data;
      const $ = cheerio.load(html);
      const articles = [];

      $('article').each(function () {
        const relativeUrl = $(this).find('a').attr('href');
        if (relativeUrl) {
          // Google News article links are typically prefixed with './'
          const absoluteUrl = `https://news.google.com/${relativeUrl.substring(2)}`;
          const title = $(this).text() || 'No title';

          articles.push({
            title,
            url: decodeURIComponent(absoluteUrl)
          });
        }
      });

      res.json(articles);
    }).catch(err => {
      console.error('Error fetching news:', err);
      res.status(500).json({ error: 'Failed to fetch news' });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
