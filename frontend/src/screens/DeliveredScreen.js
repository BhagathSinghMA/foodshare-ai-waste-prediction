// src/screens/DeliveredScreen.js — Redesigned

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', {
  day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit',
}) : '—';

// ── Animated Order Card ──
function OrderCard({ item, onDeliver, deliveringId, index }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue:1, tension:50, friction:9,
      delay: Math.min(index * 60, 300),
      useNativeDriver:true,
    }).start();
  }, []);

  const isDelivered = item.status === 'delivered';
  const isDelivering = deliveringId === item._id;
  const ty      = anim.interpolate({ inputRange:[0,1], outputRange:[30,0] });
  const opacity = anim;

  return (
    <Animated.View style={[s.card, SHADOWS.md, { opacity, transform:[{translateY:ty}] }, isDelivered && s.cardDelivered]}>
      {/* Top row */}
      <View style={s.cardTop}>
        <View style={[s.statusIcon, { backgroundColor: isDelivered ? COLORS.primaryLight : COLORS.warningLight }]}>
          <Ionicons
            name={isDelivered ? 'checkmark-circle' : 'bicycle'}
            size={22} color={isDelivered ? COLORS.primary : COLORS.warning}
          />
        </View>
        <View style={s.cardTopText}>
          <Text style={s.foodName} numberOfLines={1}>{item.foodName}</Text>
          <Text style={s.donorText}>Donor: {item.createdBy?.name || '—'}</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: isDelivered ? COLORS.primary : COLORS.warning }]}>
          <Text style={s.statusPillText}>{isDelivered ? 'Done' : 'Active'}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Meta */}
      <View style={s.metaGrid}>
        <View style={s.metaItem}>
          <Ionicons name="layers-outline" size={13} color={COLORS.muted} />
          <Text style={s.metaText}>{item.quantity}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="location-outline" size={13} color={COLORS.muted} />
          <Text style={s.metaText} numberOfLines={1}>{item.address}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="call-outline" size={13} color={COLORS.muted} />
          <Text style={s.metaText}>{item.phone}</Text>
        </View>
        {item.pickedAt && (
          <View style={s.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.muted} />
            <Text style={s.metaText}>Picked: {fmt(item.pickedAt)}</Text>
          </View>
        )}
        {item.deliveredAt && (
          <View style={s.metaItem}>
            <Ionicons name="checkmark-done-outline" size={13} color={COLORS.primary} />
            <Text style={[s.metaText, { color: COLORS.primary, fontWeight:'700' }]}>Delivered: {fmt(item.deliveredAt)}</Text>
          </View>
        )}
      </View>

      {!isDelivered && (
        <TouchableOpacity
          style={[s.deliverBtn, SHADOWS.primary, isDelivering && s.deliverBtnDis]}
          onPress={() => onDeliver(item._id, item.foodName)}
          disabled={isDelivering}
          activeOpacity={0.85}
        >
          {isDelivering
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.deliverBtnText}>Mark as Delivered</Text></>
          }
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function DeliveredScreen() {
  const { user, refreshUser } = useAuth();
  const [picked, setPicked]           = useState([]);
  const [delivered, setDelivered]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [deliveringId, setDeliveringId] = useState(null);
  const [tab, setTab]                 = useState('active');

  const headerAnim = useRef(new Animated.Value(-20)).current;
  const headerOp   = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerAnim, { toValue:0, tension:55, friction:9, useNativeDriver:true }),
      Animated.timing(headerOp, { toValue:1, duration:300, useNativeDriver:true }),
    ]).start();
  }, []);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get('/food/my-orders');
      setPicked(res.data.picked || []);
      setDelivered(res.data.delivered || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchOrders(); }, [fetchOrders]));

  const handleDeliver = (id, name) => {
    Alert.alert('Confirm Delivery', `Mark "${name}" as delivered?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Confirm', onPress: async () => {
        setDeliveringId(id);
        try {
          await api.post(`/food/deliver/${id}`);
          await refreshUser();
          Alert.alert('🌱 Amazing!', 'You helped reduce food waste!');
          fetchOrders();
        } catch (err) {
          Alert.alert('Error', err.response?.data?.message || 'Failed to update.');
        } finally {
          setDeliveringId(null);
        }
      }},
    ]);
  };

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={s.loadingText}>Loading orders…</Text>
    </View>
  );

  const list = tab === 'active' ? picked : delivered;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDeep} />

      <Animated.View style={[s.header, { opacity: headerOp, transform:[{translateY: headerAnim}] }]}>
        <Text style={s.headerTitle}>My Deliveries</Text>
        <Text style={s.headerSub}>Track your impact</Text>

        {/* Stats bar */}
        <View style={[s.statsBar, SHADOWS.md]}>
          <View style={s.statItem}>
            <Text style={s.statVal}>{user?.deliveredCount || 0}</Text>
            <Text style={s.statLbl}>All Time</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: COLORS.warning }]}>{picked.length}</Text>
            <Text style={s.statLbl}>In Transit</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: COLORS.info }]}>{delivered.length}</Text>
            <Text style={s.statLbl}>Completed</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {[
            { key:'active',    label:'Active',    icon:'bicycle-outline',             count: picked.length },
            { key:'completed', label:'Completed', icon:'checkmark-circle-outline',   count: delivered.length },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={t.icon} size={15} color={tab === t.key ? '#fff' : COLORS.muted} />
              <Text style={[s.tabBtnText, tab === t.key && s.tabBtnTextActive]}>
                {t.label} {t.count > 0 ? `(${t.count})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <FlatList
        data={list}
        keyExtractor={item => item._id}
        renderItem={({ item, index }) => (
          <OrderCard item={item} onDeliver={handleDeliver} deliveringId={deliveringId} index={index} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor={COLORS.primary} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>{tab === 'active' ? '🚴' : '✅'}</Text>
            <Text style={s.emptyTitle}>{tab === 'active' ? 'No active pickups' : 'No completions yet'}</Text>
            <Text style={s.emptyBody}>
              {tab === 'active'
                ? 'Go to Available tab and pick up food to deliver!'
                : 'Complete your first delivery to see it here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor: COLORS.cream },
  centered: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor: COLORS.cream, gap:10 },
  loadingText: { color: COLORS.inkLight, fontSize:14 },

  header: { backgroundColor: COLORS.primaryDeep, paddingTop:52, paddingHorizontal:20, paddingBottom:16 },
  headerTitle: { fontSize:24, fontWeight:'900', color:'#fff', letterSpacing:-0.4 },
  headerSub:   { fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:2, marginBottom:16 },

  statsBar: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding:16,
    flexDirection:'row', marginBottom:14,
  },
  statItem: { flex:1, alignItems:'center' },
  statVal:  { fontSize:22, fontWeight:'900', color: COLORS.primary },
  statLbl:  { fontSize:11, color: COLORS.muted, marginTop:2, fontWeight:'600' },
  statDivider: { width:1, backgroundColor: COLORS.borderLight, marginVertical:2 },

  tabRow: { flexDirection:'row', gap:10 },
  tabBtn: {
    flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6,
    height:42, borderRadius: RADIUS.md,
    backgroundColor:'rgba(255,255,255,0.12)', borderWidth:1.5, borderColor:'rgba(255,255,255,0.2)',
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabBtnText: { fontSize:13, fontWeight:'700', color:'rgba(255,255,255,0.6)' },
  tabBtnTextActive: { color:'#fff' },

  list: { paddingHorizontal:20, paddingTop:16, paddingBottom:32 },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding:16, marginBottom:14 },
  cardDelivered: { borderLeftWidth:4, borderLeftColor: COLORS.primary },
  cardTop: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 },
  statusIcon: { width:42, height:42, borderRadius:21, justifyContent:'center', alignItems:'center' },
  cardTopText: { flex:1 },
  foodName: { fontSize:16, fontWeight:'800', color: COLORS.ink, letterSpacing:-0.2 },
  donorText: { fontSize:12, color: COLORS.muted, marginTop:2 },
  statusPill: { borderRadius:20, paddingHorizontal:10, paddingVertical:4 },
  statusPillText: { fontSize:11, fontWeight:'800', color:'#fff' },
  divider: { height:1, backgroundColor: COLORS.borderLight, marginBottom:12 },
  metaGrid: { gap:7, marginBottom:12 },
  metaItem: { flexDirection:'row', alignItems:'center', gap:7 },
  metaText: { fontSize:13, color: COLORS.inkLight, flex:1 },

  deliverBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height:46,
    flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
  },
  deliverBtnDis: { opacity:0.6 },
  deliverBtnText: { color:'#fff', fontSize:14, fontWeight:'800' },

  empty: { alignItems:'center', paddingVertical:60, paddingHorizontal:30 },
  emptyEmoji: { fontSize:52, marginBottom:14 },
  emptyTitle: { fontSize:18, fontWeight:'800', color: COLORS.ink },
  emptyBody: { fontSize:14, color: COLORS.muted, textAlign:'center', marginTop:6, lineHeight:20 },
});