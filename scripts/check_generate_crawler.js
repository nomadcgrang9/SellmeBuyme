import fetch from 'node-fetch';

async function main() {
  try {
    const response = await fetch('http://localhost:5173/api/generate-crawler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId: 'test',
        boardName: 'Test Board',
        boardUrl: 'https://example.com',
        adminUserId: 'admin',
      }),
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Body:', text);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

main();
