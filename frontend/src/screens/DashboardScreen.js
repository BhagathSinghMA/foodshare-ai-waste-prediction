// src/screens/DashboardScreen.js — Redesigned with animations

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Alert,
  StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const { width: W } = Dimensions.get('window');
const CHART_W = W - 64;

// ── Animated Stat Card ──
function StatCard({ icon, label, value, color, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue:1, tension:55, friction:8, delay, useNativeDriver:true }).start();
  }, []);
  const scale   = anim.interpolate({ inputRange:[0,1], outputRange:[0.7,1] });
  const opacity = anim;
  return (
    <Animated.View style={[sCard.wrap, SHADOWS.sm, { borderLeftColor: color, opacity, transform:[{scale}] }]}>
      <View style={[sCard.iconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={sCard.info}>
        <Text style={sCard.value}>{value ?? '—'}</Text>
        <Text style={sCard.label}>{label}</Text>
      </View>
    </Animated.View>
  );
}
const sCard = StyleSheet.create({
  wrap: {
    width: (W - 52) / 2, backgroundColor: COLORS.white,
    borderRadius: RADIUS.md, padding:14, flexDirection:'row',
    alignItems:'center', gap:10, borderLeftWidth:4,
  },
  iconCircle: { width:38, height:38, borderRadius:19, justifyContent:'center', alignItems:'center' },
  info: { flex:1 },
  value: { fontSize:22, fontWeight:'900', color: COLORS.ink },
  label: { fontSize:11, color: COLORS.inkLight, marginTop:1, fontWeight:'600' },
});

// ── Section Header ──
const SectionHeader = ({ title, icon }) => (
  <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14, marginTop:6 }}>
    <View style={{ width:3, height:18, backgroundColor: COLORS.primary, borderRadius:2 }} />
    <Text style={{ fontSize:15, fontWeight:'800', color: COLORS.ink, letterSpacing:-0.2 }}>{title}</Text>
  </View>
);

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);

  // Page entrance
  const headerAnim = useRef(new Animated.Value(-30)).current;
  const headerOp   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerAnim, { toValue:0, tension:50, friction:9, useNativeDriver:true }),
      Animated.timing(headerOp, { toValue:1, duration:400, useNativeDriver:true }),
    ]).start();
  }, []);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get('/stats');
      setStats(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleLogout = () =>
    Alert.alert('Sign Out', 'Are you sure?', [
      { text:'Cancel', style:'cancel' },
      { text:'Sign Out', style:'destructive', onPress: logout },
    ]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading your dashboard…</Text>
      </View>
    );
  }

  const summary = stats?.summary || {};

  const weeklyLabels = stats?.weeklyChart?.map(d => {
    const dt = new Date(d.date);
    return `${dt.getMonth()+1}/${dt.getDate()}`;
  }) || [];

  const chartConfig = {
    backgroundColor: COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    decimalPlaces: 0,
    color: (op = 1) => `rgba(0,196,122,${op})`,
    labelColor: () => COLORS.inkLight,
    propsForDots: { r:'4', strokeWidth:'2', stroke: COLORS.primaryDark },
    propsForBackgroundLines: { strokeDasharray:'', stroke: COLORS.borderLight, strokeWidth:1 },
  };

  const STATUS_COLOR_MAP = {
    delivered: COLORS.delivered, available: COLORS.available,
    picked: COLORS.picked, expired: COLORS.expired,
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDeep} />

      {/* ── Animated Header ── */}
      <Animated.View style={[s.header, { opacity: headerOp, transform:[{translateY: headerAnim}] }]}>
        <View style={s.headerBg} />
        <View style={s.headerContent}>
          <View>
            <Text style={s.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={s.greetingSub}>Here's today's impact</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchStats(true)} tintColor={COLORS.primary} />}
        contentContainerStyle={s.scroll}
      >
        {/* ── AI Prediction Chip ── */}
        <View style={[s.aiCard, SHADOWS.md]}>
          <View style={s.aiLeft}>
            <View style={s.aiIconWrap}>
              <Ionicons name="analytics" size={18} color={COLORS.primary} />
            </View>
            <View>
              <Text style={s.aiLabel}>AI Waste Prediction · Today</Text>
              <Text style={s.aiDesc}>Estimated units at risk</Text>
            </View>
          </View>
          <View style={s.aiRight}>
            <Text style={s.aiValue}>{summary.predictedWasteToday ?? '—'}</Text>
            <Text style={s.aiUnit}>units</Text>
          </View>
        </View>

        {error && (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={15} color={COLORS.error} />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchStats()}>
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Stats Grid ── */}
        <SectionHeader title="Platform Overview" />
        <View style={s.statsGrid}>
          <StatCard icon="leaf-outline"          label="Donated"           value={summary.totalDonated}              color={COLORS.primary}  delay={0}   />
          <StatCard icon="bicycle-outline"        label="Delivered"         value={summary.totalDelivered}            color={COLORS.info}     delay={80}  />
          <StatCard icon="trash-outline"          label="Wasted Yesterday"  value={summary.foodWastedYesterday}       color={COLORS.error}    delay={160} />
          <StatCard icon="checkmark-done-outline" label="Distributed Yest." value={summary.foodDistributedYesterday} color={COLORS.warning}  delay={240} />
        </View>

        {/* ── Your Contributions ── */}
        <SectionHeader title="Your Contributions" />
        <View style={s.userRow}>
          <View style={[s.userCard, { backgroundColor: COLORS.primaryLight }]}>
            <Text style={s.userCardEmoji}>🍱</Text>
            <Text style={s.userCardVal}>{user?.donatedCount || 0}</Text>
            <Text style={s.userCardLbl}>Posts Donated</Text>
          </View>
          <View style={[s.userCard, { backgroundColor: COLORS.infoLight }]}>
            <Text style={s.userCardEmoji}>🚴</Text>
            <Text style={[s.userCardVal, { color: COLORS.info }]}>{user?.deliveredCount || 0}</Text>
            <Text style={s.userCardLbl}>Deliveries Made</Text>
          </View>
        </View>

        {/* ── Charts ── */}
        {stats?.weeklyChart?.length > 0 && (
          <>
            <SectionHeader title="7-Day Deliveries" />
            <View style={[s.chartCard, SHADOWS.sm]}>
              <LineChart
                data={{
                  labels: weeklyLabels,
                  datasets: [{ data: stats.weeklyChart.map(d => d.foodDelivered || 0), color: () => COLORS.primary, strokeWidth:2 }],
                  legend: ['Food Delivered'],
                }}
                width={CHART_W} height={190}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: RADIUS.md, marginLeft:-8 }}
                withInnerLines={true}
                withOuterLines={false}
              />
            </View>

            <SectionHeader title="7-Day Waste" />
            <View style={[s.chartCard, SHADOWS.sm]}>
              <BarChart
                data={{
                  labels: weeklyLabels,
                  datasets: [{ data: stats.weeklyChart.map(d => d.foodWasted || 0) }],
                }}
                width={CHART_W} height={190}
                chartConfig={{ ...chartConfig, color: (op = 1) => `rgba(232,64,74,${op})` }}
                style={{ borderRadius: RADIUS.md, marginLeft:-8 }}
                showValuesOnTopOfBars
                withInnerLines={true}
                withOuterLines={false}
              />
            </View>
          </>
        )}

        {/* ── Recent Activity ── */}
        {stats?.recentActivity?.length > 0 && (
          <>
            <SectionHeader title="Recent Activity" />
            {stats.recentActivity.map((item, i) => (
              <View key={i} style={[s.activityRow, SHADOWS.sm]}>
                <View style={[s.activityDot, { backgroundColor: STATUS_COLOR_MAP[item.status] || COLORS.muted }]} />
                <View style={s.activityContent}>
                  <Text style={s.activityName}>{item.foodName}</Text>
                  <Text style={s.activityMeta}>by {item.createdBy?.name}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: (STATUS_COLOR_MAP[item.status] || COLORS.muted) + '20' }]}>
                  <Text style={[s.pillText, { color: STATUS_COLOR_MAP[item.status] || COLORS.muted }]}>{item.status}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height:32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor: COLORS.cream },
  centered: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor: COLORS.cream, gap:12 },
  loadingText: { color: COLORS.inkLight, fontSize:14 },

  header: { backgroundColor: COLORS.primaryDeep, paddingBottom:20 },
  headerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.primaryDeep },
  headerContent: {
    flexDirection:'row', justifyContent:'space-between', alignItems:'center',
    paddingHorizontal:24, paddingTop: 52, paddingBottom:20,
  },
  greeting: { fontSize:22, fontWeight:'900', color:'#fff', letterSpacing:-0.3 },
  greetingSub: { fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:2 },
  logoutBtn: {
    width:40, height:40, borderRadius:20,
    backgroundColor:'rgba(255,255,255,0.12)',
    justifyContent:'center', alignItems:'center',
  },

  aiCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    marginHorizontal:20, padding:18,
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    marginBottom:20,
  },
  aiLeft: { flexDirection:'row', alignItems:'center', gap:12 },
  aiIconWrap: {
    width:40, height:40, borderRadius:20,
    backgroundColor: COLORS.primaryLight, justifyContent:'center', alignItems:'center',
  },
  aiLabel: { fontSize:13, fontWeight:'700', color: COLORS.ink },
  aiDesc: { fontSize:12, color: COLORS.muted, marginTop:1 },
  aiRight: { alignItems:'flex-end' },
  aiValue: { fontSize:28, fontWeight:'900', color: COLORS.primary, lineHeight:30 },
  aiUnit: { fontSize:11, color: COLORS.muted, fontWeight:'600' },

  scroll: { paddingHorizontal:20, paddingTop:16, paddingBottom:20 },

  errorBanner: {
    flexDirection:'row', alignItems:'center', gap:8,
    backgroundColor: COLORS.errorLight, borderRadius: RADIUS.md,
    padding:12, marginBottom:16, borderWidth:1, borderColor: COLORS.error + '40',
  },
  errorText: { flex:1, color: COLORS.error, fontSize:13 },
  retryText: { color: COLORS.error, fontWeight:'800', fontSize:13 },

  statsGrid: { flexDirection:'row', flexWrap:'wrap', gap:12, marginBottom:24 },

  userRow: { flexDirection:'row', gap:12, marginBottom:24 },
  userCard: {
    flex:1, borderRadius: RADIUS.lg, padding:18, alignItems:'center', gap:4,
    ...SHADOWS.sm,
  },
  userCardEmoji: { fontSize:28 },
  userCardVal: { fontSize:30, fontWeight:'900', color: COLORS.primaryDark },
  userCardLbl: { fontSize:12, color: COLORS.inkLight, fontWeight:'600' },

  chartCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding:16, marginBottom:24, overflow:'hidden',
  },

  activityRow: {
    flexDirection:'row', alignItems:'center', gap:12,
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding:14, marginBottom:8,
  },
  activityDot: { width:10, height:10, borderRadius:5 },
  activityContent: { flex:1 },
  activityName: { fontSize:14, fontWeight:'700', color: COLORS.ink },
  activityMeta: { fontSize:12, color: COLORS.muted, marginTop:1 },
  pill: { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  pillText: { fontSize:11, fontWeight:'800' },
});