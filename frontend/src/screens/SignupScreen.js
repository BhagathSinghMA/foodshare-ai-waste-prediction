// src/screens/SignupScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, StatusBar,
  Platform, Animated, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOWS, RADIUS } from '../theme';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();

  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [errors,          setErrors]          = useState({});
  const [focusField,      setFocusField]      = useState('');

  const emailRef   = useRef(null);
  const pwRef      = useRef(null);
  const confirmRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const clearErr = (f) => setErrors((p) => ({ ...p, [f]: null }));
  const focused  = (f) => focusField === f;
  const inputWrapStyle = (f) => [
    s.inputWrap,
    focused(f) && s.inputFocused,
    errors[f]  && s.inputError,
  ];

  const validate = () => {
    const e = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'At least 2 characters required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signup(name.trim(), email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDeep} />

      {/* Fixed green header */}
      <View style={s.headerStrip}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <View style={s.logoRing}>
            <Text style={s.logoEmoji}>🍱</Text>
          </View>
          <Text style={s.headerTitle}>Join FoodShare</Text>
          <Text style={s.headerSub}>Make an impact, one meal at a time</Text>
        </View>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, flex: 1, backgroundColor: COLORS.cream }}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.card, SHADOWS.lg]}>
          <Text style={s.cardTitle}>Create Account</Text>

          {/* Full Name */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>FULL NAME</Text>
            <View style={inputWrapStyle('name')}>
              <Ionicons name="person-outline" size={18} color={focused('name') ? COLORS.primary : COLORS.muted} />
              <TextInput
                style={s.input}
                placeholder="John Doe"
                placeholderTextColor={COLORS.muted}
                value={name}
                onChangeText={(v) => { setName(v); clearErr('name'); }}
                onFocus={() => setFocusField('name')}
                onBlur={() => setFocusField('')}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errors.name ? <Text style={s.errText}>{errors.name}</Text> : null}
          </View>

          {/* Email */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>EMAIL</Text>
            <View style={inputWrapStyle('email')}>
              <Ionicons name="mail-outline" size={18} color={focused('email') ? COLORS.primary : COLORS.muted} />
              <TextInput
                ref={emailRef}
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.muted}
                value={email}
                onChangeText={(v) => { setEmail(v); clearErr('email'); }}
                onFocus={() => setFocusField('email')}
                onBlur={() => setFocusField('')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errors.email ? <Text style={s.errText}>{errors.email}</Text> : null}
          </View>

          {/* Password */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>PASSWORD</Text>
            <View style={inputWrapStyle('password')}>
              <Ionicons name="lock-closed-outline" size={18} color={focused('password') ? COLORS.primary : COLORS.muted} />
              <TextInput
                ref={pwRef}
                style={s.input}
                placeholder="Minimum 6 characters"
                placeholderTextColor={COLORS.muted}
                value={password}
                onChangeText={(v) => { setPassword(v); clearErr('password'); }}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField('')}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TouchableOpacity onPress={() => setShowPw((p) => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={s.errText}>{errors.password}</Text> : null}
          </View>

          {/* Confirm Password */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>CONFIRM PASSWORD</Text>
            <View style={inputWrapStyle('confirmPassword')}>
              <Ionicons name="shield-checkmark-outline" size={18} color={focused('confirmPassword') ? COLORS.primary : COLORS.muted} />
              <TextInput
                ref={confirmRef}
                style={s.input}
                placeholder="Re-enter your password"
                placeholderTextColor={COLORS.muted}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearErr('confirmPassword'); }}
                onFocus={() => setFocusField('confirmPassword')}
                onBlur={() => setFocusField('')}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
            </View>
            {errors.confirmPassword ? <Text style={s.errText}>{errors.confirmPassword}</Text> : null}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, SHADOWS.primary, loading && s.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color="#fff" />
                <Text style={s.btnText}>Create Account</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={s.loginLinkText}>
              Already have an account?{' '}
              <Text style={s.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Extra space so last field clears the keyboard */}
        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primaryDeep },

  headerStrip: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: COLORS.primaryDeep,
  },
  backBtn:       { marginBottom: 16, width: 36, height: 36, justifyContent: 'center' },
  headerContent: { alignItems: 'center' },
  logoRing: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  logoEmoji:   { fontSize: 30 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 24 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.ink, marginBottom: 20 },

  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 11, fontWeight: '700', color: COLORS.inkLight,
    marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: 14,
    height: 52, backgroundColor: COLORS.surface,
  },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  inputError:   { borderColor: COLORS.error,   backgroundColor: '#FFF5F5' },
  input:        { flex: 1, fontSize: 15, color: COLORS.ink, height: 52, paddingVertical: 0 },
  errText:      { fontSize: 12, color: COLORS.error, marginTop: 5, marginLeft: 2 },

  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },

  loginLink:      { alignItems: 'center', marginTop: 20, paddingVertical: 4 },
  loginLinkText:  { fontSize: 14, color: COLORS.muted },
  loginLinkBold:  { color: COLORS.primary, fontWeight: '700' },
});