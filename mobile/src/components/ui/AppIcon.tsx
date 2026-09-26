/**
 * AppIcon — Emoji & Visual Symbol Component
 * Canonical Reference: Restores vibrant, expressive native emojis across EcoSetu UI
 */

import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp, ViewStyle, View } from 'react-native';

export type IconName =
  | 'home'
  | 'search'
  | 'requests'
  | 'clipboard'
  | 'recycle'
  | 'recycler'
  | 'collector'
  | 'citizen'
  | 'admin'
  | 'user'
  | 'users'
  | 'profile'
  | 'store'
  | 'shop'
  | 'chart'
  | 'analytics'
  | 'barChart'
  | 'trending'
  | 'wallet'
  | 'money'
  | 'rupee'
  | 'dollarSign'
  | 'payment'
  | 'creditCard'
  | 'receipt'
  | 'truck'
  | 'delivery'
  | 'factory'
  | 'facility'
  | 'location'
  | 'mapPin'
  | 'map-pin'
  | 'document'
  | 'file'
  | 'fileText'
  | 'certificate'
  | 'shield'
  | 'shieldCheck'
  | 'lock'
  | 'camera'
  | 'upload'
  | 'trash'
  | 'clock'
  | 'time'
  | 'calendar'
  | 'date'
  | 'phone'
  | 'mobile'
  | 'laptop'
  | 'computer'
  | 'battery'
  | 'leaf'
  | 'eco'
  | 'alert'
  | 'warning'
  | 'alertTriangle'
  | 'alert-triangle'
  | 'wifi-off'
  | 'check'
  | 'checkCircle'
  | 'check-circle'
  | 'close'
  | 'x'
  | 'xCircle'
  | 'info'
  | 'infoCircle'
  | 'help'
  | 'question'
  | 'refresh'
  | 'sync'
  | 'arrowRight'
  | 'arrowLeft'
  | 'arrowUp'
  | 'arrowDown'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'chevronUp'
  | 'filter'
  | 'plus'
  | 'minus'
  | 'edit'
  | 'eye'
  | 'eyeOff'
  | 'mail'
  | 'messageSquare'
  | 'key'
  | 'settings'
  | 'gear'
  | 'tool'
  | 'bell'
  | 'notification'
  | 'volume'
  | 'globe'
  | 'language'
  | 'radio'
  | 'box'
  | 'package'
  | 'inbox'
  | 'briefcase'
  | 'badge'
  | 'award'
  | 'tag'
  | 'sparkles'
  | 'ai'
  | 'zap'
  | 'mic'
  | 'send'
  | 'scale'
  | 'dispute'
  | 'share'
  | 'navigation'
  | 'x-circle'
  | 'slash'
  | 'volume-2'
  | 'volume2'
  | 'volume-x'
  | 'volumeX'
  | 'message-square'
  | 'radio-checked'
  | 'radio-unchecked'
  | 'dollar-sign'
  | 'alert-circle'
  | 'shield-check'
  | 'file-text'
  | 'tv'
  | 'cpu'
  | 'lightbulb'
  | 'cable'
  | 'wrench'
  | 'hammer'
  | 'sun'
  | 'smartphone'
  | 'printer'
  | 'monitor'
  | 'wifiOff'
  | 'square'
  | 'refreshCw'
  | 'refresh-cw'
  | 'shieldAlert'
  | 'download'
  | 'folder'
  | 'hardDrive'
  | 'link'
  | 'tablet'
  | 'handshake'
  | 'star'
  | 'heart'
  | string;

export type AppIconName = IconName;

const EMOJI_MAP: Record<string, string> = {
  home: '🏠',
  search: '🔍',
  requests: '📋',
  clipboard: '📋',
  recycle: '♻️',
  recycler: '♻️',
  collector: '🚚',
  citizen: '👤',
  admin: '🛡️',
  user: '👤',
  users: '👥',
  profile: '👤',
  store: '🛍️',
  shop: '🛍️',
  chart: '📊',
  analytics: '📊',
  barChart: '📊',
  trending: '📈',
  wallet: '💰',
  money: '💵',
  rupee: '₹',
  dollarSign: '💲',
  'dollar-sign': '💲',
  payment: '💳',
  creditCard: '💳',
  receipt: '🧾',
  truck: '🚚',
  delivery: '🚚',
  factory: '🏭',
  facility: '🏭',
  location: '📍',
  mapPin: '📍',
  'map-pin': '📍',
  navigation: '📍',
  document: '📄',
  file: '📄',
  fileText: '📄',
  'file-text': '📄',
  certificate: '📜',
  shield: '🛡️',
  shieldCheck: '🛡️',
  'shield-check': '🛡️',
  shieldAlert: '⚠️',
  lock: '🔒',
  camera: '📸',
  upload: '📤',
  download: '📥',
  trash: '🗑️',
  clock: '⏱️',
  time: '🕒',
  calendar: '📅',
  date: '📅',
  phone: '📱',
  mobile: '📱',
  smartphone: '📱',
  laptop: '💻',
  computer: '💻',
  tablet: '📱',
  tv: '📺',
  monitor: '🖥️',
  printer: '🖨️',
  cpu: '🔲',
  cable: '🔌',
  battery: '🔋',
  leaf: '🌿',
  eco: '🌱',
  alert: '⚠️',
  warning: '⚠️',
  alertTriangle: '⚠️',
  'alert-triangle': '⚠️',
  'alert-circle': '⚠️',
  'wifi-off': '🚫',
  wifiOff: '🚫',
  check: '✓',
  checkCircle: '✅',
  'check-circle': '✅',
  close: '✕',
  x: '✕',
  xCircle: '❌',
  'x-circle': '❌',
  info: 'ℹ️',
  infoCircle: 'ℹ️',
  lightbulb: '💡',
  help: '❓',
  question: '❓',
  refresh: '🔄',
  sync: '🔄',
  refreshCw: '🔄',
  'refresh-cw': '🔄',
  arrowRight: '→',
  arrowLeft: '←',
  arrowUp: '↑',
  arrowDown: '↓',
  chevronRight: '›',
  chevronLeft: '‹',
  chevronDown: '˅',
  chevronUp: '˄',
  filter: '🎛️',
  plus: '+',
  minus: '−',
  edit: '✏️',
  eye: '👁️',
  eyeOff: '🙈',
  mail: '✉️',
  messageSquare: '💬',
  'message-square': '💬',
  key: '🔑',
  settings: '⚙️',
  gear: '⚙️',
  tool: '🔧',
  wrench: '🔧',
  hammer: '🔨',
  bell: '🔔',
  notification: '🔔',
  volume: '🔊',
  'volume-2': '🔊',
  volume2: '🔊',
  'volume-x': '🔇',
  volumeX: '🔇',
  globe: '🌐',
  language: '🌐',
  radio: '🔘',
  'radio-checked': '🔘',
  'radio-unchecked': '⚪',
  box: '📦',
  package: '📦',
  inbox: '📥',
  briefcase: '💼',
  badge: '🏷️',
  award: '🏆',
  tag: '🏷️',
  sparkles: '✨',
  ai: '✨',
  zap: '⚡',
  mic: '🎙️',
  send: '📤',
  scale: '⚖️',
  dispute: '⚖️',
  share: '🔗',
  link: '🔗',
  slash: '🚫',
  sun: '☀️',
  square: '⏹️',
  folder: '📁',
  hardDrive: '💾',
  handshake: '🤝',
  star: '⭐',
  heart: '❤️',
};

export interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle | TextStyle>;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color,
  style,
}) => {
  const emoji = EMOJI_MAP[name] || '•';
  const isSymbolText = ['+', '−', '→', '←', '↑', '↓', '›', '‹', '˅', '˄', '₹', '✓', '✕', '•'].includes(emoji);

  return (
    <View
      style={[
        styles.container,
        {
          width: size + 2,
          height: size + 2,
        },
        style as any,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${name} icon`}
    >
      <Text
        style={[
          styles.emoji,
          {
            fontSize: size,
            lineHeight: size + 2,
            color: color || '#FFFFFF',
            fontWeight: isSymbolText ? 'bold' : 'normal',
          },
        ]}
      >
        {emoji}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default AppIcon;
