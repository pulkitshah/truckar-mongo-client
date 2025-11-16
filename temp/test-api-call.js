require('dotenv').config({ path: '.env.local' });
const http = require('http');

async function testAPIEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/analytics/operational-health?account=66b4f0f82e1c56fe9c42e98b&startDate=2025-10-16T18:30:00.000Z&endDate=2025-11-16T18:29:59.999Z',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('=== API RESPONSE ===\n');
          console.log('Status Code:', res.statusCode);
          console.log('\nDocument Completion:');
          console.log(JSON.stringify(parsed.documentCompletion, null, 2));
          resolve();
        } catch (error) {
          console.error('Error parsing response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.end();
  });
}

testAPIEndpoint()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
