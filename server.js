const express = require('express');
const axios = require('axios');
const ping = require('ping');
const blakejs = require('blakejs');
const path = require('path');

const app = express();
const port = 3000;

// Serve result.html, index.html, and result.css from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve result.js as a separate route
app.get('/result.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'result.js'));
});

let poolInfoData; // Variable to store the fetched pool_info data
let dynamicPoolId; // Variable to store the dynamic pool ID

// Function to fetch pool_info data
const fetchPoolInfo = async () => {
  try {
    const response = await axios.post(
      'https://api.koios.rest/api/v0/pool_info',
      {
        _pool_bech32_ids: [dynamicPoolId] // Use the dynamic pool ID
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    poolInfoData = response.data;
  } catch (error) {
    console.error('An error occurred while fetching pool_info:', error);
  }
};

// Fetch pool_info data on server startup
fetchPoolInfo();

// API endpoint for fetching pool_info
app.get('/api/pool_info', (req, res) => {
  res.json(poolInfoData);
});

// API endpoint for updating the dynamic pool ID
app.post('/updatePoolId', express.json(), (req, res) => {
  const { poolId } = req.body;
  dynamicPoolId = poolId;
  fetchPoolInfo(); // Fetch updated pool_info data
  res.sendStatus(200);
});

// API endpoint for calculating and sending the hash
app.get('/api/calculate_hash', async (req, res) => {
  try {
    if (!poolInfoData) {
      throw new Error('Pool info data is not available');
    }

    const { meta_url, meta_hash } = poolInfoData[0];

    const response = await axios.get(meta_url, {
      responseType: 'arraybuffer'
    });

    const buffer = Buffer.from(response.data);
    const hash = blakejs.blake2bHex(buffer, null, 32);

    const result = {
      metaUrl: meta_url,
      metaHash: meta_hash,
      calculatedHash: hash,
      isValid: hash === meta_hash
    };

    res.json(result);
  } catch (error) {
    console.error('An error occurred while calculating the hash:', error);
    res.status(500).json({ error: 'An error occurred while calculating the hash' });
  }
});

// API endpoint for ping request
app.get('/api/ping', async (req, res) => {
  const host = req.query.host;
  const port = req.query.port;

  ping.promise.probe(host, { port: port })
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      res.status(500).json({ error: 'An error occurred during the ping' });
    });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
