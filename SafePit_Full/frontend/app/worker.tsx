// frontend/app/worker.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { storage, authAPI, checklistAPI, sosAPI, contentAPI } from '../services/api';
import { useLanguage } from '../services/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getRoleBadge = (role: string, jobRole: string) => {
  const isWorkerWithSpecialization =
    role?.toLowerCase() === 'worker' && jobRole && jobRole !== 'General';
  const labelKey = isWorkerWithSpecialization
    ? `job_${jobRole.toLowerCase()}`
    : `job_${role?.toLowerCase()}`;
  const iconName = isWorkerWithSpecialization
    ? 'hard-hat'
    : role?.toLowerCase() === 'supervisor'
    ? 'account-tie'
    : 'account';
  return { labelKey, icon: iconName };
};

export default function WorkerDashboard() {
  const router = useRouter();
  const { lang, T } = useLanguage();

  const [user, setUser]             = useState<any>(null);
  const [progress, setProgress]     = useState({ completed: 0, total: 0, percentage: 0 });
  const [tip, setTip]               = useState('');
  const [prompt, setPrompt]         = useState('');
  const [dgms, setDgms]             = useState('');
  const [sosLoading, setSosLoading] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? T('good_morning') : h < 17 ? T('good_afternoon') : T('good_evening');
  };

  const load = useCallback(async () => {
    try {
      const saved = await storage.getUser();
      setUser(saved);

      const [meRes, clRes] = await Promise.all([
        authAPI.me(),
        checklistAPI.getMyTasks(lang),
      ]);
      const [tipSettled, promptSettled, dgmsSettled] = await Promise.allSettled([
        contentAPI.get('safety_tip', lang),
        contentAPI.get('positive_statement', lang),
        contentAPI.get('dgms_guideline', lang),
      ]);

      if (meRes.success) {
        setUser(meRes.user);
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) await storage.saveAuth(storedToken, meRes.user);
      }
      if (clRes.success) setProgress(clRes.progress);

      if (tipSettled.status === 'fulfilled' && tipSettled.value.success && tipSettled.value.content.length) {
        const random = tipSettled.value.content[Math.floor(Math.random() * tipSettled.value.content.length)];
        setTip(random.content);
      } else setTip('');

      if (promptSettled.status === 'fulfilled' && promptSettled.value.success && promptSettled.value.content.length) {
        const random = promptSettled.value.content[Math.floor(Math.random() * promptSettled.value.content.length)];
        setPrompt(random.content);
      } else setPrompt('');

      if (dgmsSettled.status === 'fulfilled' && dgmsSettled.value.success && dgmsSettled.value.content.length) {
        setDgms(dgmsSettled.value.content[0].content);
      } else setDgms('');

    } catch (err: any) {
      console.log('Worker load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang]);

  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    setRefreshing(true);
    load();
  }, [lang, load]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  const handleSOS = async () => {
    const confirmed = window.confirm(`🚨 ${T('sos_title')}\n\n${T('sos_confirm')}`);
    if (!confirmed) return;

    setSosLoading(true);
    try {
      await sosAPI.trigger('Current Location');
      window.alert(`✅ ${T('sos_sent')}`);
    } catch (err: any) {
      if (err.message?.includes('Active SOS already running')) {
        window.alert('⚠️ SOS Already Active - Your previous SOS is still active.');
      } else {
        window.alert(`${T('error')}: ${err.message}`);
      }
    } finally {
      setSosLoading(false);
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
        <Text style={styles.loadingText}>{T('loading')}</Text>
      </View>
    );
  }

  const circleColor = progress.percentage === 100 ? '#22c55e' : '#f97316';
  const { labelKey: roleLabelKey, icon: roleIcon } = getRoleBadge(
    user?.role ?? 'worker',
    user?.job_role ?? ''
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name || '—'}</Text>
            <Text style={styles.empId}>{user?.email}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name={roleIcon as any} size={13} color="#fff" />
              <Text style={styles.roleText}>{T(roleLabelKey)}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <MaterialCommunityIcons name="logout" size={18} color="#f87171" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Positive Prompt ── */}
        {!!prompt && (
          <View style={styles.promptCard}>
            <MaterialCommunityIcons name="star-four-points" size={16} color="#fbbf24" />
            <Text style={styles.promptText}>{prompt}</Text>
          </View>
        )}

        {/* ── SOS Button ── */}
        <TouchableOpacity
          style={styles.sosCard}
          onPress={handleSOS}
          disabled={sosLoading}
          activeOpacity={0.8}
        >
          <View style={styles.sosIconCircle}>
            {sosLoading
              ? <ActivityIndicator color="#ef4444" size="large" />
              : <MaterialCommunityIcons name="alert-outline" size={42} color="#ef4444" />}
          </View>
          <Text style={styles.sosTitle}>{T('sos_title')}</Text>
          <Text style={styles.sosSub}>{sosLoading ? T('sos_sending') : T('sos_sub')}</Text>
        </TouchableOpacity>

        {/* ── Checklist card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={22} color="#2563eb" />
            <Text style={styles.cardTitle}>{T('checklist_title')}</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={[styles.progressCircle, { borderColor: circleColor }]}>
              <Text style={styles.progressText}>{progress.completed}/{progress.total}</Text>
              <Text style={styles.progressSub}>{T('tasks_label')}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.infoTitle}>
                {progress.percentage === 100 ? T('all_done') : `${progress.percentage}% ${T('completed_label')}`}
              </Text>
              <Text style={styles.infoSub}>{progress.percentage === 100 ? T('stay_safe') : ''}</Text>
              <TouchableOpacity onPress={() => router.push('/checklist' as any)}>
                <Text style={styles.linkText}>{T('view_checklist')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Supervisor info ── */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="account-tie" size={20} color="#2563eb" />
            <Text style={styles.infoBoxLabel}>{T('supervisor_label')}</Text>
            <Text style={styles.infoBoxValue}>{user?.supervisor_name || '—'}</Text>
          </View>
        </View>

        {/* ── Safety Tip ── */}
        {!!tip && (
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#f59e0b" />
              <Text style={styles.tipLabel}>{T('safety_tip')}</Text>
            </View>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        )}

        {/* ── DGMS Guideline ── */}
        {!!dgms && (
          <View style={styles.dgmsCard}>
            <View style={styles.dgmsHeader}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#2563eb" />
              <Text style={styles.dgmsTitle}>{T('dgms_title')}</Text>
            </View>
            <Text style={styles.dgmsText}>{dgms}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Tab ── */}
      <View style={styles.bottomTab}>
        <Tab icon="home"                   label={T('tab_home')}      active onPress={() => {}} />
        <Tab icon="clipboard-text-outline" label={T('tab_checklist')} onPress={() => router.push('/checklist' as any)} />
        <Tab icon="shield-outline"         label={T('tab_report')}    onPress={() => router.push('/report' as any)} />
        <Tab icon="account-outline"        label={T('tab_profile')}   onPress={() => router.push('/profile' as any)} />
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
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText:    { marginTop: 12, color: '#64748b', fontSize: 15 },
  container:      { flex: 1, backgroundColor: '#f1f5f9' },
  scroll:         { padding: 20, paddingBottom: 100 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#0f172a', margin: -20, padding: 25, marginBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  greeting:       { color: '#64748b', fontSize: 13 },
  userName:       { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 3 },
  empId:          { color: '#334155', fontSize: 11, marginTop: 2 },
  headerRight:    { alignItems: 'flex-end', gap: 10 },
  roleBadge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  roleText:       { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  logoutBtn:      { backgroundColor: 'rgba(255,255,255,0.06)', padding: 7, borderRadius: 10 },
  promptCard:     { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1e1b4b', borderRadius: 16, padding: 14, marginBottom: 16, gap: 10 },
  promptText:     { color: '#c7d2fe', fontSize: 13, flex: 1, lineHeight: 20, fontStyle: 'italic' },
  sosCard:        { backgroundColor: '#ef4444', borderRadius: 28, padding: 30, alignItems: 'center', marginBottom: 18, elevation: 6 },
  sosIconCircle:  { backgroundColor: '#fff', width: 78, height: 78, borderRadius: 39, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  sosTitle:       { color: '#fff', fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  sosSub:         { color: '#fecaca', marginTop: 5, fontSize: 13 },
  card:           { backgroundColor: '#fff', borderRadius: 22, padding: 20, marginBottom: 14, elevation: 2 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  cardTitle:      { fontSize: 15, fontWeight: 'bold', color: '#1e293b', flex: 1 },
  cardBody:       { flexDirection: 'row', alignItems: 'center' },
  progressCircle: { width: 78, height: 78, borderRadius: 39, borderWidth: 6, justifyContent: 'center', alignItems: 'center' },
  progressText:   { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },
  progressSub:    { fontSize: 8, color: '#64748b' },
  cardInfo:       { marginLeft: 18, flex: 1 },
  infoTitle:      { fontSize: 15, fontWeight: 'bold', color: '#334155' },
  infoSub:        { color: '#64748b', marginBottom: 8, fontSize: 13 },
  linkText:       { color: '#2563eb', fontWeight: 'bold', fontSize: 14 },
  infoRow:        { flexDirection: 'row', gap: 12, marginBottom: 14 },
  infoBox:        { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 1 },
  infoBoxLabel:   { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginTop: 6 },
  infoBoxValue:   { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginTop: 3, textAlign: 'center' },
  tipCard:        { backgroundColor: '#fffbeb', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#fde68a' },
  tipHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipLabel:       { color: '#b45309', fontWeight: 'bold', fontSize: 12 },
  tipText:        { color: '#92400e', fontSize: 14, lineHeight: 22 },
  dgmsCard:       { backgroundColor: '#eff6ff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#dbeafe', marginTop: 16 },
  dgmsHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dgmsTitle:      { color: '#1e40af', fontWeight: 'bold', fontSize: 12 },
  dgmsText:       { color: '#1e3a8a', fontSize: 14, lineHeight: 20 },
  bottomTab:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#fff', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: 10 },
  tabItem:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel:       { fontSize: 10, color: '#64748b', marginTop: 3 },
  tabActive:      { color: '#2563eb', fontWeight: 'bold' },
});