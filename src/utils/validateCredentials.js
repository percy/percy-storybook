/**
 * Validate BrowserStack credentials against the Percy API.
 * Throws an Error if credentials are invalid or the network fails.
 */
export async function validateCredentials(user, key) {
  const token = btoa(`${user}:${key}`);
  const res = await fetch('https://percy.io/api/v1/user', {
    headers: {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Username/Access Key is incorrect');
}
