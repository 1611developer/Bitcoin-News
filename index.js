const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const app = express();

const PORT = 8000;
const urls = [
  'https://news.google.com/search?q=bitcoin',
  'https://www.bing.com/news/search?q=bitcoin',
  'https://news.search.yahoo.com/search?p=bitcoin'
];

app.get('/news', (req, res) => {
  // Map each URL to an axios GET call
  const requests = urls.map(url => axios.get(url));

  // Use Promise.all to fetch all URLs in parallel
  Promise.all(requests)
    .then(responses => {
      const articles = [];

      // Process each response
      responses.forEach(response => {
        const html = response.data;
        const $ = cheerio.load(html);

        $('article').each(function () {
          const relativeUrl = $(this).find('a').attr('href');
          let title = $(this).text() || 'No title';

          // Check if 'More' is in the title and process the title string accordingly
          const moreIndex = title.indexOf("More");
          if (moreIndex !== -1) {
            // Extract everything after 'More' (+4 to skip the length of the word 'More')
            title = title.substring(moreIndex + 4).trim();
          }

          if (relativeUrl) {
            const absoluteUrl = `https://news.google.com/${relativeUrl.substring(2)}`;
            articles.push({
              title,
              url: decodeURIComponent(absoluteUrl)
            });
          }
        });
      });

      res.json(articles);
    })
    .catch(err => {
      console.error('Error fetching news:', err);
      res.status(500).json({ error: 'Failed to fetch news' });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
