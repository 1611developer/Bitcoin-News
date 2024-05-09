// Import the axios library for making HTTP requests.
const axios = require('axios');

// Import the cheerio library for parsing HTML.
const cheerio = require('cheerio');

// Import the express library for building web applications.
const express = require('express');

// Create an instance of the express application.
const app = express();

// Define the port number for the server to listen on.
const PORT = 8000;

// Define the base URL for the news search.
const baseUrl = 'https://news.google.com/search?q=';

app.get('/news/:topic', (req, res) => {

  // Get the requested topic from the URL parameter and convert it to lowercase.
  const topic = req.params.topic.toLowerCase();

  // Construct URL based on requested topic.
  const urls = [

    // Create the URL by appending the encoded topic to the base URL.
    `${baseUrl}${encodeURIComponent(topic)}`
  ];

  // Map each URL to an axios GET call.
  // Create an array of axios GET requests for each URL.
  const requests = urls.map(url => axios.get(url));

  // Use Promise.all to fetch all URLs in parallel.
  Promise.all(requests)

    // Handle the responses from all the requests
    .then(responses => {

      // Initialize an empty array to store the articles.
      const articles = [];

      // Process each response.
      responses.forEach(response => {

        // Extract the HTML content from the response.
        const html = response.data;

        // Load the HTML into cheerio for easier manipulation
        const $ = cheerio.load(html);

        // Define the selector for the articles
        const selector = 'article';

        // Define the selector for the published time
        const timeSelector = 'time';

        // Iterate over each article
        $(selector).each(function () {

          // Get the relative URL of the article
          const relativeUrl = $(this).find('a').attr('href');

          // Get the title of the article or set a default value if no title is found
          let title = $(this).find('a').text() || 'No title';

          // Initialize the published time variable.
          let published = '';

          // Check if 'More' is in the title and process the title string accordingly.
          const moreIndex = title.indexOf("More");

          // Remove the 'More' keyword from the title.
          if (moreIndex !== -1) {
            title = title.substring(moreIndex + 4).trim();
          }

          // Check if the title contains the chosen topic.
          if (title.toLowerCase().includes(topic)) {
            if (timeSelector) {

              // Get the published time string.
              const timeAgo = $(this).find(timeSelector).text().trim();

              // Match the hours ago pattern.
              const hoursAgoMatch = timeAgo.match(/\d+\s*hour(s)?\s+ago/i);

              if (hoursAgoMatch) {

                // Set the published time if the pattern matches.
                published = hoursAgoMatch[0];
              }
            }

            if (relativeUrl) {
              const absoluteUrl = `https://news.google.com/${relativeUrl.substring(2)}`; // Construct the absolute URL of the article
             // Add the article to the articles array.
              articles.push({
                title,
                url: decodeURIComponent(absoluteUrl),
                published
              });
            }
          }
        });
      });

      // Filter articles newer than 23 hours and 59 minutes
      const currentTime = Date.now();
      const twentyThreeHoursFiftyNineMinutesAgo = currentTime - 23 * 60 * 60 * 1000 - 59 * 60 * 1000;
      const filteredArticles = articles.filter(article => {
        // Parse the published time of the article.
        const time = parsePublishedTime(article.published);
        
        // Filter articles published within the specified time range.
        return time >= twentyThreeHoursFiftyNineMinutesAgo;
      });

      // Sort filtered articles by published time (newest to oldest)
      filteredArticles.sort((a, b) => {

        // Parse the published time of article A.
        const timeA = parsePublishedTime(a.published);

        // Parse the published time of article B.
        const timeB = parsePublishedTime(b.published);

        // Compare the published times for sorting.
        return timeB - timeA;
      });

      // Send the filtered articles as a JSON response.
      res.json(filteredArticles);
    })
    .catch(err => {

      // Log an error message of there's an error fetching news.
      console.error('Error fetching news:', err);
      
      // Send an error response to the client.
      res.status(500).json({ error: 'Failed to fetch news' });
    });
});

function parsePublishedTime(published) {

  // Match the hours ago pattern in the published time.
  // If the pattern matches, extract the number of hours ago.
  const hoursAgoMatch = published.match(/(\d+)\s*hour(s)?\s+ago/i);

  if (hoursAgoMatch) {

    // Extract the number of hours from the match.
    const hours = parseInt(hoursAgoMatch[1]);

    // Get the current time.
    const currentTime = Date.now();

    // Collect the timestamp for 24 hours ago.
    const twentyFourHoursAgo = currentTime - 24 * 60 * 60 * 1000;

    // Calculate the timestamp for 23 hours and 59 minutes ago.
    const twentyThreeHoursFiftyNineMinutesAgo = currentTime - 23 * 60 * 60 * 1000 - 59 * 60 * 1000;
    // If the article was published more than 24 hours ago, return the current date.
    if (twentyThreeHoursFiftyNineMinutesAgo <= twentyFourHoursAgo) {
      return new Date(currentTime).toLocaleDateString();
    }

    // Calculate the timestamp for the published time based on the number of hours ago.
    return currentTime - hours * 60 * 60 * 1000;
  }

  // Return 0 if the published time doesn't match the expected pattern.
  return 0;
}

// Start the server and listen on the specified port.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
