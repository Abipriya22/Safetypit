// frontend/app/checklist.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { checklistAPI } from '../services/api';
import { useLanguage } from '../services/LanguageContext';

const PRIORITY_COLORS: Record<string, string> = {
  LOW:      '#22c55e',
  MEDIUM:   '#f59e0b',
  HIGH:     '#ef4444',
  CRITICAL: '#ef4444',
};

export default function ChecklistScreen() {
  const router = useRouter();
  const { lang, T } = useLanguage();
  const [tasks, setTasks]           = useState<any[]>([]);
  const [progress, setProgress]     = useState({ completed: 0, total: 0, percentage: 0 });
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling]     = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      // Pass current lang to backend so correct language tasks are fetched
      const res = await checklistAPI.getMyTasks(lang);
      if (res.success) {
        setTasks(res.tasks);
        setProgress(res.progress);
      }
    } catch (err: any) {
      Alert.alert(T('error'), err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang, T]);

  // Reload when language changes
  useEffect(() => { load(); }, [load]);

  const handleToggle = async (task: any) => {
    if (task.is_done) return;
    setToggling(task.checklist_id);

    setTasks(prev => prev.map(t =>
      t.checklist_id === task.checklist_id ? { ...t, is_done: true } : t
    ));
    const newCompleted = progress.completed + 1;
    setProgress(p => ({
      ...p,
      completed: newCompleted,
      percentage: Math.round((newCompleted / p.total) * 100),
    }));

    try {
      await checklistAPI.toggleTask(task.checklist_id);
    } catch {
      setTasks(prev => prev.map(t =>
        t.checklist_id === task.checklist_id ? { ...t, is_done: false } : t
      ));
      setProgress(p => ({
        ...p,
        completed: progress.completed,
        percentage: progress.percentage,
      }));
      Alert.alert(T('error'), T('required'));
    } finally {
      setToggling(null);
    }
  };

  // FIX: Get priority safely - never return 0
  const getPriorityLabel = (task: any): string | null => {
    const raw = task.priority || task.severity;
    if (!raw || raw === '0' || raw === 0) return null;
    const upper = String(raw).toUpperCase();
    const keyMap: Record<string, string> = {
      LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical'
    };
    return keyMap[upper] ?? null;
  };

  const getPriorityColor = (task: any): string => {
    const raw = task.priority || task.severity;
    if (!raw || raw === '0' || raw === 0) return '#f59e0b';
    return PRIORITY_COLORS[String(raw).toUpperCase()] ?? '#f59e0b';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>{T('loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/worker' as any)} style={styles.backBtn}>
          <MaterialCommunityIcons name="home-outline" size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{T('checklist_header')}</Text>
        {progress.percentage === 100 && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneText}>✓ {T('completed_label')}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >
        {/* Progress card */}
        <View style={styles.progressCard}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={30} color="#2563eb" />
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>{T('progress_label')}</Text>
            <Text style={styles.percentText}>
              {progress.percentage}% {T('completed_label')}
            </Text>
            <View style={styles.barBg}>
              <View style={[styles.barFill, {
                width: `${progress.percentage}%` as any,
                backgroundColor: progress.percentage === 100 ? '#22c55e' : '#2563eb',
              }]} />
            </View>
          </View>
          <Text style={styles.taskCount}>
            {progress.completed}/{progress.total}{'\n'}{T('tasks_label')}
          </Text>
        </View>

        {tasks.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="clipboard-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>{T('no_tasks')}</Text>
          </View>
        ) : (
          tasks.map(task => {
            const priorityKey   = getPriorityLabel(task);
            const priorityColor = getPriorityColor(task);

            return (
              <TouchableOpacity
                key={task.checklist_id}
                style={[styles.taskCard, task.is_done && styles.taskCardDone]}
                onPress={() => !task.is_done && handleToggle(task)}
                disabled={toggling === task.checklist_id || task.is_done}
                activeOpacity={task.is_done ? 1 : 0.7}
              >
                <View style={[styles.check, task.is_done && styles.checkDone]}>
                  {toggling === task.checklist_id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : task.is_done
                    ? <MaterialCommunityIcons name="check" size={15} color="#fff" />
                    : null}
                </View>

                <View style={styles.taskBody}>
                  <Text style={[styles.taskText, task.is_done && styles.taskDone]}>
                    {task.task_description}
                  </Text>

                  {/* FIX: only show priority badge if valid, never show "0" */}
                  <View style={styles.taskMeta}>
                    {priorityKey && (
                      <View style={[styles.priorityBadge, {
                        backgroundColor: priorityColor + '22',
                        borderColor: priorityColor
                      }]}>
                        <Text style={[styles.priorityText, { color: priorityColor }]}>
                          {T(priorityKey)}
                        </Text>
                      </View>
                    )}
                    {task.is_done && (
                      <Text style={styles.doneAt}>✓ {T('completed_label')}</Text>
                    )}
                  </View>
                </View>

                {task.is_done && (
                  <MaterialCommunityIcons name="lock-check" size={16} color="#22c55e" style={{ marginTop: 2 }} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.bottomTab}>
        <Tab icon="home-outline"    label={T('tab_home')}      onPress={() => router.push('/worker' as any)} />
        <Tab icon="clipboard-check" label={T('tab_checklist')} active onPress={() => {}} />
        <Tab icon="shield-outline"  label={T('tab_report')}    onPress={() => router.push('/report' as any)} />
        <Tab icon="account-outline" label={T('tab_profile')}   onPress={() => router.push('/profile' as any)} />
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
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:     { flex: 1, backgroundColor: '#f8fafc' },
  header:        { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff', gap: 12 },
  backBtn:       { padding: 9, backgroundColor: '#f1f5f9', borderRadius: 12 },
  headerTitle:   { fontSize: 20, fontWeight: 'bold', color: '#1e293b', flex: 1 },
  doneBadge:     { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  doneText:      { color: '#16a34a', fontWeight: 'bold', fontSize: 11 },
  scroll:        { padding: 18, paddingBottom: 100 },
  progressCard:  { backgroundColor: '#fff', borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20, elevation: 2, gap: 12 },
  iconCircle:    { width: 56, height: 56, borderRadius: 14, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  progressInfo:  { flex: 1 },
  progressLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8' },
  percentText:   { fontSize: 17, fontWeight: 'bold', color: '#1e293b', marginVertical: 4 },
  barBg:         { height: 5, backgroundColor: '#f1f5f9', borderRadius: 3 },
  barFill:       { height: 5, borderRadius: 3 },
  taskCount:     { fontSize: 16, fontWeight: 'bold', color: '#2563eb', textAlign: 'center' },
  empty:         { alignItems: 'center', paddingTop: 60 },
  emptyText:     { color: '#94a3b8', marginTop: 12, fontSize: 15 },
  taskCard:      { backgroundColor: '#fff', borderRadius: 18, padding: 18, flexDirection: 'row', marginBottom: 10, elevation: 1, alignItems: 'flex-start', gap: 14 },
  taskCardDone:  { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  check:         { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkDone:     { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  taskBody:      { flex: 1 },
  taskText:      { fontSize: 14, fontWeight: '600', color: '#334155', lineHeight: 20 },
  taskDone:      { color: '#94a3b8', textDecorationLine: 'line-through' },
  taskMeta:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  priorityText:  { fontSize: 10, fontWeight: 'bold' },
  doneAt:        { fontSize: 11, color: '#22c55e', fontWeight: '500' },
  bottomTab:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#fff', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: 10 },
  tabItem:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel:      { fontSize: 10, color: '#64748b', marginTop: 3 },
  tabActive:     { color: '#2563eb', fontWeight: 'bold' },
});