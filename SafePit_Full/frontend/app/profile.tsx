// frontend/app/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authAPI, contentAPI, storage } from '../services/api';
import { useLanguage } from '../services/LanguageContext';
import { Lang } from '../i18n/translations';

const LANGUAGES: { key: Lang; native: string }[] = [
  { key: 'English', native: 'English'   },
  { key: 'Hindi',   native: 'हिन्दी'    },
  { key: 'Tamil',   native: 'தமிழ்'     },
  { key: 'Telugu',  native: 'తెలుగు'   },
  { key: 'Odia',    native: 'ଓଡ଼ିଆ'    },
];

const getRoleBadge = (role: string, jobRole: string) => {
  const isWorkerWithSpecialization =
    role?.toLowerCase() === 'worker' && jobRole && jobRole !== 'General';

  const configKey = isWorkerWithSpecialization
    ? jobRole.toUpperCase()
    : role?.toUpperCase() ?? 'USER';
  const labelKey = isWorkerWithSpecialization
    ? `job_${jobRole.toLowerCase()}`
    : `job_${role?.toLowerCase()}`;

  const roleConfig: Record<string, { icon: string; color: string }> = {
    ADMIN:       { icon: 'shield-crown',       color: '#c4b5fd' },
    SUPERVISOR:  { icon: 'account-supervisor', color: '#fdba74' },
    WORKER:      { icon: 'hard-hat',           color: '#93c5fd' },
    ELECTRICIAN: { icon: 'lightning-bolt',     color: '#fde047' },
    DRILLER:     { icon: 'drill',              color: '#fb923c' },
    BLASTER:     { icon: 'bomb',               color: '#f87171' },
    LOADER:      { icon: 'dump-truck',         color: '#6ee7b7' },
    MAINTENANCE: { icon: 'tools',              color: '#a5b4fc' },
  };

  const config = roleConfig[configKey] ?? { icon: 'account-hard-hat', color: '#94a3b8' };
  return { ...config, labelKey };
};

export default function ProfileScreen() {
  const router = useRouter();
  const { lang, setLang, T } = useLanguage();

  const [user, setUser]               = useState<any>(null);
  const [guideline, setGuideline]     = useState('');
  const [loading, setLoading]         = useState(true);
  // FIX 3a: saving tracks which language is being saved
  const [saving, setSaving]           = useState<Lang | null>(null);
  // FIX 3b: success message displayed inline after save
  const [langSuccess, setLangSuccess] = useState('');

  // Load user + DGMS guideline; re-runs when lang changes so guideline is always translated
  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.getUser();
        if (saved) setUser(saved);

        const [meRes, guideRes] = await Promise.all([
          authAPI.me(),
          contentAPI.get('dgms_guideline', lang),
        ]);

        if (meRes.success) setUser(meRes.user);
        if (guideRes.success && guideRes.content.length) {
          setGuideline(guideRes.content[0].content);
        } else {
          setGuideline('');
        }
      } catch (err: any) {
        console.log('Profile load error:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [lang]); // re-fetches guideline every time lang changes ✅

  // FIX 3c: Full handleLanguageChange — sets saving state, shows success, clears after 2s
  const handleLanguageChange = async (newLang: Lang) => {
    if (newLang === lang || saving) return; // already selected or busy
    setSaving(newLang);
    setLangSuccess('');
    try {
      // 1. Update LanguageContext + AsyncStorage (instant UI change across all screens)
      await setLang(newLang);
      // 2. Persist to DB so backend returns translated content on next fetch
      await authAPI.updateLanguage(newLang);
      // 3. Show inline success message
      setLangSuccess(T('language_updated'));
      setTimeout(() => setLangSuccess(''), 2500);
    } catch (err: any) {
      console.log('Language update error:', err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleLogout = async () => {
    // FIX 2 (in api.ts): storage.clear() now also removes preferred_lang
    await storage.clear();
    router.replace('/login' as any);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const { icon, color, labelKey } = getRoleBadge(user?.role ?? '', user?.job_role ?? '');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{T('my_profile')}</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={16} color="#ef4444" />
          <Text style={styles.signOutText}>{T('sign_out')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={52} color="#fff" />
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <MaterialCommunityIcons name={icon as any} size={13} color={color} />
              <Text style={[styles.metaText, { color }]}>{T(labelKey)}</Text>
            </View>
            {user?.supervisor_name && (
              <View style={styles.metaBadge}>
                <MaterialCommunityIcons name="account-tie" size={13} color="#93c5fd" />
                <Text style={styles.metaText}>{user.supervisor_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Language Selection ── */}
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="translate" size={14} color="#94a3b8" />{' '}
          {T('select_language')}
        </Text>

        {/* FIX 3b: Inline success message — shown right after language is saved */}
        {!!langSuccess && (
          <View style={styles.successBox}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#22c55e" />
            <Text style={styles.successText}>{langSuccess}</Text>
          </View>
        )}

        <View style={styles.listCard}>
          {LANGUAGES.map(({ key, native }) => {
            const isActive   = lang === key;
            const isSavingMe = saving === key;

            return (
              <TouchableOpacity
                key={key}
                style={[styles.listItem, isActive && styles.listItemActive]}
                onPress={() => handleLanguageChange(key)}
                // FIX 3c: disable all items while any save is in-progress
                disabled={!!saving}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={[styles.listMain, isActive && styles.listMainActive]}>
                    {key}
                  </Text>
                  <Text style={styles.listNative}>{native}</Text>
                </View>

                {/* Right side: spinner while saving THIS item, checkmark when active */}
                {isSavingMe ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : isActive ? (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#2563eb" />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── DGMS Guideline — auto-updates when language changes ── */}
        {guideline ? (
          <View style={styles.dgmsCard}>
            <View style={styles.dgmsHeader}>
              <MaterialCommunityIcons name="information" size={22} color="#2563eb" />
              <Text style={styles.dgmsTitle}>{T('dgms_title')}</Text>
            </View>
            <Text style={styles.dgmsText}>{guideline}</Text>
          </View>
        ) : null}

      </ScrollView>

      {/* ── Bottom tab ── */}
      <View style={styles.bottomTab}>
        <Tab icon="home-outline"            label={T('tab_home')}
             onPress={() => router.push('/worker' as any)} />
        <Tab icon="clipboard-check-outline" label={T('tab_checklist')}
             onPress={() => router.push('/checklist' as any)} />
        <Tab icon="shield-outline"          label={T('tab_report')}
             onPress={() => router.push('/report' as any)} />
        <Tab icon="account"                 label={T('tab_profile')} active onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}

const Tab = ({ icon, label, active, onPress }: any) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={24} color={active ? '#2563eb' : '#64748b'} />
    <Text style={[styles.tabLabel, active && styles.tabActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:       { flex: 1, backgroundColor: '#f8fafc' },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  headerTitle:     { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  signOutBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff1f2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 5 },
  signOutText:     { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  scroll:          { padding: 20, paddingBottom: 100 },
  profileCard:     { backgroundColor: '#0f172a', borderRadius: 28, padding: 28, alignItems: 'center', marginBottom: 22 },
  avatar:          { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  userName:        { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  userEmail:       { color: '#475569', fontSize: 13, marginTop: 4 },
  metaRow:         { flexDirection: 'row', gap: 8, marginTop: 14 },
  metaBadge:       { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  metaText:        { color: '#93c5fd', fontSize: 11, fontWeight: 'bold' },
  sectionTitle:    { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginBottom: 10, marginTop: 20, letterSpacing: 0.8 },
  successBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  successText:     { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  listCard:        { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 2 },
  listItem:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listItemActive:  { backgroundColor: '#eff6ff' },
  listMain:        { fontSize: 15, color: '#475569', fontWeight: '500' },
  listMainActive:  { color: '#1e293b', fontWeight: 'bold' },
  listNative:      { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  dgmsCard:        { backgroundColor: '#eff6ff', borderRadius: 22, padding: 18, marginTop: 22, borderWidth: 1, borderColor: '#dbeafe' },
  dgmsHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dgmsTitle:       { color: '#1e40af', fontWeight: 'bold', fontSize: 13 },
  dgmsText:        { color: '#2563eb', lineHeight: 22, fontSize: 13 },
  bottomTab:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#fff', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: 10 },
  tabItem:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel:        { fontSize: 10, color: '#64748b', marginTop: 3 },
  tabActive:       { color: '#2563eb', fontWeight: 'bold' },
});