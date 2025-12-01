/**
 * Client-side usage tracking for free tier rate limiting
 * Syncs with server-side validation for robust limiting
 */

const STORAGE_KEY = 'podremix_usage';
const DAILY_LIMIT = 2;

interface UsageData {
  count: number;
  date: string;
}

/**
 * Get current usage from localStorage
 * Resets automatically if date has changed
 */
export function getUsageFromCache(): UsageData {
  if (typeof window === 'undefined') {
    return { count: 0, date: '' };
  }
  
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return { count: 0, date: '' };
  }
  
  try {
    const parsed: UsageData = JSON.parse(data);
    const today = new Date().toISOString().split('T')[0];
    
    // Reset if it's a new day
    if (parsed.date !== today) {
      return { count: 0, date: today };
    }
    
    return parsed;
  } catch {
    return { count: 0, date: '' };
  }
}

/**
 * Sync local cache with server-reported count
 */
export function syncUsage(serverCount: number): void {
  if (typeof window === 'undefined') return;
  
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
    count: serverCount, 
    date: today 
  }));
}

/**
 * Increment local usage count (optimistic update)
 */
export function incrementUsage(): void {
  if (typeof window === 'undefined') return;
  
  const current = getUsageFromCache();
  const today = new Date().toISOString().split('T')[0];
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    count: current.count + 1,
    date: today
  }));
}

/**
 * Get remaining generations for the day
 */
export function getRemainingGenerations(): number {
  const usage = getUsageFromCache();
  return Math.max(0, DAILY_LIMIT - usage.count);
}

/**
 * Check if user has reached daily limit
 */
export function hasReachedLimit(): boolean {
  return getRemainingGenerations() === 0;
}

/**
 * Get daily limit constant
 */
export function getDailyLimit(): number {
  return DAILY_LIMIT;
}

