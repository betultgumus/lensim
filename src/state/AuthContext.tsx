import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { useApp } from './AppContext';
import { syncAccountState } from '../services/accountSync';
import { cloudConfigured, deleteAccountOnServer, deleteCloudData, supabase } from '../services/supabase';
import { cloudBackupAllowed, cloudConsentKey, makeCloudConsent, parseCloudConsent } from '../domain/cloudConsent';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  syncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  /** null while unknown (no session yet / still reading). Uploads happen only while this is true. */
  cloudBackup: boolean | null;
  syncNow: () => Promise<void>;
  enableCloudBackup: () => Promise<void>;
  disableCloudBackup: (deleteCloudCopy: boolean) => Promise<void>;
  deleteAccount: (keepDeviceData: boolean) => Promise<void>;
  wipeDevice: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeAuthRedirect: (url: string) => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const app = useApp();
  const [ready, setReady] = useState(!cloudConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [cloudBackup, setCloudBackup] = useState<boolean | null>(null);
  const inFlight = useRef(false);
  const syncedLocalRevision = useRef<number | null>(null);
  const stateRef = useRef(app.state); stateRef.current = app.state;
  const ownerStorageKey = 'lensim-local-account-owner';

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setSyncError('Hesap oturumu açılamadı. İnternet bağlantını kontrol edip yeniden dene.');
      setSession(data.session); setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next); setReady(true);
      if (!next) { syncedLocalRevision.current = null; setLastSyncedAt(null); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  // Cloud backup choice of the signed-in account on this device. Missing = never agreed = no upload.
  useEffect(() => {
    if (!session) { setCloudBackup(null); return; }
    let alive = true;
    void Promise.resolve(localStorage.getItem(cloudConsentKey(session.user.id))).then(raw => { if (alive) setCloudBackup(cloudBackupAllowed(parseCloudConsent(raw))); }).catch(() => { if (alive) setCloudBackup(false); });
    return () => { alive = false; };
  }, [session]);

  const runSync = useCallback(async () => {
    if (!supabase || !session || app.loading || inFlight.current || cloudBackup !== true) return;
    inFlight.current = true; setSyncing(true); setSyncError(null);
    const initial = stateRef.current;
    try {
      const localOwner = await localStorage.getItem(ownerStorageKey);
      if (localOwner && localOwner !== session.user.id) throw new Error('Bu telefonda başka bir hesabın verisi bulunuyor. Önce o hesaptan çıkış yap; veriler hesaplar arasında karıştırılmadı.');
      const result = await syncAccountState(initial);
      if (result.changedLocal) {
        // Never replace changes made while a network request was in flight.
        if (stateRef.current.revision !== initial.revision) throw new Error('Senkronizasyon sırasında bu telefonda yeni kayıt yapıldı. Kayıtların korunuyor; yeniden eşitle.');
        const saved = await app.dispatch({ type: 'restore', state: result.state });
        syncedLocalRevision.current = saved.revision;
      } else syncedLocalRevision.current = initial.revision;
      await localStorage.setItem(ownerStorageKey, session.user.id);
      setLastSyncedAt(new Date().toISOString());
      setSyncError(result.overlappingDays ? `Aynı gün için iki cihazda farklı cevap vardı. Bu cihazdaki cevap kullanıldı; önceki bulut kopyası korundu.` : null);
    } catch (error) {
      setSyncError(error instanceof Error && error.message.includes('Senkronizasyon sırasında') ? error.message : 'Bulut yedeği güncellenemedi. Telefonundaki kayıtlar korundu; bağlantını kontrol edip yeniden dene.');
    } finally { inFlight.current = false; setSyncing(false); }
  }, [app.dispatch, app.loading, session, cloudBackup]);

  useEffect(() => {
    if (!ready || !session || cloudBackup !== true || app.loading || syncedLocalRevision.current === app.state.revision) return;
    const timer = setTimeout(() => { void runSync(); }, 900);
    return () => clearTimeout(timer);
  }, [ready, session, cloudBackup, app.loading, app.state.revision, runSync]);

  /** Explicit, separate approval given in the app (unticked box + button). Starts the first upload right after. */
  const enableCloudBackup = useCallback(async () => {
    if (!session) throw new Error('Bulut yedeği için önce hesabına giriş yap.');
    await localStorage.setItem(cloudConsentKey(session.user.id), JSON.stringify(makeCloudConsent(true)));
    syncedLocalRevision.current = null; setCloudBackup(true);
  }, [session]);
  /** Stops every upload at once. With `deleteCloudCopy` the cloud backup and its history are deleted too (verified). */
  const disableCloudBackup = useCallback(async (deleteCloudCopy: boolean) => {
    if (!session) return;
    await localStorage.setItem(cloudConsentKey(session.user.id), JSON.stringify(makeCloudConsent(false)));
    setCloudBackup(false); setLastSyncedAt(null); setSyncError(null); syncedLocalRevision.current = null;
    // The records on this phone stay; they are no longer tied to the cloud copy.
    await localStorage.removeItem(ownerStorageKey);
    if (deleteCloudCopy) await deleteCloudData();
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Hesap hizmeti henüz yapılandırılmadı.');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Hesap hizmeti henüz yapılandırılmadı.');
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectTo } });
    if (error) throw error;
    return Boolean(data.session);
  }, []);
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Hesap hizmeti henüz yapılandırılmadı.');
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
    if (error) throw error;
    if (!data.url) throw new Error('Google giriş bağlantısı oluşturulamadı.');
    if (Platform.OS === 'web') { window.location.assign(data.url); return; }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) await completeRedirect(result.url);
  }, []);
  const completeRedirect = useCallback(async (url: string) => {
    if (!supabase) return;
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    if (code) { const { error } = await supabase.auth.exchangeCodeForSession(code); if (error) throw error; return; }
    const message = parsed.searchParams.get('error_description');
    if (message) throw new Error(message);
  }, []);
  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Hesap hizmeti henüz yapılandırılmadı.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('auth/callback') });
    if (error) throw error;
  }, []);
  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Hesap hizmeti henüz yapılandırılmadı.');
    const { error } = await supabase.auth.updateUser({ password }); if (error) throw error;
  }, []);
  const signOut = useCallback(async () => {
    if (!supabase) return;
    if (cloudBackup === true) {
      // Keep the account copy safe before clearing this device, and never mix one account's data into another.
      const result = await syncAccountState(stateRef.current);
      if (result.changedLocal) await app.dispatch({ type: 'restore', state: result.state });
    }
    // 'global' also revokes the refresh tokens of this account's other sessions.
    const { error } = await supabase.auth.signOut(); if (error) throw error;
    await localStorage.removeItem(ownerStorageKey);
    // Without cloud backup the records were never uploaded: they stay on this phone as guest records.
    if (cloudBackup === true) await app.dispatch({ type: 'reset' });
  }, [app.dispatch, cloudBackup]);
  /** Real deletion on the server first; only after it is confirmed is this device cleaned up. */
  const deleteAccount = useCallback(async (keepDeviceData: boolean) => {
    if (!supabase || !session) throw new Error('Silinecek bir hesap oturumu yok.');
    const userId = session.user.id;
    await deleteAccountOnServer();
    await localStorage.removeItem(cloudConsentKey(userId));
    await localStorage.removeItem(ownerStorageKey);
    setSession(null); setCloudBackup(null); setLastSyncedAt(null); setSyncError(null); syncedLocalRevision.current = null;
    if (!keepDeviceData) await app.dispatch({ type: 'reset' });
  }, [app.dispatch, session]);
  /**
   * "Cihazımdaki tüm verileri sil": every Lensim record on this phone, the stored sign-in and the cloud choice.
   * The account and its cloud copy are NOT touched (that is "Hesabımı sil"); signing out here keeps the cloud copy
   * from being downloaded again right after the wipe.
   */
  const wipeDevice = useCallback(async () => {
    if (supabase && session) {
      await localStorage.removeItem(cloudConsentKey(session.user.id));
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }
    await localStorage.removeItem(ownerStorageKey);
    await app.dispatch({ type: 'reset' });
  }, [app.dispatch, session]);
  const completeAuthRedirect = useCallback((url: string) => completeRedirect(url), [completeRedirect]);

  return <AuthContext.Provider value={{ ready, configured: cloudConfigured, session, syncing, lastSyncedAt, syncError, cloudBackup, syncNow: runSync, enableCloudBackup, disableCloudBackup, deleteAccount, wipeDevice, signIn, signUp, signInWithGoogle, sendPasswordReset, updatePassword, signOut, completeAuthRedirect }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('Hesap bağlamı bulunamadı.'); return context; }
