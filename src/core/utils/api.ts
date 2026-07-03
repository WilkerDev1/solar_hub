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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    try {
      const url = new URL(supabaseUrl);
      // Replace port 54321 with 3000 (Next.js backend server port)
      return `${url.protocol}//${url.hostname}:3000${cleanPath}`;
    } catch (e) {
      // Fallback to tailscale IP of PC
      return `http://100.100.65.77:3000${cleanPath}`;
    }
  }
  
  return cleanPath;
}
