const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const app = express();

const PORT = 8000;
const baseUrl = 'https://news.google.com/search?q=';

app.get('/news/:crypto', (req, res) => {
  const crypto = req.params.crypto.toLowerCase();

  // Construct URL based on requested cryptocurrency
  const urls = [
    `${baseUrl}${encodeURIComponent(crypto)}`
  ];

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
        const selector = 'article';
        const timeSelector = 'time';

        $(selector).each(function () {
          const relativeUrl = $(this).find('a').attr('href');
          let title = $(this).find('a').text() || 'No title';
          let published = '';

          // Check if 'More' is in the title and process the title string accordingly
          const moreIndex = title.indexOf("More");
          if (moreIndex !== -1) {
            title = title.substring(moreIndex + 4).trim();
          }

          // Check if the title contains the chosen cryptocurrency
          if (title.toLowerCase().includes(crypto)) {
            if (timeSelector) {
              const timeAgo = $(this).find(timeSelector).text().trim();
              const hoursAgoMatch = timeAgo.match(/\d+\s*hour(s)?\s+ago/i);
              if (hoursAgoMatch) {
                published = hoursAgoMatch[0];
              }
            }

            if (relativeUrl) {
              const absoluteUrl = `https://news.google.com/${relativeUrl.substring(2)}`;
              articles.push({
                title,
                url: decodeURIComponent(absoluteUrl),
                published
              });
            }
          }
        });
      });

      // Filter articles older than 24 hours
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const filteredArticles = articles.filter(article => {
        const time = parsePublishedTime(article.published);
        return time >= twentyFourHoursAgo;
      });

      // Sort filtered articles by published time (newest to oldest)
      filteredArticles.sort((a, b) => {
        const timeA = parsePublishedTime(a.published);
        const timeB = parsePublishedTime(b.published);
        return timeB - timeA;
      });

      res.json(filteredArticles);
    })
    .catch(err => {
      console.error('Error fetching news:', err);
      res.status(500).json({ error: 'Failed to fetch news' });
    });
});

function parsePublishedTime(published) {
  const hoursAgoMatch = published.match(/(\d+)\s*hour(s)?\s+ago/i);
  if (hoursAgoMatch) {
    const hours = parseInt(hoursAgoMatch[1]);
    return Date.now() - hours * 60 * 60 * 1000;
  }
  return 0;
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));