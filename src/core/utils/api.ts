/**
 * Resolves relative API paths to absolute URLs if running under Capacitor (mobile).
 * If running in a standard web browser, returns the relative path.
 */
export function getApiUrl(path: string): string {
  if (!path) return '';
  
  // If path is already absolute, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Check if we are running in Capacitor (mobile app context)
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  
  if (isCapacitor) {
    // Route all mobile app API calls to the public production domain
    return `https://solarhubweb.com${cleanPath}`;
  }
  
  return cleanPath;
}
