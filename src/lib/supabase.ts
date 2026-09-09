// Re-export AuthUserProfile and Cloud Database helpers for seamless migration
export type { AuthUserProfile } from './cloudDb';
export { 
  checkCloudDbStatus, 
  fetchCloudProducts, 
  saveCloudProduct, 
  deleteCloudProduct, 
  resetCloudProducts,
  saveCloudOrder,
  fetchCloudOrders,
  cloudLogin,
  cloudRegister
} from './cloudDb';

// Supabase legacy status (disabled in favor of free cloud db)
export const isSupabaseConfigured = (): boolean => false;
export const getSupabase = (): null => null;

