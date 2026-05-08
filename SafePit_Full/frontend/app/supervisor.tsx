// frontend/app/supervisor.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { storage, sosAPI, reportAPI, checklistAPI, contentAPI } from '../services/api';
import { translate } from '../i18n/translations';
import { useLanguage } from '../services/LanguageContext';
import io from 'socket.io-client';

export default function SupervisorDashboard() {
  const router = useRouter();
  const { lang, T } = useLanguage();
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [stats, setStats]         = useState({ active_workers: 0, open_reports: 0, active_sos: 0, total_incidents: 0 });
  const [workers, setWorkers]     = useState<any[]>([]);
  const [alerts, setAlerts]       = useState<any[]>([]);
  const [reports, setReports]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsRes, workersRes, alertsRes, reportsRes] = await Promise.all([
        contentAPI.getStats(),
        checklistAPI.getWorkersProgress(lang),
        sosAPI.getAlerts(),
        reportAPI.getAll(lang),
      ]);
 
      if (statsRes.success)   setStats(statsRes.stats);
      if (workersRes.success) setWorkers(workersRes.workers);
      if (alertsRes.success)  setAlerts(alertsRes.alerts);
      if (reportsRes.success) {
        console.log('REPORTS DATA:', JSON.stringify(reportsRes.reports[0]));
        setReports(reportsRes.reports.slice(0, 30));
      } else {
        console.log('REPORTS FAILED:', JSON.stringify(reportsRes));
      }
    } catch (err: any) {
      console.log('Supervisor load ERROR:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang]);
 

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let socket: any = null;

    const connectSocket = async () => {
      try {
        const SOCKET_URL = 'http://10.0.2.2:5000';
        socket = io(SOCKET_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
          console.log('✅ Socket connected:', socket.id);
          socket.emit('join_room', 'supervisor');
        });

        socket.on('connect_error', (err: any) => {
          console.log('❌ Socket error:', err.message);
        });

        socket.on('sos_alert', (data: any) => {
          load();
          Alert.alert(
            '🚨 EMERGENCY SOS',
            `${data.worker_name} needs help!\nLocation: ${data.location}`,
            [{ text: 'View Alerts', onPress: () => setActiveTab('ALERTS') }]
          );
        });

        socket.on('sos_acknowledged', () => { load(); });

      } catch (err) {
        console.log('Socket connection failed:', err);
      }
    };

    connectSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const handleAcknowledge = async (sosId: number) => {
    try {
      await sosAPI.acknowledge(sosId);
      Alert.alert('✅', T('acknowledge'));
      load();
    } catch (err: any) {
      Alert.alert(T('error'), err.message);
    }
  };

  const handleResolveReport = async (reportId: number) => {
  const confirmed = window.confirm('Mark this hazard report as Resolved?');
  if (!confirmed) return;

  try {
    await reportAPI.updateStatus(reportId, 'RESOLVED');
    window.alert('✅ Report status changed to "Resolved".');
    load();
  } catch (err: any) {
    window.alert(`Error: ${err.message}`);
  }
};

  const handleLogout = async () => {
    await storage.clear();
    router.replace('/login' as any);
  };

  const activeSOSCount = alerts.filter(a => a.status === 'ACTIVE').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{T('loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{T('sup_dashboard')}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => router.push('/supervisor_profile' as any)}>
              <MaterialCommunityIcons name="account-circle-outline" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={22} color="#f87171" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabs}>
          {(['OVERVIEW', 'WORKERS', 'ALERTS', 'REPORTS'] as const).map(key => (
            <TouchableOpacity key={key} onPress={() => setActiveTab(key)}
              style={[styles.tab, activeTab === key && styles.activeTab]}>
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>
                  {key === 'OVERVIEW' ? T('overview')
                    : key === 'WORKERS' ? T('workers')
                    : key === 'ALERTS'  ? T('alerts')
                    : T('reports')}
                </Text>
                {key === 'ALERTS' && activeSOSCount > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{activeSOSCount}</Text></View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <View>
            {activeSOSCount > 0 && (
              <View style={styles.sosBanner}>
                <View style={styles.sosIconCircle}>
                  <MaterialCommunityIcons name="bell-outline" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.sosBannerTitle}>{T('emergency_sos_active')}</Text>
                  <Text style={styles.sosBannerSub}>
                    {activeSOSCount} {activeSOSCount > 1 ? T('need_immediate_help') : T('needs_immediate_help')}
                  </Text>
                </View>
                <TouchableOpacity style={styles.viewBtn} onPress={() => setActiveTab('ALERTS')}>
                  <Text style={styles.viewBtnText}>{T('view')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.grid}>
              <StatCard icon="account-outline"        color="#3b82f6" value={stats.active_workers}  label={T('workers')}            dot="#22c55e" />
              <StatCard icon="clipboard-text-outline" color="#f97316" value={stats.open_reports}    label={T('open_reports_label')} dot="#f59e0b" />
              <StatCard icon="bell-outline"           color="#ef4444" value={stats.active_sos}      label={T('sos')}                dot={stats.active_sos > 0 ? '#ef4444' : '#22c55e'} />
              <StatCard icon="file-document-outline"  color="#22c55e" value={stats.total_incidents} label={T('incidents')}          dot="#64748b" />
            </View>

            {reports.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>{T('recent_hazard_reports')}</Text>
                {reports.slice(0, 3).map(r => (
                  <ReportCard key={r.report_id} report={r} onResolve={() => handleResolveReport(r.report_id)} lang={lang} />
                ))}
                <TouchableOpacity onPress={() => setActiveTab('REPORTS')} style={styles.viewAllBtn}>
                  <Text style={styles.viewAllText}>{T('view_all_reports')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* WORKERS */}
        {activeTab === 'WORKERS' && (
          <View>
            <Text style={styles.sectionLabel}>{T('workers')} ({workers.length})</Text>
            {workers.length === 0
              ? <Text style={styles.emptyText}>{T('no_workers')}</Text>
              : workers.map(w => <WorkerCard key={w.user_id} worker={w} />)
            }
          </View>
        )}

        {/* ALERTS */}
        {activeTab === 'ALERTS' && (
          <View>
            <Text style={styles.sectionLabel}>{T('alerts')} ({alerts.length})</Text>
            {alerts.length === 0 ? (
              <View style={styles.allClear}>
                <MaterialCommunityIcons name="shield-check-outline" size={56} color="#22c55e" />
                <Text style={styles.allClearText}>{T('all_clear_no_active_alerts')}</Text>
              </View>
            ) : (
              alerts.map(a => (
                <AlertCard key={a.sos_id} alert={a} onAcknowledge={() => handleAcknowledge(a.sos_id)} T={T} />
              ))
            )}
          </View>
        )}

        {/* REPORTS */}
        {activeTab === 'REPORTS' && (
          <View>
            <Text style={styles.sectionLabel}>{T('hazard_reports')} ({reports.length})</Text>
            {reports.length === 0 ? (
              <View style={styles.allClear}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={56} color="#22c55e" />
                <Text style={styles.allClearText}>{T('no_hazard_reports')}</Text>
              </View>
            ) : (
              reports.map(r => (
                <ReportCard key={r.report_id} report={r} onResolve={() => handleResolveReport(r.report_id)} lang={lang} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

const StatCard = ({ icon, color, value, label, dot }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const WorkerCard = ({ worker }: any) => {
  const { lang } = useLanguage();
  const pct = worker.percentage || 0;
  const color = pct === 100 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#ef4444';
  return (
    <View style={styles.workerCard}>
      <View style={styles.workerTop}>
        <View style={styles.workerAvatar}>
          <MaterialCommunityIcons name="account" size={22} color="#64748b" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.workerName}>{worker.name}</Text>
          <Text style={styles.workerMeta}>
            {worker.job_role
              ? translate(lang, `job_${worker.job_role.toLowerCase()}`)
              : translate(lang, 'job_worker')}
          </Text>
        </View>
        <View style={[styles.taskBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.taskBadgeText, { color }]}>
            {worker.completed}/{worker.total}
          </Text>
        </View>
      </View>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.workerPct}>{pct}% complete</Text>
    </View>
  );
};

// ✅ FIXED ReportCard — safely handles null/undefined fields
const ReportCard = ({ report, onResolve, lang }: any) => {
  const sevColors: Record<string, string> = {
    LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444'
  };
  const severity     = report.severity || 'MEDIUM';
  const c            = sevColors[severity] || '#64748b';
  const description  = String(
      report.description ?? report.report_description ?? report.desc ?? ''
    ).trim() || '—';
  const reporterName = report.reporter_name || report.worker_name || report.name || '';
  const location     = report.location || '';
  const metaParts    = [reporterName, location].filter(Boolean);

  return (
    <View style={[styles.reportCard, { borderLeftColor: c }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.reportSev, { color: c }]}>
          {['LOW','MEDIUM','HIGH','CRITICAL'].includes(severity)
            ? translate(lang, severity.toLowerCase())
            : severity}
        </Text>
        <Text style={[styles.reportStatus, { color: report.status === 'RESOLVED' ? '#22c55e' : '#ef4444' }]}>
          {report.status === 'RESOLVED' ? translate(lang, 'resolved') : translate(lang, 'not_resolved')}
        </Text>
      </View>

      {/* ✅ Description always shows */}
      <Text style={styles.reportDesc} numberOfLines={2}>{description}</Text>

      {/* ✅ Meta: only shows if reporter or location exists */}
      {metaParts.length > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.reportMeta}>{metaParts.join(' • ')}</Text>
          {report.status !== 'RESOLVED' && (
            <TouchableOpacity style={styles.resolveBtn} onPress={onResolve}>
              <Text style={styles.resolveBtnText}>{translate(lang, 'resolve')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ✅ Resolve button shows even if no meta */}
      {metaParts.length === 0 && report.status !== 'RESOLVED' && (
        <TouchableOpacity style={[styles.resolveBtn, { alignSelf: 'flex-end', marginTop: 8 }]} onPress={onResolve}>
          <Text style={styles.resolveBtnText}>{translate(lang, 'resolve')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const AlertCard = ({ alert, onAcknowledge, T }: any) => {
  const isActive = alert.status === 'ACTIVE';
  const mins = Math.floor((Date.now() - new Date(alert.alert_time).getTime()) / 60000);
  return (
    <View style={[styles.alertCard, !isActive && styles.resolvedAlertCard]}>
      <View style={styles.alertTop}>
        <View style={[styles.alertIcon, { backgroundColor: isActive ? '#fef2f2' : '#f0fdf4' }]}>
          <MaterialCommunityIcons
            name={isActive ? 'alert' : 'check-circle'}
            size={22} color={isActive ? '#ef4444' : '#22c55e'} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.alertName}>{alert.worker_name}</Text>
          <Text style={styles.alertSub}>{T('job_worker')}</Text>
        </View>
        <Text style={styles.alertTime}>
          {mins < 60 ? `${mins}${T('minutes_ago')}` : `${Math.floor(mins / 60)}${T('hours_ago')}`}
        </Text>
      </View>
      <View style={styles.alertLocation}>
        <MaterialCommunityIcons name="map-marker-outline" size={14} color="#94a3b8" />
        <Text style={styles.alertLocationText}>{alert.location || T('unknown_location')}</Text>
      </View>
      {isActive ? (
        <TouchableOpacity style={styles.ackBtnFull} onPress={onAcknowledge}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
          <Text style={styles.ackText}>{T('acknowledge')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.resolvedRow}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#22c55e" />
          <Text style={styles.resolvedText}>{T('resolved')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText:       { marginTop: 12, color: '#64748b' },
  container:         { flex: 1, backgroundColor: '#f8fafc' },
  header:            { backgroundColor: '#0f172a', paddingTop: 55, paddingHorizontal: 20 },
  headerTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle:       { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerIcons:       { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoutBtn:         { backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, borderRadius: 12 },
  tabs:              { flexDirection: 'row' },
  tab:               { marginRight: 18, paddingBottom: 12 },
  activeTab:         { borderBottomWidth: 3, borderBottomColor: '#3b82f6' },
  tabContent:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText:           { color: '#475569', fontWeight: 'bold', fontSize: 12 },
  activeTabText:     { color: '#fff' },
  badge:             { backgroundColor: '#ef4444', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText:         { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  scroll:            { padding: 18, paddingBottom: 40 },
  sectionLabel:      { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 1, marginBottom: 14 },
  emptyText:         { color: '#94a3b8', textAlign: 'center', marginTop: 40, fontSize: 15 },
  sosBanner:         { backgroundColor: '#ef4444', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sosIconCircle:     { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 30 },
  sosBannerTitle:    { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  sosBannerSub:      { color: '#fecaca', fontSize: 11, marginTop: 2 },
  viewBtn:           { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  viewBtnText:       { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  viewAllBtn:        { alignItems: 'center', marginTop: 8, padding: 10 },
  viewAllText:       { color: '#3b82f6', fontWeight: 'bold', fontSize: 13 },
  grid:              { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard:          { backgroundColor: '#fff', width: '47%', borderRadius: 20, padding: 16, elevation: 2 },
  statIcon:          { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue:         { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  statLabel:         { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', marginTop: 4 },
  dot:               { width: 7, height: 7, borderRadius: 4 },
  workerCard:        { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 10, elevation: 2 },
  workerTop:         { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  workerAvatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  workerName:        { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  workerMeta:        { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  taskBadge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  taskBadgeText:     { fontSize: 12, fontWeight: 'bold' },
  progressBg:        { height: 5, backgroundColor: '#f1f5f9', borderRadius: 3 },
  progressFill:      { height: 5, borderRadius: 3 },
  workerPct:         { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '600' },
  reportCard:        { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderLeftWidth: 4, elevation: 1 },
  reportSev:         { fontSize: 10, fontWeight: 'bold' },
  reportStatus:      { fontSize: 10, fontWeight: 'bold' },
  reportDesc:        { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 4 },
  reportMeta:        { fontSize: 11, color: '#94a3b8' },
  resolveBtn:        { backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  resolveBtnText:    { color: '#16a34a', fontWeight: 'bold', fontSize: 11 },
  alertCard:         { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 12, elevation: 3, borderWidth: 1, borderColor: '#fee2e2' },
  resolvedAlertCard: { borderColor: '#f1f5f9', elevation: 1 },
  alertTop:          { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  alertIcon:         { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  alertName:         { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  alertSub:          { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  alertTime:         { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  alertLocation:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, marginBottom: 12, gap: 6 },
  alertLocationText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  ackBtnFull:        { backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  ackText:           { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  resolvedRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4', padding: 10, borderRadius: 12, gap: 6 },
  resolvedText:      { color: '#22c55e', fontWeight: 'bold', fontSize: 13 },
  allClear:          { alignItems: 'center', paddingTop: 50 },
  allClearText:      { color: '#64748b', fontSize: 16, marginTop: 14 },
});