import axios from 'axios';

export default async function useRefreshToken() {
  try {
    const res = await axios.post('/api/token', {}, { withCredentials: true });
    return res.data.token;
  } catch (err) {
    console.error('Token refresh failed:', err);
    return null;
  }
}
