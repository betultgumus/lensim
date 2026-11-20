import 'react-native-url-polyfill/auto';
import './storageShim';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppState } from '../domain/types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
export const cloudConfigured = Boolean(url && publishableKey);

/** Guest mode never needs a backend. An unset project keeps all app use local. */
export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

export type CloudSnapshot = { snapshot: AppState; revision: number };

export async function readCloudSnapshot(): Promise<CloudSnapshot | null> {
  if (!supabase) throw new Error('Bulut hesabı henüz yapılandırılmadı.');
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userResult.user) throw new Error('Bulut yedeğini açmak için hesabına giriş yap.');
  const { data, error } = await supabase.from('user_backups').select('snapshot, revision').eq('user_id', userResult.user.id).maybeSingle();
  if (error) throw error;
  return data ? { snapshot: data.snapshot as AppState, revision: Number(data.revision) } : null;
}

export async function writeCloudSnapshot(snapshot: AppState, expectedRevision: number, archivePrevious = false): Promise<number> {
  if (!supabase) throw new Error('Bulut hesabı henüz yapılandırılmadı.');
  const { data, error } = await supabase.rpc('save_lensim_backup', {
    p_snapshot: snapshot,
    p_expected_revision: expectedRevision,
    p_archive_previous: archivePrevious,
  });
  if (error) throw error;
  return Number(data);
}

/** Deletes this account's cloud backup and archived copies; the account itself stays. Verified by reading back. */
export async function deleteCloudData(): Promise<void> {
  if (!supabase) throw new Error('Bulut hesabı henüz yapılandırılmadı.');
  const { error } = await supabase.rpc('delete_lensim_cloud_data');
  if (error) throw error;
  if (await readCloudSnapshot()) throw new Error('Buluttaki yedek silinemedi.');
}

/**
 * Permanently deletes the account on the server: cloud backup, its history and the sign-in account (auth.users,
 * which also removes identities and sessions). Resolves only when the server confirmed the deletion.
 */
export async function deleteAccountOnServer(): Promise<void> {
  if (!supabase) throw new Error('Bulut hesabı henüz yapılandırılmadı.');
  // 1) SQL RPC (migration 202611200002). 2) If the project does not allow it, the `delete-account` Edge Function,
  //    which uses the Auth admin API on the server (the service-role key never reaches the app).
  const rpc = await supabase.rpc('delete_my_lensim_account');
  if (rpc.error || rpc.data !== true) {
    const fn = await supabase.functions.invoke<{ deleted?: boolean }>('delete-account', { method: 'POST' });
    if (fn.error || fn.data?.deleted !== true) throw new Error('Hesap silme sunucuda onaylanmadı.');
  }
  // Verify: a deleted account can no longer be read with this token.
  const check = await supabase.auth.getUser();
  if (!check.error && check.data.user) throw new Error('Hesap silme doğrulanamadı.');
  // The server session no longer exists; only the copy kept on this device is cleared here.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}
