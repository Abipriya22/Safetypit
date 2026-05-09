// frontend/app/admin.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { contentAPI, reportAPI, checklistAPI, storage } from '../services/api';
import { useLanguage } from '../services/LanguageContext';
import { Lang } from '../i18n/translations';
import { useFocusEffect } from '@react-navigation/native';

const LANGS: Lang[] = ['English', 'Hindi', 'Tamil', 'Telugu', 'Odia'];
const JOB_ROLES = ['all', 'Electrician', 'Driller', 'Blaster', 'Loader', 'Maintenance', 'Operator'];

export default function AdminDashboard() {
  const router = useRouter();
  const { T, setLang } = useLanguage();
  const [activeTab, setActiveTab] = useState('UPLOAD');

  const [stats, setStats] = useState({
    active_workers: 0, open_reports: 0, active_sos: 0, total_incidents: 0
  });

  const [uploadLang, setUploadLang] = useState<Lang>('English');
  const [statement, setStatement]   = useState('');
  const [tipText, setTipText]       = useState('');
  const [guideTitle, setGuideTitle] = useState('');
  const [guideContent, setGuideContent] = useState('');
  const [uploading, setUploading]   = useState<string | null>(null);

  const [taskDesc, setTaskDesc] = useState('');
  const [taskRole, setTaskRole] = useState('all');

  const [reports, setReports]     = useState<any[]>([]);
  const [tasks, setTasks]         = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]     = useState(true);

  const [successMsg, setSuccessMsg]     = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [statsRes, reportsRes, tasksRes] = await Promise.all([
        contentAPI.getStats(),
        reportAPI.getAll(),
        checklistAPI.getAllTasks(),
      ]);
      if (statsRes.success)   setStats(statsRes.stats);
      if (reportsRes.success) setReports(reportsRes.reports);
      if (tasksRes.success)   setTasks(tasksRes.tasks);
    } catch (err: any) {
      console.log('Admin load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const handleLogout = async () => {
    await storage.clear();
    router.replace('/login' as any);
  };

  const showSuccess = (msg: string) => {
    setValidationMsg(null);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showError = (msg: string) => {
    setSuccessMsg(null);
    setValidationMsg(msg);
    setTimeout(() => setValidationMsg(null), 3500);
  };

  const upload = async (type: string) => {
    if (type === 'statement' && !statement.trim())                     { showError(T('fill_required')); return; }
    if (type === 'tip'       && !tipText.trim())                       { showError(T('fill_required')); return; }
    if (type === 'guideline' && (!guideTitle.trim() || !guideContent.trim())) { showError(T('fill_required')); return; }
    if (type === 'task'      && !taskDesc.trim())                      { showError(T('fill_required')); return; }

    setUploading(type);
    setSuccessMsg(null);
    setValidationMsg(null);

    try {
      if (type === 'statement') {
        await contentAPI.create({ type: 'positive_statement', content: statement.trim(), lang: uploadLang });
        setStatement('');
        showSuccess(`${T('positive_stmt')} — ${T('submitted')}`);

      } else if (type === 'tip') {
        await contentAPI.create({ type: 'safety_tip', content: tipText.trim(), lang: uploadLang });
        setTipText('');
        showSuccess(`${T('safety_tip_lbl')} — ${T('submitted')}`);

      } else if (type === 'guideline') {
        await contentAPI.create({
          type: 'dgms_guideline',
          title: guideTitle.trim(),
          content: guideContent.trim(),
          lang: uploadLang,
        });
        setGuideTitle('');
        setGuideContent('');
        showSuccess(`${T('dgms_guideline')} — ${T('submitted')}`);

      } else if (type === 'task') {
        await checklistAPI.createTask({
          task_description: taskDesc.trim(),
          role_target: taskRole,
          shift_target: 'All',
        });
        setTaskDesc('');
        setTaskRole('all');
        await load();
        showSuccess(`${T('checklist_task')} — ${T('submitted')}`);
      }
    } catch (err: any) {
      showError(err.message || T('error'));
    } finally {
      setUploading(null);
    }
  };



  const sevColor = (s: string) =>
    s === 'CRITICAL' ? '#ef4444' : s === 'HIGH' ? '#f97316' : s === 'MEDIUM' ? '#f59e0b' : '#22c55e';

  // ── Loading screen ───────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>{T('loading')}</Text>
      </View>
    );
  }

  // ── Message banner ───────────────────────────────────────────────
  const MessageBanner = () => {
    if (successMsg) return (
      <View style={styles.successBox}>
        <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" />
        <Text style={styles.successText}>{successMsg}</Text>
      </View>
    );
    if (validationMsg) return (
      <View style={styles.errorBox}>
        <MaterialCommunityIcons name="alert-circle" size={20} color="#ef4444" />
        <Text style={styles.errorText}>{validationMsg}</Text>
      </View>
    );
    return null;
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{T('admin_panel')}</Text>
          <Text style={styles.headerSub}>Control & Management</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/admin_profile' as any)}>
            <MaterialCommunityIcons name="account-circle" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color="#f87171" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <StatPill label={T('workers') || 'Workers'} value={stats.active_workers} color="#3b82f6" />
        <StatPill label="Reports" value={stats.open_reports}   color="#f97316" />
        <StatPill label="SOS"     value={stats.active_sos}     color="#ef4444" />
        <StatPill label="Total"   value={stats.total_incidents} color="#64748b" />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['UPLOAD', 'TASKS', 'HISTORY'] as const).map(key => (
          <TouchableOpacity key={key}
            onPress={() => {
              setActiveTab(key);
              setSuccessMsg(null);
              setValidationMsg(null);
              if (key !== 'UPLOAD') load();
            }}
            style={[styles.tab, activeTab === key && styles.activeTab]}>
            <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>
              {key === 'UPLOAD'   ? T('upload_content')
               : key === 'TASKS' ? T('checklist_tasks_tab')
               :                   T('incident_history')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >
        <MessageBanner />

        {/* ── UPLOAD TAB ── */}
        {activeTab === 'UPLOAD' && (
          <View>
            <View style={styles.langPickerCard}>
              <Text style={styles.langPickerLabel}>{T('upload_lang_label')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {LANGS.map(key => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.langChip, uploadLang === key && styles.langChipActive]}
                      onPress={() => setUploadLang(key)}
                    >
                      <Text style={[styles.langChipText, uploadLang === key && styles.langChipTextActive]}>
                        {key}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.helpText}>{T('upload_lang_note')}</Text>
            </View>

            <UploadCard
              icon="star-four-points-outline" iconColor="#f59e0b"
              title={T('positive_stmt')} placeholder={T('placeholder_statement')}
              value={statement} onChange={setStatement}
              onPress={() => upload('statement')} loading={uploading === 'statement'}
              btnLabel={T('update')}
            />

            <UploadCard
              icon="lightbulb-on-outline" iconColor="#22c55e"
              title={T('safety_tip_lbl')} placeholder={T('placeholder_tip')}
              value={tipText} onChange={setTipText}
              onPress={() => upload('tip')} loading={uploading === 'tip'}
              btnLabel={T('update')}
            />

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="information-outline" size={20} color="#2563eb" />
                <Text style={styles.cardTitle}>{T('dgms_guideline')}</Text>
              </View>
              <TextInput style={styles.input}
                placeholder={T('placeholder_title')} placeholderTextColor="#94a3b8"
                value={guideTitle} onChangeText={setGuideTitle} />
              <View style={{ height: 8 }} />
              <TextInput style={[styles.input, styles.textArea]}
                placeholder={T('placeholder_content')} placeholderTextColor="#94a3b8"
                multiline value={guideContent} onChangeText={setGuideContent} />
              <TouchableOpacity style={[styles.updateBtn, { backgroundColor: '#2563eb' }]}
                onPress={() => upload('guideline')} disabled={uploading === 'guideline'}>
                {uploading === 'guideline'
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.updateBtnText}>{T('update')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── TASKS TAB ── */}
        {activeTab === 'TASKS' && (
          <View>
            {/* Add task card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="clipboard-plus-outline" size={20} color="#2563eb" />
                <Text style={styles.cardTitle}>{T('checklist_task')}</Text>
              </View>

              <Text style={styles.langLabel}>{T('target_role')}:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 6 }}>
                  {JOB_ROLES.map(r => (
                    <TouchableOpacity key={r}
                      style={[styles.langChip, taskRole === r && styles.langChipActive]}
                      onPress={() => setTaskRole(r)}>
                      <Text style={[styles.langChipText, taskRole === r && styles.langChipTextActive]}>
                        {r === 'all' ? 'All Workers' : r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.helpText}>
                {T('checklist_role_note')}
              </Text>

              <TextInput style={[styles.input, styles.textArea]}
                placeholder={T('placeholder_task')} placeholderTextColor="#94a3b8"
                multiline value={taskDesc} onChangeText={setTaskDesc} />
              <TouchableOpacity style={styles.updateBtn}
                onPress={() => upload('task')} disabled={uploading === 'task'}>
                {uploading === 'task'
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.updateBtnText}>{T('add_task')}</Text>}
              </TouchableOpacity>
            </View>

            {/* Task list */}
            <Text style={styles.sectionLabel}>
              {T('existing_tasks')} ({tasks.length})
            </Text>

            {tasks.length === 0 ? (
              <Text style={styles.emptyText}>{T('no_tasks')}</Text>
            ) : (
              tasks.map(t => (
                <View key={t.checklist_id} style={styles.taskRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskText}>{t.task_description}</Text>
                    <Text style={styles.taskMeta}>
                      {t.role_target?.toUpperCase()} • {t.shift_target} • {t.created_by_name}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'HISTORY' && (
          <View>
            <Text style={styles.sectionLabel}>
              {T('incident_history')} ({reports.length})
            </Text>
            {reports.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="clipboard-outline" size={44} color="#cbd5e1" />
                <Text style={styles.emptyText}>{T('no_reports')}</Text>
              </View>
            ) : (
              reports.map(r => {
                const description = String(
                  r.description ?? r.report_description ?? r.desc ?? ''
                ).trim() || '—';

                return (
                <View key={r.report_id} style={[styles.histCard, { borderLeftColor: sevColor(r.severity) }]}> 
                  <View style={styles.histTop}>
                    <Text style={[styles.histSev,    { color: sevColor(r.severity) }]}>{r.severity}</Text>
                    <Text style={[styles.histStatus, {
                      color: r.status === 'RESOLVED' ? '#22c55e' : '#ef4444'
                      }]}>
                      {r.status === 'RESOLVED' ? 'RESOLVED' : 'NOT RESOLVED'}
                    </Text>
                  </View>
                  <Text style={styles.histDesc} numberOfLines={2}>{description}</Text>
                  <Text style={styles.histMeta}>
                    {r.reporter_name} • {r.location} • {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────
const UploadCard = ({ icon, iconColor, title, placeholder, value, onChange, onPress, loading, btnLabel }: any) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <TextInput style={[styles.input, styles.textArea]}
      placeholder={placeholder} placeholderTextColor="#94a3b8"
      multiline value={value} onChangeText={onChange} />
    <TouchableOpacity style={styles.updateBtn} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateBtnText}>{btnLabel}</Text>}
    </TouchableOpacity>
  </View>
);

const StatPill = ({ label, value, color }: any) => (
  <View style={[styles.statPill, { borderLeftColor: color }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:          { flex: 1, backgroundColor: '#f8fafc' },
  header:             { backgroundColor: '#0f172a', padding: 22, paddingTop: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:        { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub:          { color: '#475569', fontSize: 12, marginTop: 2 },
  headerRight:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoutBtn:          { backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, borderRadius: 12 },
  statsBar:           { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  statPill:           { flex: 1, alignItems: 'center', borderLeftWidth: 3, paddingLeft: 4 },
  statValue:          { fontSize: 17, fontWeight: 'bold' },
  statLabel:          { fontSize: 9, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
  tabBar:             { flexDirection: 'row', backgroundColor: '#fff', elevation: 2 },
  tab:                { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab:          { borderBottomWidth: 3, borderBottomColor: '#2563eb' },
  tabText:            { color: '#94a3b8', fontWeight: 'bold', fontSize: 11 },
  activeTabText:      { color: '#2563eb' },
  scroll:             { padding: 16, paddingBottom: 40 },
  langLabel:          { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  langPickerCard:     { backgroundColor: '#f8fafc', borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  langPickerLabel:    { color: '#475569', fontSize: 13, fontWeight: '700' },
  langNote:           { fontSize: 11, color: '#22c55e', fontStyle: 'italic', marginTop: 8 },
  langChip:           { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  langChipActive:     { backgroundColor: '#2563eb' },
  langChipText:       { fontSize: 12, color: '#64748b', fontWeight: '600' },
  langChipTextActive: { color: '#fff' },
  card:               { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, elevation: 2 },
  cardHeader:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardTitle:          { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  input:              { backgroundColor: '#f8fafc', borderRadius: 12, padding: 13, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' },
  textArea:           { minHeight: 80, textAlignVertical: 'top' },
  updateBtn:          { backgroundColor: '#2563eb', marginTop: 12, padding: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  updateBtnText:      { color: '#fff', fontWeight: 'bold' },
  sectionLabel:       { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 1, marginBottom: 12, marginTop: 4 },
  emptyText:          { color: '#94a3b8', textAlign: 'center', marginTop: 20, fontSize: 14 },
  emptyBox:           { alignItems: 'center', paddingTop: 40 },
  taskRow:            { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  taskText:           { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  taskMeta:           { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  helpText:           { fontSize: 12, color: '#475569', marginBottom: 10, lineHeight: 18 },
  deleteBtn:          { padding: 8, backgroundColor: '#fef2f2', borderRadius: 10, minWidth: 38, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  histCard:           { backgroundColor: '#fff', borderRadius: 15, padding: 13, marginBottom: 9, borderLeftWidth: 4, elevation: 1 },
  histTop:            { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  histSev:            { fontSize: 10, fontWeight: 'bold' },
  histStatus:         { fontSize: 10, fontWeight: 'bold' },
  histDesc:           { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  histMeta:           { fontSize: 11, color: '#94a3b8', marginTop: 5 },
  successBox:         { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#22c55e' },
  successText:        { color: '#22c55e', fontSize: 14, fontWeight: '600', flex: 1 },
  errorBox:           { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  errorText:          { color: '#ef4444', fontSize: 14, fontWeight: '600', flex: 1 },
});
