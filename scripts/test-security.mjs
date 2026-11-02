// Automated Security & Functional Test Suite for CineSnap /api/send-email

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Valid 1x1 transparent PNG Base64
const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function runTests() {
  console.log('=== Running CineSnap Automated Security Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  async function testCase(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // Test 1: Invalid Email Format
  await testCase('Reject invalid email format', async () => {
    const res = await fetch(`${BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        imageBase64: validPngBase64,
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Test 2: Invalid Image Header (Non-PNG)
  await testCase('Reject non-PNG image data', async () => {
    const fakeData = 'data:image/png;base64,' + Buffer.from('NOT_A_PNG_FILE').toString('base64');
    const res = await fetch(`${BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        imageBase64: fakeData,
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Test 3: Valid Payload in Dev Mode (Simulated Send)
  await testCase('Accept valid payload and succeed in mock/safe mode', async () => {
    const res = await fetch(`${BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'candid.snapper@gmail.com',
        imageBase64: validPngBase64,
        frameName: 'Hollywood Star (Official)',
      }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Expected data.success === true');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();

