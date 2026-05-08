import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authAPI, storage } from '../services/api';
import { useLanguage } from '../services/LanguageContext'; // ✅ ADD THIS
import { Lang } from '../i18n/translations';

const LANGUAGES: { key: Lang; native: string }[] = [
  { key: 'English', native: 'English'  },
  { key: 'Hindi',   native: 'हिन्दी'    },
  { key: 'Tamil',   native: 'தமிழ்'     },
  { key: 'Telugu',  native: 'తెలుగు'    },
  { key: 'Odia',    native: 'ଓଡ଼ିଆ'     },
];

export default function SupervisorProfile() {
  const router = useRouter();
  const { lang, setLang, T } = useLanguage(); // ✅ USE CONTEXT
  const [user, setUser]       = useState<any>(null);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.getUser();
        if (saved) setUser(saved);
        const res = await authAPI.me();
        if (res.success) setUser(res.user);
      } catch (err: any) {
        console.log('Profile load:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLangChange = async (newLang: Lang) => {
    if (saving) return;
    setSaving(true);
    try {
      await setLang(newLang);              // ✅ LanguageContext update — all screens reflect
      await authAPI.updateLanguage(newLang); // ✅ DB save
    } catch (err: any) {
      console.log('Lang change error:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{T('my_profile')}</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <Text style={styles.signOutText}>{T('sign_out')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account-tie" size={55} color="#fff" />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>Supervisor • {user?.email}</Text>
          {user?.phone_no && (
            <View style={styles.phoneBadge}>
              <MaterialCommunityIcons name="phone" size={13} color="#64748b" />
              <Text style={styles.phoneText}>{user.phone_no}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{T('select_language')}</Text>
        <View style={styles.listCard}>
          {LANGUAGES.map(({ key, native }) => (
            <TouchableOpacity
              key={key}
              style={styles.listItem}
              onPress={() => handleLangChange(key)}
              disabled={saving}
            >
              <View>
                <Text style={[styles.listMain, lang === key && styles.listActive]}>{key}</Text>
                <Text style={styles.listNative}>{native}</Text>
              </View>
              {lang === key && (
                saving
                  ? <ActivityIndicator size="small" color="#2563eb" />
                  : <MaterialCommunityIcons name="check-circle" size={20} color="#2563eb" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.accessCard}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#22c55e" />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.accessTitle}>Supervisor Access Active</Text>
            <Text style={styles.accessSub}>Full dashboard & alert management</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  backBtn:        { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 12 },
  headerTitle:    { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  signOutBtn:     { backgroundColor: '#fff1f2', padding: 8, paddingHorizontal: 14, borderRadius: 10 },
  signOutText:    { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  scroll:         { padding: 20 },
  profileSection: { alignItems: 'center', marginVertical: 24 },
  avatar:         { width: 96, height: 96, borderRadius: 48, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  name:           { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  role:           { fontSize: 13, color: '#64748b', marginTop: 4 },
  phoneBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  phoneText:      { color: '#64748b', fontSize: 13 },
  sectionTitle:   { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginBottom: 10, letterSpacing: 0.8 },
  listCard:       { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 2, marginBottom: 20 },
  listItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listMain:       { fontSize: 15, color: '#475569', fontWeight: '500' },
  listActive:     { color: '#1e293b', fontWeight: 'bold' },
  listNative:     { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  accessCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 18, borderRadius: 20 },
  accessTitle:    { color: '#166534', fontWeight: 'bold', fontSize: 14 },
  accessSub:      { color: '#22c55e', fontSize: 12, marginTop: 3 },
});