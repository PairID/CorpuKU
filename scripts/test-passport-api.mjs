import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const url = process.env.PASSPORT_API_URL;
  const key = process.env.PASSPORT_API_KEY;
  console.log('Testing connection to:', url);
  console.log('Key prefix:', key ? key.slice(0, 15) + '...' : 'none');

  // Test 1: User Profile
  try {
    const res = await fetch(`${url}/v1/public/auth/user-profile?nip=199408122020121002`, {
      headers: {
        'X-API-Key': key,
        'Content-Type': 'application/json'
      }
    });
    console.log('1. User Profile Status:', res.status);
    const data = await res.json();
    console.log('User Profile Data:', data);
  } catch (err) {
    console.error('User Profile Error:', err);
  }

  // Test 2: Passport Stats
  try {
    const res = await fetch(`${url}/v1/public/asn/199408122020121002/passport`, {
      headers: {
        'X-API-Key': key,
        'Content-Type': 'application/json'
      }
    });
    console.log('2. Passport Stats Status:', res.status);
    const data = await res.json();
    console.log('Passport Stats Data:', data);
  } catch (err) {
    console.error('Passport Stats Error:', err);
  }
}

main().catch(console.error);
