const axios = require('axios');
const cheerio = require('cheerio');

const baseUrl = 'https://news.google.com/search?q=';

exports.handler = async function(event, context) {
    const topic = event.queryStringParameters.topic.toLowerCase();
    const url = `${baseUrl}${encodeURIComponent(topic)}`;

    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const articles = [];

        $('article').each(function() {
            let title = $(this).find('a').text() || 'No title';
            const relativeUrl = $(this).find('a').attr('href');
            const timeAgo = $(this).find('time').text().trim();

            if (title.toLowerCase().includes(topic)) {
                if (relativeUrl) {
                    const absoluteUrl = `https://news.google.com/${relativeUrl.substring(2)}`;
                    articles.push({
                        title,
                        url: decodeURIComponent(absoluteUrl),
                        published: timeAgo
                    });
                }
            }
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(articles)
        };
    } catch (error) {
        console.error('Error fetching news:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch news' })
        };
    }
};
