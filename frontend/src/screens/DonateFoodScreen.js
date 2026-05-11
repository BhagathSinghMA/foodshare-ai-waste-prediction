// src/screens/DonateFoodScreen.js
// Custom date/time picker — zero native dependencies, works on Expo Go

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image, Modal,
  StatusBar, Platform, Animated, KeyboardAvoidingView,
  Dimensions, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOWS, RADIUS } from '../theme';

const { width: W, height: H } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const formatDisplay = (date) =>
  `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}  ·  ${format12h(date)}`;

const format12h = (date) => {
  const h    = date.getHours();
  const m    = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(m)} ${ampm}`;
};

const toISO = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

// Build calendar grid for a given month/year
const buildCalendar = (year, month) => {
  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);
  return cells;
};

// ─────────────────────────────────────────────────────────────
// Custom Date & Time Picker Modal
// ─────────────────────────────────────────────────────────────
function DateTimePickerModal({ visible, initial, onConfirm, onCancel }) {
  const today = new Date();

  const [step,    setStep]    = useState('date'); // 'date' | 'time'
  const [year,    setYear]    = useState(today.getFullYear());
  const [month,   setMonth]   = useState(today.getMonth());
  const [day,     setDay]     = useState(today.getDate());
  const [hour12,  setHour12]  = useState(12);
  const [minute,  setMinute]  = useState(0);
  const [ampm,    setAmpm]    = useState('PM');

  // Slide animation between steps
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const base = initial || (() => {
      const d = new Date(); d.setHours(d.getHours() + 2, 0, 0, 0); return d;
    })();
    setYear(base.getFullYear());
    setMonth(base.getMonth());
    setDay(base.getDate());
    const h = base.getHours();
    setHour12(h % 12 === 0 ? 12 : h % 12);
    setMinute(base.getMinutes());
    setAmpm(h >= 12 ? 'PM' : 'AM');
    setStep('date');
    slideAnim.setValue(0);
  }, [visible]);

  const goToTime = () => {
    Animated.timing(slideAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    setStep('time');
  };

  const goToDate = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    setStep('date');
  };

  const handleConfirm = () => {
    const realHour = ampm === 'AM'
      ? (hour12 === 12 ? 0 : hour12)
      : (hour12 === 12 ? 12 : hour12 + 12);
    const result = new Date(year, month, day, realHour, minute, 0, 0);
    onConfirm(result);
  };

  // Calendar helpers
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setDay(1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setDay(1);
  };

  const cells = buildCalendar(year, month);
  const todayDate = new Date();
  const isPast = (d) => {
    if (!d) return false;
    const cell = new Date(year, month, d);
    cell.setHours(0,0,0,0);
    const t = new Date(); t.setHours(0,0,0,0);
    return cell < t;
  };

  // Spinner row for numbers
  const SpinRow = ({ label, value, min, max, onChange, wrap }) => {
    const dec = () => {
      if (wrap) onChange(value <= min ? max : value - 1);
      else if (value > min) onChange(value - 1);
    };
    const inc = () => {
      if (wrap) onChange(value >= max ? min : value + 1);
      else if (value < max) onChange(value + 1);
    };
    return (
      <View style={sp.spinRow}>
        <Text style={sp.spinLabel}>{label}</Text>
        <View style={sp.spinControls}>
          <TouchableOpacity style={sp.spinBtn} onPress={dec} activeOpacity={0.7}>
            <Ionicons name="chevron-down" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={sp.spinValueBox}>
            <Text style={sp.spinValue}>{pad(value)}</Text>
          </View>
          <TouchableOpacity style={sp.spinBtn} onPress={inc} activeOpacity={0.7}>
            <Ionicons name="chevron-up" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, -W],
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pm.overlay}>
        <View style={pm.sheet}>

          {/* ── Header ── */}
          <View style={pm.header}>
            <TouchableOpacity onPress={onCancel} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={pm.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={pm.stepIndicator}>
              <TouchableOpacity onPress={step === 'time' ? goToDate : undefined}>
                <View style={[pm.stepDot, step === 'date' && pm.stepDotActive]} />
              </TouchableOpacity>
              <View style={[pm.stepDot, step === 'time' && pm.stepDotActive]} />
            </View>
            <TouchableOpacity
              onPress={step === 'date' ? goToTime : handleConfirm}
              hitSlop={{top:8,bottom:8,left:8,right:8}}
            >
              <Text style={pm.doneText}>{step === 'date' ? 'Next ›' : 'Confirm ✓'}</Text>
            </TouchableOpacity>
          </View>

          {/* Step title */}
          <View style={pm.stepTitleRow}>
            <Ionicons
              name={step === 'date' ? 'calendar-outline' : 'time-outline'}
              size={17} color={COLORS.primary}
            />
            <Text style={pm.stepTitle}>
              {step === 'date' ? 'Select Date' : 'Select Time'}
            </Text>
            {step === 'time' && (
              <TouchableOpacity onPress={goToDate} hitSlop={{top:6,bottom:6,left:6,right:6}}>
                <Text style={pm.backText}>‹ Back</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sliding content container */}
          <View style={pm.slideWrap}>
            <Animated.View style={[pm.slideTrack, { transform: [{ translateX }] }]}>

              {/* ── DATE PANEL ── */}
              <View style={[pm.panel, { width: W - 32 }]}>
                {/* Month / Year nav */}
                <View style={pm.monthNav}>
                  <TouchableOpacity style={pm.navBtn} onPress={prevMonth}>
                    <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={pm.monthTitle}>
                    {MONTHS[month]} {year}
                  </Text>
                  <TouchableOpacity style={pm.navBtn} onPress={nextMonth}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {/* Day-of-week header */}
                <View style={pm.weekRow}>
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <Text key={i} style={pm.weekLabel}>{d}</Text>
                  ))}
                </View>

                {/* Calendar grid */}
                <View style={pm.calGrid}>
                  {cells.map((d, i) => {
                    const past     = isPast(d);
                    const selected = d === day;
                    const isToday  = d && new Date(year, month, d).toDateString() === todayDate.toDateString();
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          pm.calCell,
                          selected && pm.calCellSelected,
                          isToday && !selected && pm.calCellToday,
                          past && pm.calCellPast,
                        ]}
                        onPress={() => { if (d && !past) setDay(d); }}
                        disabled={!d || past}
                        activeOpacity={0.75}
                      >
                        {d ? (
                          <Text style={[
                            pm.calCellText,
                            selected && pm.calCellTextSelected,
                            past && pm.calCellTextPast,
                            isToday && !selected && pm.calCellTextToday,
                          ]}>
                            {d}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Selected date chip */}
                {day && (
                  <View style={pm.selectedChip}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                    <Text style={pm.selectedChipText}>
                      {DAYS[new Date(year, month, day).getDay()]}, {day} {MONTHS[month]} {year}
                    </Text>
                    <TouchableOpacity
                      style={pm.nextBtn}
                      onPress={goToTime}
                      activeOpacity={0.85}
                    >
                      <Text style={pm.nextBtnText}>Set Time →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* ── TIME PANEL ── */}
              <View style={[pm.panel, { width: W - 32 }]}>
                <Text style={pm.timeSubtitle}>
                  {day} {MONTHS[month]} {year}
                </Text>

                {/* AM/PM toggle */}
                <View style={pm.ampmRow}>
                  {['AM','PM'].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[pm.ampmBtn, ampm === v && pm.ampmBtnActive]}
                      onPress={() => setAmpm(v)}
                      activeOpacity={0.8}
                    >
                      <Text style={[pm.ampmText, ampm === v && pm.ampmTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Hour + Minute spinners */}
                <View style={pm.spinners}>
                  <SpinRow
                    label="Hour"
                    value={hour12}
                    min={1} max={12}
                    onChange={setHour12}
                    wrap={true}
                  />
                  <View style={pm.spinSeparator}>
                    <Text style={pm.spinSepText}>:</Text>
                  </View>
                  <SpinRow
                    label="Min"
                    value={minute}
                    min={0} max={59}
                    onChange={setMinute}
                    wrap={true}
                  />
                </View>

                {/* Live preview */}
                <View style={pm.timePreview}>
                  <Text style={pm.timePreviewLabel}>Selected time</Text>
                  <Text style={pm.timePreviewValue}>
                    {pad(hour12)}:{pad(minute)} {ampm}
                  </Text>
                </View>
              </View>

            </Animated.View>
          </View>

          {/* Bottom padding for iOS home bar */}
          <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export default function DonateFoodScreen({ navigation }) {
  const { refreshUser } = useAuth();

  const [foodName,     setFoodName]     = useState('');
  const [quantity,     setQuantity]     = useState('');
  const [address,      setAddress]      = useState('');
  const [phone,        setPhone]        = useState('');
  const [deadline,     setDeadline]     = useState('');
  const [deadlineDate, setDeadlineDate] = useState(null);
  const [image,        setImage]        = useState(null);
  const [errors,       setErrors]       = useState({});
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [focusField,   setFocusField]   = useState('');
  const [manualMode,   setManualMode]   = useState(false);
  const [pickerOpen,   setPickerOpen]   = useState(false);

  const quantityRef = useRef(null);
  const addressRef  = useRef(null);
  const phoneRef    = useRef(null);

  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue:1, duration:350, useNativeDriver:true }).start();
  }, []);

  useEffect(() => {
    if (submitted) Animated.spring(successScale, { toValue:1, tension:55, friction:6, useNativeDriver:true }).start();
  }, [submitted]);

  const clearErr   = (f) => setErrors((p) => ({ ...p, [f]: null }));
  const focused    = (f) => focusField === f;
  const inputStyle = (f) => [s.inputWrap, focused(f) && s.inputFocused, errors[f] && s.inputError];

  const confirmDeadline = (date) => {
    setDeadlineDate(date);
    setDeadline(toISO(date));
    clearErr('deadline');
    setPickerOpen(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required','Allow photo library access.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes:ImagePicker.MediaTypeOptions.Images, allowsEditing:true, aspect:[4,3], quality:0.7 });
    if (!r.canceled && r.assets?.[0]) setImage(r.assets[0]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required','Camera access required.'); return; }
    const r = await ImagePicker.launchCameraAsync({ allowsEditing:true, aspect:[4,3], quality:0.7 });
    if (!r.canceled && r.assets?.[0]) setImage(r.assets[0]);
  };

  const validate = () => {
    const e = {};
    if (!foodName.trim()) e.foodName = 'Food name is required';
    if (!quantity.trim()) e.quantity = 'Quantity is required';
    if (!address.trim())  e.address  = 'Pickup address is required';
    if (!phone.trim())    e.phone    = 'Contact number is required';
    if (!deadline.trim()) {
      e.deadline = 'Please select a deadline';
    } else {
      const d = new Date(deadline);
      if (isNaN(d.getTime())) e.deadline = 'Invalid format — use YYYY-MM-DD HH:MM';
      else if (d <= new Date()) e.deadline = 'Deadline must be in the future';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('foodName', foodName.trim());
      fd.append('quantity', quantity.trim());
      fd.append('address',  address.trim());
      fd.append('phone',    phone.trim());
      fd.append('deadline', deadline.trim());
      if (image) {
        const filename = image.uri.split('/').pop();
        const match    = /\.(\w+)$/.exec(filename);
        fd.append('image', { uri:image.uri, name:filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      await api.post('/food', fd, { headers: { 'Content-Type':'multipart/form-data' } });
      await refreshUser();
      setSubmitted(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to post donation.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFoodName(''); setQuantity(''); setAddress(''); setPhone('');
    setDeadline(''); setDeadlineDate(null); setImage(null);
    setErrors({}); setSubmitted(false); setManualMode(false);
    successScale.setValue(0);
  };

  // ── Success ──
  if (submitted) {
    return (
      <View style={s.successRoot}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
        <Animated.View style={[s.successCircle, SHADOWS.primary, { transform:[{scale:successScale}] }]}>
          <Text style={s.successEmoji}>🌱</Text>
        </Animated.View>
        <Animated.View style={{ opacity:successScale, alignItems:'center' }}>
          <Text style={s.successTitle}>Food Posted!</Text>
          <Text style={s.successBody}>Your donation is now visible{'\n'}to volunteers nearby. Thank you!</Text>
          <TouchableOpacity style={[s.btn, SHADOWS.primary]} onPress={resetForm}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={s.btnText}>Donate Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.outlineBtn} onPress={() => navigation.navigate('FoodAvailable')}>
            <Ionicons name="restaurant-outline" size={18} color={COLORS.primary} />
            <Text style={s.outlineBtnText}>View Available Food</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDeep} />

      <View style={s.header}>
        <Text style={s.headerTitle}>Donate Food</Text>
        <Text style={s.headerSub}>Share surplus food with volunteers</Text>
      </View>

      <Animated.ScrollView
        style={{ opacity:fadeAnim, flex:1, backgroundColor:COLORS.cream }}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Upload */}
        <Text style={s.sectionLabel}>FOOD PHOTO (OPTIONAL)</Text>
        {image ? (
          <View style={s.imgPreviewWrap}>
            <Image source={{ uri:image.uri }} style={s.imgPreview} />
            <TouchableOpacity style={s.removeBtn} onPress={() => setImage(null)}>
              <Ionicons name="close-circle" size={28} color={COLORS.error} />
            </TouchableOpacity>
            <View style={s.imgOverlay}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={s.imgOverlayText}>Photo selected</Text>
            </View>
          </View>
        ) : (
          <View style={s.imgPickRow}>
            <TouchableOpacity style={[s.imgPickBtn, SHADOWS.sm]} onPress={pickImage} activeOpacity={0.8}>
              <View style={s.imgPickIcon}><Ionicons name="images-outline" size={24} color={COLORS.primary} /></View>
              <Text style={s.imgPickLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.imgPickBtn, SHADOWS.sm]} onPress={takePhoto} activeOpacity={0.8}>
              <View style={s.imgPickIcon}><Ionicons name="camera-outline" size={24} color={COLORS.primary} /></View>
              <Text style={s.imgPickLabel}>Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Form Card */}
        <View style={[s.formCard, SHADOWS.sm]}>

          {/* Food Name */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>FOOD NAME</Text>
            <View style={inputStyle('foodName')}>
              <Ionicons name="fast-food-outline" size={18} color={focused('foodName') ? COLORS.primary : COLORS.muted} />
              <TextInput
                style={s.input} placeholder="e.g. Rice and Curry" placeholderTextColor={COLORS.muted}
                value={foodName} onChangeText={(v)=>{setFoodName(v);clearErr('foodName');}}
                onFocus={()=>setFocusField('foodName')} onBlur={()=>setFocusField('')}
                autoCapitalize="sentences" autoCorrect={false}
                returnKeyType="next" onSubmitEditing={()=>quantityRef.current?.focus()} blurOnSubmit={false}
              />
            </View>
            {errors.foodName ? <Text style={s.errText}>{errors.foodName}</Text> : null}
          </View>

          {/* Quantity */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>QUANTITY</Text>
            <View style={inputStyle('quantity')}>
              <Ionicons name="layers-outline" size={18} color={focused('quantity') ? COLORS.primary : COLORS.muted} />
              <TextInput
                ref={quantityRef} style={s.input} placeholder="e.g. 10 plates, 5 kg" placeholderTextColor={COLORS.muted}
                value={quantity} onChangeText={(v)=>{setQuantity(v);clearErr('quantity');}}
                onFocus={()=>setFocusField('quantity')} onBlur={()=>setFocusField('')}
                autoCapitalize="none" returnKeyType="next"
                onSubmitEditing={()=>addressRef.current?.focus()} blurOnSubmit={false}
              />
            </View>
            {errors.quantity ? <Text style={s.errText}>{errors.quantity}</Text> : null}
          </View>

          {/* Address */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>PICKUP ADDRESS</Text>
            <View style={[inputStyle('address'), s.inputWrapMulti]}>
              <Ionicons name="location-outline" size={18} color={focused('address') ? COLORS.primary : COLORS.muted} style={{marginTop:2}} />
              <TextInput
                ref={addressRef} style={[s.input, s.inputMulti]} placeholder="Full address for pickup" placeholderTextColor={COLORS.muted}
                value={address} onChangeText={(v)=>{setAddress(v);clearErr('address');}}
                onFocus={()=>setFocusField('address')} onBlur={()=>setFocusField('')}
                autoCapitalize="sentences" multiline numberOfLines={3}
                textAlignVertical="top" blurOnSubmit={true}
                onSubmitEditing={()=>phoneRef.current?.focus()}
              />
            </View>
            {errors.address ? <Text style={s.errText}>{errors.address}</Text> : null}
          </View>

          {/* Phone */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>CONTACT NUMBER</Text>
            <View style={inputStyle('phone')}>
              <Ionicons name="call-outline" size={18} color={focused('phone') ? COLORS.primary : COLORS.muted} />
              <TextInput
                ref={phoneRef} style={s.input} placeholder="+91 98765 43210" placeholderTextColor={COLORS.muted}
                value={phone} onChangeText={(v)=>{setPhone(v);clearErr('phone');}}
                onFocus={()=>setFocusField('phone')} onBlur={()=>setFocusField('')}
                keyboardType="phone-pad" returnKeyType="done"
              />
            </View>
            {errors.phone ? <Text style={s.errText}>{errors.phone}</Text> : null}
          </View>

          {/* Deadline */}
          <View style={s.fieldGroup}>
            <View style={s.deadlineLabelRow}>
              <Text style={s.label}>DEADLINE</Text>
              <TouchableOpacity onPress={() => setManualMode(p => !p)} hitSlop={{top:6,bottom:6,left:6,right:6}}>
                <Text style={s.toggleText}>
                  {manualMode ? '📅 Use Picker' : '⌨️ Type Manually'}
                </Text>
              </TouchableOpacity>
            </View>

            {manualMode ? (
              <>
                <View style={inputStyle('deadline')}>
                  <Ionicons name="calendar-outline" size={18} color={focused('deadline') ? COLORS.primary : COLORS.muted} />
                  <TextInput
                    style={s.input} placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={COLORS.muted}
                    value={deadline}
                    onChangeText={(v) => {
                      setDeadline(v); clearErr('deadline');
                      const d = new Date(v);
                      setDeadlineDate(!isNaN(d.getTime()) ? d : null);
                    }}
                    onFocus={()=>setFocusField('deadline')} onBlur={()=>setFocusField('')}
                    autoCapitalize="none" returnKeyType="done" onSubmitEditing={handleSubmit}
                  />
                </View>
                <Text style={s.hintText}>24-hour · e.g. 2025-06-15 18:00</Text>
              </>
            ) : (
              <TouchableOpacity
                style={[s.pickerBtn, errors.deadline && s.pickerBtnError]}
                onPress={() => setPickerOpen(true)}
                activeOpacity={0.8}
              >
                <View style={s.pickerBtnLeft}>
                  <View style={s.pickerIconWrap}>
                    <Ionicons name="calendar" size={20} color={COLORS.primary} />
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.pickerBtnLabel}>
                      {deadlineDate ? 'Deadline set ✓' : 'Tap to select date & time'}
                    </Text>
                    {deadlineDate
                      ? <Text style={s.pickerBtnValue} numberOfLines={1}>{formatDisplay(deadlineDate)}</Text>
                      : <Text style={s.pickerBtnHint}>Calendar popup · 12-hour clock with AM/PM</Text>
                    }
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            )}

            {errors.deadline ? <Text style={s.errText}>{errors.deadline}</Text> : null}

            {!manualMode && deadlineDate && (
              <TouchableOpacity style={s.clearBtn} onPress={() => { setDeadlineDate(null); setDeadline(''); }}>
                <Ionicons name="close-circle-outline" size={14} color={COLORS.muted} />
                <Text style={s.clearBtnText}>Clear selection</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.btn, SHADOWS.primary, loading && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name="leaf-outline" size={20} color="#fff" /><Text style={s.btnText}>Post Donation</Text></>
          }
        </TouchableOpacity>

        <View style={{ height:80 }} />
      </Animated.ScrollView>

      {/* Custom picker modal */}
      <DateTimePickerModal
        visible={pickerOpen}
        initial={deadlineDate}
        onConfirm={confirmDeadline}
        onCancel={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles — main screen
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex:1, backgroundColor: COLORS.primaryDeep },
  header: { paddingTop: Platform.OS==='ios'?56:44, paddingBottom:20, paddingHorizontal:24, backgroundColor: COLORS.primaryDeep },
  headerTitle: { fontSize:24, fontWeight:'900', color:'#fff', letterSpacing:-0.4 },
  headerSub:   { fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:3 },
  scroll: { paddingHorizontal:20, paddingTop:20, paddingBottom:20 },
  sectionLabel: { fontSize:11, fontWeight:'800', color: COLORS.inkLight, letterSpacing:1, marginBottom:10 },

  imgPreviewWrap: { borderRadius: RADIUS.lg, overflow:'hidden', marginBottom:20 },
  imgPreview: { width:'100%', height:185 },
  removeBtn: { position:'absolute', top:8, right:8, zIndex:1 },
  imgOverlay: { position:'absolute', bottom:0, left:0, right:0, flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'rgba(0,0,0,0.4)', padding:10 },
  imgOverlayText: { color:'#fff', fontSize:13, fontWeight:'600' },
  imgPickRow: { flexDirection:'row', gap:12, marginBottom:20 },
  imgPickBtn: { flex:1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingVertical:18, alignItems:'center', gap:8, borderWidth:1.5, borderColor: COLORS.border, borderStyle:'dashed' },
  imgPickIcon: { width:48, height:48, borderRadius:24, backgroundColor: COLORS.primaryLight, justifyContent:'center', alignItems:'center' },
  imgPickLabel: { fontSize:14, fontWeight:'700', color: COLORS.inkMid },

  formCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding:20, marginBottom:20 },
  fieldGroup: { marginBottom:16 },
  label: { fontSize:11, fontWeight:'700', color: COLORS.inkLight, letterSpacing:0.8, marginBottom:7, textTransform:'uppercase' },
  inputWrap: { flexDirection:'row', alignItems:'center', gap:10, borderWidth:1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal:14, height:52, backgroundColor: COLORS.surface },
  inputWrapMulti: { height:90, alignItems:'flex-start', paddingTop:12, paddingBottom:8 },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  inputError:   { borderColor: COLORS.error,   backgroundColor:'#FFF5F5' },
  input:      { flex:1, fontSize:15, color: COLORS.ink, height:52, paddingVertical:0 },
  inputMulti: { height:undefined, minHeight:66, paddingVertical:0 },
  hintText: { fontSize:11, color: COLORS.muted, marginTop:4, marginLeft:2 },
  errText:  { fontSize:12, color: COLORS.error,  marginTop:5, marginLeft:2 },

  deadlineLabelRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:7 },
  toggleText: { fontSize:12, color: COLORS.primary, fontWeight:'700' },

  pickerBtn: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding:14, backgroundColor: COLORS.surface },
  pickerBtnError: { borderColor: COLORS.error, backgroundColor:'#FFF5F5' },
  pickerBtnLeft: { flexDirection:'row', alignItems:'center', gap:12, flex:1 },
  pickerIconWrap: { width:42, height:42, borderRadius:21, backgroundColor: COLORS.primaryLight, justifyContent:'center', alignItems:'center' },
  pickerBtnLabel: { fontSize:13, fontWeight:'700', color: COLORS.ink },
  pickerBtnValue: { fontSize:13, color: COLORS.primary, fontWeight:'600', marginTop:2 },
  pickerBtnHint:  { fontSize:12, color: COLORS.muted, marginTop:2 },
  clearBtn: { flexDirection:'row', alignItems:'center', gap:4, marginTop:7, marginLeft:2 },
  clearBtnText: { fontSize:12, color: COLORS.muted },

  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height:56, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 , paddingLeft :20,paddingRight:20},
  btnDisabled: { opacity:0.6 },
  btnText: { color:'#fff', fontSize:16, fontWeight:'800' },
  outlineBtn: { borderWidth:2, borderColor: COLORS.primary, borderRadius: RADIUS.md, height:52, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginTop:12,paddingLeft:20,paddingRight:20 },
  outlineBtnText: { color: COLORS.primary, fontSize:15, fontWeight:'700' },

  successRoot: { flex:1, backgroundColor: COLORS.cream, justifyContent:'center', alignItems:'center', paddingHorizontal:32 },
  successCircle: { width:110, height:110, borderRadius:55, backgroundColor: COLORS.primary, justifyContent:'center', alignItems:'center', marginBottom:24 },
  successEmoji: { fontSize:48 },
  successTitle: { fontSize:30, fontWeight:'900', color: COLORS.ink, textAlign:'center', letterSpacing:-0.5 },
  successBody:  { fontSize:15, color: COLORS.inkLight, textAlign:'center', marginTop:8, marginBottom:32, lineHeight:22 },
});

// ─────────────────────────────────────────────────────────────
// Styles — picker modal
// ─────────────────────────────────────────────────────────────
const CELL_SIZE = Math.floor((W - 32 - 32) / 7);

const pm = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius:28, borderTopRightRadius:28, paddingHorizontal:16, paddingTop:8 },

  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:14, paddingHorizontal:4 },
  cancelText: { fontSize:16, color: COLORS.error,   fontWeight:'600', minWidth:70 },
  doneText:   { fontSize:16, color: COLORS.primary, fontWeight:'700', minWidth:70, textAlign:'right' },
  stepIndicator: { flexDirection:'row', gap:6, alignItems:'center' },
  stepDot: { width:8, height:8, borderRadius:4, backgroundColor: COLORS.border },
  stepDotActive: { width:24, backgroundColor: COLORS.primary },

  stepTitleRow: { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:4, paddingBottom:12 },
  stepTitle: { fontSize:17, fontWeight:'800', color: COLORS.ink, flex:1 },
  backText: { fontSize:14, color: COLORS.primary, fontWeight:'600' },

  slideWrap: { overflow:'hidden', height: H * 0.55 },
  slideTrack: { flexDirection:'row' },
  panel: { paddingHorizontal:4 },

  // Calendar
  monthNav: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  navBtn: { width:36, height:36, borderRadius:18, backgroundColor: COLORS.primaryLight, justifyContent:'center', alignItems:'center' },
  monthTitle: { fontSize:16, fontWeight:'800', color: COLORS.ink },
  weekRow: { flexDirection:'row', marginBottom:6 },
  weekLabel: { width: CELL_SIZE, textAlign:'center', fontSize:12, fontWeight:'700', color: COLORS.muted },
  calGrid: { flexDirection:'row', flexWrap:'wrap' },
  calCell: { width: CELL_SIZE, height: CELL_SIZE, justifyContent:'center', alignItems:'center', borderRadius: CELL_SIZE/2, marginBottom:2 },
  calCellSelected: { backgroundColor: COLORS.primary },
  calCellToday: { borderWidth:1.5, borderColor: COLORS.primary },
  calCellPast: { opacity:0.28 },
  calCellText: { fontSize:14, fontWeight:'600', color: COLORS.ink },
  calCellTextSelected: { color:'#fff', fontWeight:'800' },
  calCellTextPast: { color: COLORS.muted },
  calCellTextToday: { color: COLORS.primary, fontWeight:'800' },

  selectedChip: { flexDirection:'row', alignItems:'center', gap:8, marginTop:10, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md, padding:10, flexWrap:'wrap' },
  selectedChipText: { fontSize:13, color: COLORS.primaryDark, fontWeight:'600', flex:1 },
  nextBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal:12, paddingVertical:6 },
  nextBtnText: { fontSize:13, color:'#fff', fontWeight:'700' },

  // Time
  timeSubtitle: { fontSize:14, color: COLORS.inkLight, fontWeight:'600', textAlign:'center', marginBottom:16 },
  ampmRow: { flexDirection:'row', justifyContent:'center', gap:12, marginBottom:20 },
  ampmBtn: { width:80, height:44, borderRadius: RADIUS.full, borderWidth:2, borderColor: COLORS.border, justifyContent:'center', alignItems:'center', backgroundColor: COLORS.surface },
  ampmBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ampmText: { fontSize:16, fontWeight:'800', color: COLORS.muted },
  ampmTextActive: { color:'#fff' },

  spinners: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginBottom:20 },
  spinSeparator: { paddingBottom:20 },
  spinSepText: { fontSize:28, fontWeight:'900', color: COLORS.ink },

  timePreview: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md, padding:14, alignItems:'center' },
  timePreviewLabel: { fontSize:12, color: COLORS.inkLight, fontWeight:'600', marginBottom:4 },
  timePreviewValue: { fontSize:28, fontWeight:'900', color: COLORS.primary },
});

// ─────────────────────────────────────────────────────────────
// Spinner sub-styles
// ─────────────────────────────────────────────────────────────
const sp = StyleSheet.create({
  spinRow: { alignItems:'center', gap:4 },
  spinLabel: { fontSize:11, fontWeight:'700', color: COLORS.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 },
  spinControls: { alignItems:'center', gap:6 },
  spinBtn: { width:48, height:40, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryLight, justifyContent:'center', alignItems:'center' },
  spinValueBox: { width:72, height:56, borderRadius: RADIUS.md, backgroundColor: COLORS.white, justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor: COLORS.border, ...SHADOWS.sm },
  spinValue: { fontSize:26, fontWeight:'900', color: COLORS.ink },
});