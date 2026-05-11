// src/screens/LoginScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, StatusBar,
  Platform, Animated, Dimensions, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const { width: W } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});
  const [focusField, setFocusField] = useState('');

  const passwordRef = useRef(null);

  // Animate logo only — card just fades, no translate
  const logoAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blobAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(blobAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    Animated.stagger(100, [
      Animated.spring(logoAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const blobY     = blobAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const logoScale = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const clearErr = (f) => setErrors((p) => ({ ...p, [f]: null }));
  const focused  = (f) => focusField === f;

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Sign In Failed', err.response?.data?.message || 'Invalid credentials.');
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

      {/* Decorative blobs — behind everything */}
      <View style={s.blobContainer} pointerEvents="none">
        <Animated.View style={[s.blob1, { transform: [{ translateY: blobY }] }]} />
        <Animated.View style={[s.blob2, { transform: [{ translateY: blobY }] }]} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Animated.View style={[s.logoSection, { opacity: logoAnim, transform: [{ scale: logoScale }] }]}>
          <View style={s.logoRing}>
            <View style={s.logoInner}>
              <Text style={s.logoEmoji}>🌱</Text>
            </View>
          </View>
          <Text style={s.appName}>FoodShare</Text>
          <Text style={s.tagline}>Reduce waste · Feed communities</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[s.card, SHADOWS.lg, { opacity: fadeAnim }]}>
          <Text style={s.cardTitle}>Welcome back</Text>
          <Text style={s.cardSub}>Sign in to continue your impact</Text>

          {/* Email */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>EMAIL</Text>
            <View style={[s.inputWrap, focused('email') && s.inputFocused, errors.email && s.inputError]}>
              <Ionicons name="mail-outline" size={18} color={focused('email') ? COLORS.primary : COLORS.muted} />
              <TextInput
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
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errors.email ? <Text style={s.errText}>{errors.email}</Text> : null}
          </View>

          {/* Password */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>PASSWORD</Text>
            <View style={[s.inputWrap, focused('password') && s.inputFocused, errors.password && s.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color={focused('password') ? COLORS.primary : COLORS.muted} />
              <TextInput
                ref={passwordRef}
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.muted}
                value={password}
                onChangeText={(v) => { setPassword(v); clearErr('password'); }}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField('')}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPw((p) => !p)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={s.errText}>{errors.password}</Text> : null}
          </View>

          {/* Sign in */}
          <TouchableOpacity
            style={[s.btn, SHADOWS.primary, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={s.btnText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.divRow}>
            <View style={s.divLine} />
            <Text style={s.divText}>or</Text>
            <View style={s.divLine} />
          </View>

          <TouchableOpacity
            style={s.outlineBtn}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
            <Text style={s.outlineBtnText}>Create New Account</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={s.footer}>Together we can eliminate food waste 🌍</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primaryDeep },

  blobContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob1: {
    position: 'absolute', width: W * 1.1, height: W * 1.1,
    borderRadius: W * 0.55, backgroundColor: COLORS.primaryDark,
    top: -W * 0.55, left: -W * 0.05, opacity: 0.7,
  },
  blob2: {
    position: 'absolute', width: W * 0.65, height: W * 0.65,
    borderRadius: W * 0.325, backgroundColor: COLORS.primary,
    top: -W * 0.1, right: -W * 0.15, opacity: 0.2,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    // Large bottom padding so password field is never hidden by keyboard
    paddingBottom: 120,
    justifyContent: 'center',
  },

  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  logoInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoEmoji: { fontSize: 32 },
  appName:   { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  tagline:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 5, letterSpacing: 0.4 },

  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    padding: 26, marginBottom: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: COLORS.ink, marginBottom: 4 },
  cardSub:   { fontSize: 14, color: COLORS.inkLight, marginBottom: 24 },

  fieldGroup: { marginBottom: 18 },
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
  input: { flex: 1, fontSize: 15, color: COLORS.ink, height: 52, paddingVertical: 0 },
  errText: { fontSize: 12, color: COLORS.error, marginTop: 5, marginLeft: 2 },

  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  divText: { marginHorizontal: 14, color: COLORS.muted, fontSize: 13 },

  outlineBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md,
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  outlineBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
});