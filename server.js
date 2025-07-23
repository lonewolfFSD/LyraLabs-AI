import express from 'express';
import fetch from 'node-fetch';

const app = express();

app.get('/proxy-image', async (req, res) => {
  const { url, filename } = req.query;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
    const buffer = await response.buffer();
    res.set('Content-Type', response.headers.get('content-type') || 'image/png');
    res.set('Content-Disposition', `attachment; filename="${filename || 'image.png'}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send(`Failed to fetch image: ${err.message}`);
  }
});

app.listen(3001, () => console.log('Proxy running on port 3001'));