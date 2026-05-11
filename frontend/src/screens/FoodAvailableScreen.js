// src/screens/FoodAvailableScreen.js — Redesigned with animations

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, Alert, TextInput,
  StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const STATUS_META = {
  available: { color: COLORS.available, bg: COLORS.primaryLight,  label: 'AVAILABLE' },
  picked:    { color: COLORS.picked,    bg: COLORS.warningLight,   label: 'PICKED UP' },
  delivered: { color: COLORS.delivered, bg: COLORS.infoLight,      label: 'DELIVERED' },
  expired:   { color: COLORS.expired,   bg: '#F0F0F0',             label: 'EXPIRED'   },
};

function timeLeft(deadline) {
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return { text:'Expired', urgent:true };
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return { text:`${Math.floor(h/24)}d left`, urgent:false };
  if (h > 0)  return { text:`${h}h ${m}m left`, urgent: h < 3 };
  return { text:`${m}m left`, urgent:true };
}

// ── Animated food card ──
function FoodCard({ item, onPickup, pickingId, index }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue:1, tension:50, friction:9,
      delay: Math.min(index * 70, 350),
      useNativeDriver:true,
    }).start();
  }, []);

  const meta = STATUS_META[item.status] || STATUS_META.expired;
  const deadline = timeLeft(item.deadline);
  const isExpired = item.status === 'expired';
  const isPicking = pickingId === item._id;

  const ty      = anim.interpolate({ inputRange:[0,1], outputRange:[40,0] });
  const opacity = anim;

  return (
    <Animated.View style={[sFC.card, SHADOWS.md, { opacity, transform:[{translateY:ty}] }, isExpired && sFC.cardDim]}>
      {/* Image */}
      <View style={sFC.imgWrap}>
        {item.imageUrl
          ? <Image source={{ uri: item.imageUrl }} style={sFC.img} resizeMode="cover" />
          : (
            <View style={sFC.imgPlaceholder}>
              <Text style={sFC.imgEmoji}>🍽️</Text>
            </View>
          )
        }
        {/* Status chip */}
        <View style={[sFC.statusChip, { backgroundColor: meta.color }]}>
          <Text style={sFC.statusChipText}>{meta.label}</Text>
        </View>
        {/* Deadline urgency */}
        {deadline.urgent && (
          <View style={sFC.urgentChip}>
            <Ionicons name="time" size={11} color="#fff" />
            <Text style={sFC.urgentText}>{deadline.text}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={sFC.body}>
        <Text style={sFC.foodName} numberOfLines={1}>{item.foodName}</Text>

        <View style={sFC.tagRow}>
          <View style={sFC.tag}>
            <Ionicons name="layers-outline" size={12} color={COLORS.primary} />
            <Text style={sFC.tagText}>{item.quantity}</Text>
          </View>
          {!deadline.urgent && (
            <View style={sFC.tag}>
              <Ionicons name="time-outline" size={12} color={COLORS.warning} />
              <Text style={[sFC.tagText, {color: COLORS.warning}]}>{deadline.text}</Text>
            </View>
          )}
        </View>

        <View style={sFC.metaRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.muted} />
          <Text style={sFC.metaText} numberOfLines={1}>{item.address}</Text>
        </View>
        <View style={sFC.metaRow}>
          <Ionicons name="call-outline" size={14} color={COLORS.muted} />
          <Text style={sFC.metaText}>{item.phone}</Text>
        </View>
        <View style={sFC.metaRow}>
          <Ionicons name="person-outline" size={14} color={COLORS.muted} />
          <Text style={sFC.metaText}>Donor: {item.createdBy?.name || 'Anonymous'}</Text>
        </View>

        {item.status === 'available' && !isExpired && (
          <TouchableOpacity
            style={[sFC.pickupBtn, SHADOWS.primary, isPicking && sFC.pickupBtnDis]}
            onPress={() => onPickup(item._id, item.foodName)}
            disabled={isPicking}
            activeOpacity={0.85}
          >
            {isPicking
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="bicycle" size={16} color="#fff" /><Text style={sFC.pickupBtnText}>Pickup Food</Text></>
            }
          </TouchableOpacity>
        )}

        {item.status === 'picked' && (
          <View style={sFC.pickedBanner}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.warning} />
            <Text style={sFC.pickedBannerText}>In transit · {item.pickedBy?.name}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const sFC = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, marginBottom:16, overflow:'hidden' },
  cardDim: { opacity:0.55 },
  imgWrap: { position:'relative' },
  img: { width:'100%', height:170 },
  imgPlaceholder: { width:'100%', height:120, backgroundColor: COLORS.primaryLight, justifyContent:'center', alignItems:'center' },
  imgEmoji: { fontSize:40 },
  statusChip: {
    position:'absolute', top:10, left:10,
    borderRadius: RADIUS.full, paddingHorizontal:10, paddingVertical:4,
  },
  statusChipText: { fontSize:10, fontWeight:'800', color:'#fff', letterSpacing:0.6 },
  urgentChip: {
    position:'absolute', top:10, right:10,
    flexDirection:'row', alignItems:'center', gap:4,
    backgroundColor: COLORS.error, borderRadius: RADIUS.full,
    paddingHorizontal:9, paddingVertical:4,
  },
  urgentText: { fontSize:10, fontWeight:'800', color:'#fff' },
  body: { padding:16 },
  foodName: { fontSize:18, fontWeight:'900', color: COLORS.ink, marginBottom:10, letterSpacing:-0.3 },
  tagRow: { flexDirection:'row', gap:8, marginBottom:10 },
  tag: {
    flexDirection:'row', alignItems:'center', gap:4,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full,
    paddingHorizontal:10, paddingVertical:5,
  },
  tagText: { fontSize:12, fontWeight:'700', color: COLORS.primaryDark },
  metaRow: { flexDirection:'row', alignItems:'center', gap:6, marginBottom:5 },
  metaText: { fontSize:13, color: COLORS.inkLight, flex:1 },
  pickupBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height:46,
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    gap:8, marginTop:12,
  },
  pickupBtnDis: { opacity:0.6 },
  pickupBtnText: { color:'#fff', fontSize:15, fontWeight:'800' },
  pickedBanner: {
    flexDirection:'row', alignItems:'center', gap:6,
    backgroundColor: COLORS.warningLight, borderRadius: RADIUS.sm,
    padding:10, marginTop:10,
  },
  pickedBannerText: { fontSize:13, color: COLORS.warning, fontWeight:'700' },
});

// ── Filter pill ──
const FilterPill = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[sFP.pill, active && sFP.pillActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[sFP.pillText, active && sFP.pillTextActive]}>{label}</Text>
  </TouchableOpacity>
);
const sFP = StyleSheet.create({
  pill: {
    paddingHorizontal:16, paddingVertical:8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.white, borderWidth:1.5, borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize:13, fontWeight:'700', color: COLORS.inkLight },
  pillTextActive: { color:'#fff' },
});

export default function FoodAvailableScreen() {
  const { refreshUser } = useAuth();
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickingId, setPickingId] = useState(null);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('available');

  const headerAnim = useRef(new Animated.Value(-20)).current;
  const headerOp   = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerAnim, { toValue:0, tension:55, friction:9, useNativeDriver:true }),
      Animated.timing(headerOp, { toValue:1, duration:300, useNativeDriver:true }),
    ]).start();
  }, []);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const q = filter === 'all' ? '' : `?status=${filter}`;
      const res = await api.get(`/food${q}`);
      setPosts(res.data.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load food posts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handlePickup = (id, name) => {
    Alert.alert('Confirm Pickup', `Pick up "${name}" for delivery?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Yes, Pick Up', onPress: async () => {
        setPickingId(id);
        try {
          await api.post(`/food/pick/${id}`);
          await refreshUser();
          Alert.alert('🚴 Picked up!', 'Please deliver as soon as possible.');
          fetchPosts();
        } catch (err) {
          Alert.alert('Error', err.response?.data?.message || 'Failed to pick up.');
        } finally {
          setPickingId(null);
        }
      }},
    ]);
  };

  const filtered = posts.filter(p =>
    p.foodName.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={s.loadingText}>Loading food posts…</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDeep} />

      {/* Header */}
      <Animated.View style={[s.header, { opacity: headerOp, transform:[{translateY: headerAnim}] }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Available Food</Text>
            <Text style={s.headerSub}>{filtered.length} posts near you</Text>
          </View>
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{filtered.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={17} color={COLORS.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search food or address…"
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={s.filterRow}>
          {['available','picked','all'].map(f => (
            <FilterPill key={f} label={f.charAt(0).toUpperCase()+f.slice(1)} active={filter===f} onPress={() => setFilter(f)} />
          ))}
        </View>
      </Animated.View>

      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        renderItem={({ item, index }) => (
          <FoodCard item={item} onPickup={handlePickup} pickingId={pickingId} index={index} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPosts(true)} tintColor={COLORS.primary} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🍽️</Text>
            <Text style={s.emptyTitle}>No food found</Text>
            <Text style={s.emptyBody}>
              {filter === 'available' ? 'Nothing available right now. Check back soon!' : 'No posts in this category.'}
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

  header: { backgroundColor: COLORS.primaryDeep, paddingBottom:16, paddingTop: 52, paddingHorizontal:20 },
  headerTop: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  headerTitle: { fontSize:24, fontWeight:'900', color:'#fff', letterSpacing:-0.4 },
  headerSub: { fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:2 },
  countBadge: {
    backgroundColor:'rgba(255,255,255,0.2)', borderRadius: RADIUS.full,
    paddingHorizontal:12, paddingVertical:6,
  },
  countBadgeText: { color:'#fff', fontSize:14, fontWeight:'800' },

  searchWrap: {
    flexDirection:'row', alignItems:'center', gap:10,
    backgroundColor:'rgba(255,255,255,0.15)', borderRadius: RADIUS.md,
    paddingHorizontal:14, height:44, marginBottom:12,
  },
  searchInput: { flex:1, fontSize:14, color:'#fff', height:44, paddingVertical:0 },

  filterRow: { flexDirection:'row', gap:8 },

  list: { paddingHorizontal:20, paddingTop:16, paddingBottom:30 },

  empty: { alignItems:'center', paddingVertical:60, paddingHorizontal:30 },
  emptyEmoji: { fontSize:52, marginBottom:14 },
  emptyTitle: { fontSize:18, fontWeight:'800', color: COLORS.ink },
  emptyBody: { fontSize:14, color: COLORS.muted, textAlign:'center', marginTop:6, lineHeight:20 },
});