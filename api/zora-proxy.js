// Serverless function to proxy requests to Zora API
// This avoids CORS issues in production

const ZORA_API_ENDPOINT = 'https://api.zora.co/universal/graphql';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward the request to Zora API
    const response = await fetch(ZORA_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    // Get the response data
    const data = await response.json();

    // Return the response from Zora API
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying request to Zora API:', error);
    return res.status(500).json({ error: 'Failed to fetch data from Zora API' });
  }
}
