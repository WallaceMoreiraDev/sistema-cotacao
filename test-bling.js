const fetch = require('node-fetch'); // Ensure node-fetch or native fetch is available.

async function testAuth() {
  const clientId = '708c119e556b4fc5b834c291438c75005486d724';
  const clientSecret = '4561551d787d856096654b2fb0908ebb4862186d1a8de33d6b7be479688a';
  const code = '1d32ecc2b0bedda35fb21cec83fd42a032cc20e8';

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);

  try {
    const response = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Accept': '1.0'
      },
      body: params.toString()
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

testAuth();
