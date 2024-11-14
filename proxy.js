import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 3000;

const BEARER_TOKEN = 'YOUR_TWITTER_BEARER_TOKEN';

const HF_API_URL = 'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment';
const HF_API_TOKEN = 'YOUR_HF_API_TOKEN';

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.get('/tweets', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
            headers: {
                Authorization: `Bearer ${BEARER_TOKEN}`
            },
            params: {
                query: query,
                'tweet.fields': 'text,author_id',
                max_results: 10
            }
        });

        res.json(response.data);
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            res.status(status).json(data);
        } else {
            console.error('Error fetching tweets:', error.message);
            res.status(500).json({ error: 'An error occurred while fetching tweets' });
        }
    }
});

app.use(express.json());

app.post('/sentiment', async (req, res) => {
    const text = req.body.text;

    if (!text) {
        return res.status(400).json({ error: 'Text input is required for sentiment analysis' });
    }

    try {
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${HF_API_TOKEN}`,
            },
            body: JSON.stringify({ inputs: text }),
        });

        const data = await response.json();
        console.log('Hugging Face API Response:', data);

        // Validate response structure
        if (!data || !data[0] || !Array.isArray(data[0])) {
            return res.status(500).json({ error: 'Unexpected response from sentiment API' });
        }

        // Extract the highest score label
        const topResult = data[0].reduce((prev, current) =>
            prev.score > current.score ? prev : current
        );

        // Map labels to sentiments
        const labelMap = {
            LABEL_0: 'Negative',
            LABEL_1: 'Neutral',
            LABEL_2: 'Positive',
        };

        res.json({
            sentiment: labelMap[topResult.label] || 'Unknown',
            confidence: topResult.score,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to analyze sentiment' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
