// src/theme/index.js — Global design tokens

export const COLORS = {
  primary:       '#00C47A',
  primaryDark:   '#009960',
  primaryDeep:   '#006B42',
  primaryLight:  '#E6FBF3',
  primaryGlow:   'rgba(0,196,122,0.18)',
  accent:        '#FF6B4A',
  accentLight:   '#FFF0EC',
  ink:           '#0F1F17',
  inkMid:        '#2D4A3E',
  inkLight:      '#5C7A6E',
  muted:         '#9BB5AC',
  border:        '#D6EAE2',
  borderLight:   '#EDF5F1',
  surface:       '#FAFCFB',
  white:         '#FFFFFF',
  cream:         '#F5F3EE',
  error:         '#E8404A',
  errorLight:    '#FDECEC',
  warning:       '#F5A623',
  warningLight:  '#FFF6E6',
  info:          '#3B82F6',
  infoLight:     '#EEF4FF',
  available:     '#00C47A',
  picked:        '#F5A623',
  delivered:     '#3B82F6',
  expired:       '#C0CEC9',
};

export const SHADOWS = {
  sm:      { shadowColor:'#0F1F17', shadowOffset:{width:0,height:2},  shadowOpacity:0.06, shadowRadius:6,  elevation:2 },
  md:      { shadowColor:'#0F1F17', shadowOffset:{width:0,height:4},  shadowOpacity:0.10, shadowRadius:12, elevation:5 },
  lg:      { shadowColor:'#0F1F17', shadowOffset:{width:0,height:8},  shadowOpacity:0.14, shadowRadius:20, elevation:10 },
  primary: { shadowColor:'#00C47A', shadowOffset:{width:0,height:6},  shadowOpacity:0.35, shadowRadius:14, elevation:8 },
};

export const RADIUS = { sm:8, md:14, lg:20, xl:28, full:999 };