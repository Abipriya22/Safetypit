// frontend/app/login.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authAPI, storage } from '../services/api';
import { useLanguage } from '../services/LanguageContext';
import { Lang } from '../i18n/translations';

const LANGS: Lang[] = ['English', 'Hindi', 'Tamil', 'Telugu', 'Odia'];

export default function Login() {
  const router = useRouter();
  const { lang, setLang, T } = useLanguage();
  const [role, setRole]         = useState<'worker'|'supervisor'|'admin'>('worker');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showLang, setShowLang] = useState(false);

  // ✅ Separate error states for each field
  const [emailError, setEmailError]       = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [errorMsg, setErrorMsg]           = useState<'unregistered_person' | 'invalid_password' | null>(null);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError('');
    setErrorMsg(null);
    if (password !== '') setPassword('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError('');
    setErrorMsg(null);
  };

  const handleRoleChange = (r: 'worker' | 'supervisor' | 'admin') => {
    setRole(r);
    setEmail('');
    setPassword('');
    setEmailError('');
    setPasswordError('');
    setErrorMsg(null);
  };

  const handleLogin = async () => {
    // ✅ Inline validation — no Alert popup
    let hasError = false;

    if (!email.trim()) {
      setEmailError(T('fill_required'));
      hasError = true;
    }
    if (!password.trim()) {
      setPasswordError(T('fill_required'));
      hasError = true;
    }
    if (hasError) return;

    setErrorMsg(null);
    setEmailError('');
    setPasswordError('');
    setLoading(true);

    try {
      const res = await authAPI.login(email.trim().toLowerCase(), password, role);
      if (res.success) {
        const selectedLang = role === 'admin' ? 'English' : lang;
        await setLang(selectedLang as any);
        await storage.saveAuth(res.token, { ...res.user, preferred_lang: selectedLang });
        try { await authAPI.updateLanguage(selectedLang); } catch (_) {}

        if (role === 'worker')          router.replace('/worker' as any);
        else if (role === 'supervisor') router.replace('/supervisor' as any);
        else                            router.replace('/admin' as any);
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg === 'unregistered_person' || msg.includes('unregistered')) {
        setErrorMsg('unregistered_person');
      } else if (msg === 'invalid_password' || msg.includes('password')) {
        setErrorMsg('invalid_password');
      } else {
        setErrorMsg('invalid_password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Language picker */}
      <TouchableOpacity style={styles.langPicker} onPress={() => setShowLang(!showLang)}>
        <MaterialCommunityIcons name="translate" size={16} color="#93c5fd" />
        <Text style={styles.langText}>{lang}</Text>
        <MaterialCommunityIcons name={showLang ? 'chevron-up' : 'chevron-down'} size={16} color="#93c5fd" />
      </TouchableOpacity>

      {showLang && (
        <View style={styles.langDropdown}>
          {LANGS.map(l => (
            <TouchableOpacity key={l} style={styles.langOption}
              onPress={() => { setLang(l); setShowLang(false); }}>
              <Text style={[styles.langOptionText, l === lang && styles.activeLang]}>{l}</Text>
              {l === lang && <MaterialCommunityIcons name="check" size={16} color="#2563eb" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.title}>{T('app_name')}</Text>
      <Text style={styles.subtitle}>{T('app_subtitle')}</Text>

      {/* Role tabs */}
      <View style={styles.roleRow}>
        {(['worker', 'supervisor', 'admin'] as const).map(r => (
          <TouchableOpacity key={r} style={[styles.roleBtn, role === r && styles.roleActive]}
            onPress={() => handleRoleChange(r)}>
            <MaterialCommunityIcons
              name={r === 'worker' ? 'hard-hat' : r === 'supervisor' ? 'account-tie' : 'shield-account'}
              size={18} color={role === r ? '#fff' : '#93c5fd'} />
            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
              {T(`${r}_login`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* API error message (wrong credentials) */}
      {errorMsg && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{T(errorMsg)}</Text>
        </View>
      )}

      {/* Email field */}
      {!!emailError && (
        <View style={styles.fieldErrorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#f97316" />
          <Text style={styles.fieldErrorText}>{emailError}</Text>
        </View>
      )}
      <TextInput
        style={[styles.input, (!!emailError || errorMsg === 'unregistered_person') && styles.inputError]}
        placeholder={T('email_label')}
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={handleEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {/* Password field */}
      {!!passwordError && (
        <View style={styles.fieldErrorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#f97316" />
          <Text style={styles.fieldErrorText}>{passwordError}</Text>
        </View>
      )}
      <TextInput
        style={[styles.input, (!!passwordError || errorMsg === 'invalid_password') && styles.inputError]}
        placeholder={T('password_label')}
        placeholderTextColor="#64748b"
        secureTextEntry
        value={password}
        onChangeText={handlePasswordChange}
      />

      <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>{T('sign_in')}</Text>}
      </TouchableOpacity>

      {/* Demo hint */}
      <View style={styles.hint}>
        <Text style={styles.hintTitle}>Demo Credentials</Text>
        <Text style={styles.hintLine}>Worker     → rajesh@safepit.com / abipriya</Text>
        <Text style={styles.hintLine}>Supervisor → suresh@safepit.com / dharshini</Text>
        <Text style={styles.hintLine}>Admin      → xyz.admin@gmail.com / 1234567</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flexGrow: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
  langPicker:     { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.07)', padding: 8, borderRadius: 10 },
  langText:       { color: '#93c5fd', fontSize: 13, fontWeight: '600' },
  langDropdown:   { backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  langOption:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#334155' },
  langOptionText: { color: '#94a3b8', fontSize: 15 },
  activeLang:     { color: '#fff', fontWeight: 'bold' },
  title:          { fontSize: 36, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  subtitle:       { color: '#64748b', textAlign: 'center', marginBottom: 30, fontSize: 14 },
  roleRow:        { flexDirection: 'row', gap: 8, marginBottom: 24 },
  roleBtn:        { flex: 1, backgroundColor: '#1e293b', padding: 12, borderRadius: 12, alignItems: 'center', gap: 4 },
  roleActive:     { backgroundColor: '#2563eb' },
  roleText:       { color: '#93c5fd', fontSize: 11, fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  // ✅ Field-level error (orange — for empty fields)
  fieldErrorBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldErrorText: { color: '#f97316', fontSize: 12, fontWeight: '600' },
  // ✅ API error (red — for wrong credentials)
  errorBox:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  errorText:      { color: '#ef4444', fontSize: 14, fontWeight: '600', flex: 1 },
  input:          { backgroundColor: '#1e293b', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: 'transparent' },
  inputError:     { borderColor: '#ef4444' },
  btn:            { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  btnText:        { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  hint:           { marginTop: 28, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14 },
  hintTitle:      { color: '#475569', fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  hintLine:       { color: '#334155', fontSize: 11, textAlign: 'center', marginBottom: 3 },
});