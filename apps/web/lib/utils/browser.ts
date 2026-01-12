export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Simple, explicit configuration for server-side base URL
  const url = process.env.NEXTAUTH_URL;

  if (url) {
    return url.startsWith('http') ? url : `https://${url}`;
  }
  throw new Error('❌ Base URL is not defined. Please set NEXTAUTH_URL.');
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}
