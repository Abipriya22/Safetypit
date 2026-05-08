// frontend/app/report.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { reportAPI } from '../services/api';
import { useLanguage } from '../services/LanguageContext';

// ✅ FIX 4 + 6: Severity keys match translation keys (low/medium/high/critical)
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEV_COLORS: Record<string, string> = {
  LOW:      '#22c55e',
  MEDIUM:   '#f59e0b',
  HIGH:     '#f97316',
  CRITICAL: '#ef4444',
};

export default function ReportScreen() {
  const router = useRouter();
  const { T } = useLanguage();
  const [description, setDescription] = useState('');
  const [location, setLocation]       = useState('');
  const [severity, setSeverity]       = useState('MEDIUM');
  const [loading, setLoading]         = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    description: false,
    location: false,
  });

  const handleSubmit = async () => {
    // Enhanced validation with specific field checks
    const errors = {
      description: !description.trim(),
      location: !location.trim(),
    };
    setValidationErrors(errors);

    const missingFields = [];
    if (errors.description) missingFields.push(T('description'));
    if (errors.location) missingFields.push(T('location'));

    if (missingFields.length > 0) {
      // Visual validation errors are already shown via red borders
      return;
    }

    setLoading(true);
    try {
      const res = await reportAPI.create({
        description: description.trim(),
        location: location.trim(),
        severity,
      });
      if (res.success) {
        // Clear validation errors on success
        setValidationErrors({ description: false, location: false });
        // Show success screen instead of alert
        setShowSuccess(true);
        // Auto-hide success screen after 2 seconds and navigate back
        setTimeout(() => {
          setShowSuccess(false);
          setDescription('');
          setLocation('');
          setSeverity('MEDIUM');
          router.push('/worker' as any);
        }, 2000);
      }
    } catch (err: any) {
      Alert.alert(T('error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{T('report_header')}</Text>
      </View>

      {/* Success Overlay */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-circle" size={80} color="#22c55e" />
            </View>
            <Text style={styles.successTitle}>{T('reported')}</Text>
            <Text style={styles.successSubtitle}>{T('successfully_submitted')}</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>

          <Text style={styles.label}>{T('description')} *</Text>
          <TextInput
            style={[styles.input, styles.textArea, validationErrors.description && styles.inputError]}
            placeholder={T('description')}
            placeholderTextColor="#94a3b8"
            multiline
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (validationErrors.description) {
                setValidationErrors(prev => ({ ...prev, description: false }));
              }
            }}
          />

          <Text style={styles.label}>{T('location')} *</Text>
          <View style={[styles.inputRow, validationErrors.location && styles.inputRowError]}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color="#94a3b8" />
            <TextInput
              style={styles.inputFlex}
              placeholder={T('location')}
              placeholderTextColor="#94a3b8"
              value={location}
              onChangeText={(text) => {
                setLocation(text);
                if (validationErrors.location) {
                  setValidationErrors(prev => ({ ...prev, location: false }));
                }
              }}
            />
          </View>

          <Text style={styles.label}>{T('severity')}</Text>
          {/* ✅ FIX 4: Severity buttons use T(s.toLowerCase()) for translated labels */}
          <View style={styles.sevRow}>
            {SEVERITIES.map(s => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.sevBtn,
                  severity === s && { backgroundColor: SEV_COLORS[s], borderColor: SEV_COLORS[s] }
                ]}
                onPress={() => setSeverity(s)}
              >
                <Text style={[styles.sevText, severity === s && { color: '#fff' }]}>
                  {T(s.toLowerCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.disabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="send" size={18} color="#fff" />
                <Text style={styles.submitText}>{T('submit_report')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomTab}>
        <Tab icon="home-outline"            label={T('tab_home')}      onPress={() => router.push('/worker' as any)} />
        <Tab icon="clipboard-check-outline" label={T('tab_checklist')} onPress={() => router.push('/checklist' as any)} />
        <Tab icon="shield"                  label={T('tab_report')}    active onPress={() => {}} />
        <Tab icon="account-outline"         label={T('tab_profile')}   onPress={() => router.push('/profile' as any)} />
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
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff', gap: 12 },
  backBtn:     { padding: 9, backgroundColor: '#f1f5f9', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  successOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  successCard: { backgroundColor: '#fff', borderRadius: 24, padding: 40, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  successIcon: { marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#22c55e', marginBottom: 8 },
  successSubtitle: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  scroll:      { padding: 18, paddingBottom: 120 },
  card:        { backgroundColor: '#fff', borderRadius: 22, padding: 18, elevation: 2 },
  label:       { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginTop: 16, marginBottom: 8, letterSpacing: 0.5 },
  input:       { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' },
  inputError:  { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  textArea:    { height: 100, textAlignVertical: 'top' },
  inputRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  inputRowError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  inputFlex:   { flex: 1, fontSize: 14, color: '#1e293b' },
  sevRow:      { flexDirection: 'row', gap: 8 },
  sevBtn:      { flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
  sevText:     { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
  submitBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f97316', padding: 16, borderRadius: 16, marginTop: 22, gap: 10 },
  disabled:    { backgroundColor: '#94a3b8' },
  submitText:  { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  bottomTab:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#fff', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: 10 },
  tabItem:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel:    { fontSize: 10, color: '#64748b', marginTop: 3 },
  tabActive:   { color: '#2563eb', fontWeight: 'bold' },
});