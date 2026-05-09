// frontend/app/admin_profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authAPI, contentAPI, storage } from '../services/api';
// FIX: Use LanguageContext instead of local translate() so change is app-wide
import { useLanguage } from '../services/LanguageContext';

// Admin profile screen showing system stats and admin info
export default function AdminProfile() {
  const router = useRouter();
  const { setLang, T } = useLanguage();

  const [user, setUser]       = useState<any>(null);
  const [stats, setStats]     = useState({ active_workers: 0, open_reports: 0, active_sos: 0, total_incidents: 0 });
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await setLang('English');
        const saved = await storage.getUser();
        if (saved) setUser(saved);
        const [meRes, statsRes] = await Promise.all([authAPI.me(), contentAPI.getStats()]);
        if (meRes.success)    setUser(meRes.user);
        if (statsRes.success) setStats(statsRes.stats);
      } catch (err: any) {
        console.log('Admin profile load:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{T('admin_panel')}</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <Text style={styles.signOutText}>{T('sign_out')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* FIX: Inline success banner */}
        {successMsg && (
          <View style={styles.successBox}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#22c55e" />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* Avatar */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="shield-account" size={55} color="#fff" />
          </View>
          <Text style={styles.name}>{user?.name || 'System Administrator'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* System Stats */}
        <Text style={styles.sectionTitle}>{T('system_status')}</Text>
        <View style={styles.statsCard}>
          <StatRow icon="account-group-outline"  label={T('status_active_workers')}   value={String(stats.active_workers)}  color="#3b82f6" />
          <StatRow icon="clipboard-alert-outline" label={T('status_open_reports')}     value={String(stats.open_reports)}    color="#f97316" />
          <StatRow icon="bell-alert-outline"      label={T('status_active_sos')}       value={String(stats.active_sos)}      color={stats.active_sos > 0 ? '#ef4444' : '#22c55e'} />
          <StatRow icon="file-chart-outline"      label={T('status_total_incidents')}  value={String(stats.total_incidents)} color="#64748b" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const StatRow = ({ icon, label, value, color }: any) => (
  <View style={styles.statRow}>
    <View style={styles.statLeft}>
      <MaterialCommunityIcons name={icon} size={20} color="#64748b" />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  backBtn:        { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 12 },
  headerTitle:    { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  signOutBtn:     { backgroundColor: '#fff1f2', padding: 8, paddingHorizontal: 14, borderRadius: 10 },
  signOutText:    { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  scroll:         { padding: 20 },
  successBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dcfce7', borderRadius: 12, padding: 12, marginBottom: 12 },
  successText:    { color: '#16a34a', fontWeight: '600', fontSize: 13, flex: 1 },
  profileSection: { alignItems: 'center', marginVertical: 24 },
  avatar:         { width: 96, height: 96, borderRadius: 48, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  name:           { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  email:          { fontSize: 13, color: '#64748b', marginTop: 4 },
  sectionTitle:   { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginBottom: 10, marginTop: 20, letterSpacing: 0.8 },
  statsCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 8, elevation: 2, marginBottom: 4 },
  statRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  statLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statLabel:      { fontSize: 14, color: '#475569', fontWeight: '500' },
  statValue:      { fontSize: 18, fontWeight: 'bold' },
  listCard:       { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 2 },
  listItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listMain:       { fontSize: 15, color: '#475569', fontWeight: '500' },
  listActive:     { color: '#1e293b', fontWeight: 'bold' },
  listNative:     { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});