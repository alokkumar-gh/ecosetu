/**
 * AppIcon — Unified Professional Stroke-Based Vector Icon System
 *
 * Replaces all emoji-based UI throughout EcoSetu with clean, minimal,
 * stroke-based vector icons rendered using native geometric primitives.
 *
 * Properties:
 *  - name: IconName
 *  - size: number (default 20)
 *  - color: string (default #10B981)
 *  - strokeWidth: number (default 2)
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

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
  | 'volume2'
  | 'volumeX'
  | 'volumeMute'
  | 'play'
  | 'bar-chart-2'
  | 'trending-up'
  | 'trending-down'
  | 'trendingUp'
  | 'edit-2'
  | 'logout'
  | 'logOut'
  | 'grid'
  | 'handshake'
  | 'deal'
  | 'activity'
  | 'warehouse'
  | 'history'
  | 'layers';

export type AppIconName = IconName;

export interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: ViewStyle;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = '#10B981',
  strokeWidth = 2,
  style,
}) => {
  const s = size;
  const sw = Math.max(1.2, strokeWidth * (size / 24));

  const renderIcon = () => {
    switch (name) {
      case 'home':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Roof */}
            <View
              style={{
                width: s * 0.75,
                height: s * 0.38,
                borderTopWidth: sw,
                borderLeftWidth: sw,
                borderColor: color,
                transform: [{ rotate: '45deg' }, { translateY: s * 0.08 }],
                alignSelf: 'center',
              }}
            />
            {/* Walls & Base */}
            <View
              style={{
                width: s * 0.62,
                height: s * 0.44,
                borderWidth: sw,
                borderTopWidth: 0,
                borderColor: color,
                borderRadius: s * 0.04,
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginTop: -s * 0.08,
              }}
            >
              {/* Door */}
              <View
                style={{
                  width: s * 0.22,
                  height: s * 0.24,
                  backgroundColor: color,
                  borderTopLeftRadius: s * 0.04,
                  borderTopRightRadius: s * 0.04,
                }}
              />
            </View>
          </View>
        );

      case 'search':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.58,
                height: s * 0.58,
                borderRadius: (s * 0.58) / 2,
                borderWidth: sw,
                borderColor: color,
                top: -s * 0.08,
                left: -s * 0.08,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: sw,
                height: s * 0.36,
                backgroundColor: color,
                borderRadius: sw / 2,
                transform: [{ rotate: '-45deg' }],
                bottom: s * 0.08,
                right: s * 0.16,
              }}
            />
          </View>
        );

      case 'recycle':
      case 'recycler':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Tri-loop circular icon */}
            <View
              style={{
                width: s * 0.78,
                height: s * 0.78,
                borderRadius: (s * 0.78) / 2,
                borderWidth: sw,
                borderColor: color,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: s * 0.32,
                  height: s * 0.32,
                  borderRadius: (s * 0.32) / 2,
                  borderWidth: sw * 0.8,
                  borderColor: color,
                }}
              />
            </View>
          </View>
        );

      case 'requests':
      case 'clipboard':
      case 'document':
      case 'file':
      case 'fileText':
      case 'file-text':
      case 'printer':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Document sheet */}
            <View
              style={{
                width: s * 0.64,
                height: s * 0.78,
                borderRadius: s * 0.08,
                borderWidth: sw,
                borderColor: color,
                padding: s * 0.08,
                justifyContent: 'space-evenly',
              }}
            >
              <View style={{ width: '70%', height: sw, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: '90%', height: sw, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: '60%', height: sw, backgroundColor: color, borderRadius: 1 }} />
            </View>
            {/* Top clip */}
            <View
              style={{
                position: 'absolute',
                top: s * 0.04,
                width: s * 0.28,
                height: s * 0.12,
                backgroundColor: color,
                borderRadius: s * 0.04,
              }}
            />
          </View>
        );

      case 'user':
      case 'users':
      case 'profile':
      case 'citizen':
      case 'admin':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Head */}
            <View
              style={{
                width: s * 0.38,
                height: s * 0.38,
                borderRadius: (s * 0.38) / 2,
                borderWidth: sw,
                borderColor: color,
                marginBottom: s * 0.06,
              }}
            />
            {/* Shoulders */}
            <View
              style={{
                width: s * 0.72,
                height: s * 0.34,
                borderTopLeftRadius: s * 0.34,
                borderTopRightRadius: s * 0.34,
                borderWidth: sw,
                borderBottomWidth: 0,
                borderColor: color,
              }}
            />
          </View>
        );

      case 'collector':
      case 'truck':
      case 'delivery':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              {/* Cargo Bed */}
              <View
                style={{
                  width: s * 0.44,
                  height: s * 0.42,
                  borderWidth: sw,
                  borderColor: color,
                  borderRightWidth: 0,
                  borderRadius: s * 0.04,
                }}
              />
              {/* Cab */}
              <View
                style={{
                  width: s * 0.32,
                  height: s * 0.34,
                  borderWidth: sw,
                  borderColor: color,
                  borderTopRightRadius: s * 0.14,
                  borderRadius: s * 0.04,
                }}
              />
            </View>
            {/* Wheels */}
            <View style={{ flexDirection: 'row', width: s * 0.68, justifyContent: 'space-between', marginTop: -s * 0.06 }}>
              <View style={{ width: s * 0.16, height: s * 0.16, borderRadius: (s * 0.16) / 2, backgroundColor: color }} />
              <View style={{ width: s * 0.16, height: s * 0.16, borderRadius: (s * 0.16) / 2, backgroundColor: color }} />
            </View>
          </View>
        );

      case 'factory':
      case 'facility':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.74,
                height: s * 0.58,
                borderWidth: sw,
                borderColor: color,
                borderRadius: s * 0.06,
                borderTopWidth: 0,
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                paddingBottom: s * 0.06,
              }}
            >
              {/* Chimneys / Saws */}
              <View style={{ width: s * 0.14, height: s * 0.28, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: s * 0.14, height: s * 0.38, backgroundColor: color, borderRadius: 1 }} />
            </View>
          </View>
        );

      case 'store':
      case 'shop':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Canopy */}
            <View
              style={{
                width: s * 0.78,
                height: s * 0.26,
                borderWidth: sw,
                borderColor: color,
                borderRadius: s * 0.06,
                backgroundColor: color + '25',
              }}
            />
            {/* Pillars and counter */}
            <View
              style={{
                width: s * 0.66,
                height: s * 0.42,
                borderWidth: sw,
                borderTopWidth: 0,
                borderColor: color,
                borderRadius: s * 0.04,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: s * 0.28, height: s * 0.18, borderWidth: sw * 0.8, borderColor: color, borderRadius: 2 }} />
            </View>
          </View>
        );

      case 'handshake':
      case 'deal':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: s * 0.36,
                  height: s * 0.28,
                  borderWidth: sw,
                  borderColor: color,
                  borderTopLeftRadius: s * 0.1,
                  borderBottomLeftRadius: s * 0.1,
                  transform: [{ rotate: '20deg' }],
                }}
              />
              <View
                style={{
                  width: s * 0.36,
                  height: s * 0.28,
                  borderWidth: sw,
                  borderColor: color,
                  borderTopRightRadius: s * 0.1,
                  borderBottomRightRadius: s * 0.1,
                  transform: [{ rotate: '-20deg' }],
                  marginLeft: -s * 0.08,
                }}
              />
            </View>
          </View>
        );

      case 'chart':
      case 'analytics':
      case 'trending':
      case 'barChart':
      case 'bar-chart-2':
      case 'trending-up':
      case 'trending-down':
      case 'trendingUp':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: s * 0.62, gap: s * 0.08 }}>
              <View style={{ width: s * 0.16, height: s * 0.32, backgroundColor: color, borderRadius: s * 0.03 }} />
              <View style={{ width: s * 0.16, height: s * 0.58, backgroundColor: color, borderRadius: s * 0.03 }} />
              <View style={{ width: s * 0.16, height: s * 0.44, backgroundColor: color, borderRadius: s * 0.03 }} />
            </View>
            <View style={{ width: s * 0.74, height: sw, backgroundColor: color, marginTop: s * 0.04, borderRadius: 1 }} />
          </View>
        );

      case 'wallet':
      case 'money':
      case 'payment':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.76,
                height: s * 0.56,
                borderRadius: s * 0.1,
                borderWidth: sw,
                borderColor: color,
                justifyContent: 'center',
                alignItems: 'flex-end',
                paddingRight: s * 0.08,
              }}
            >
              <View style={{ width: s * 0.14, height: s * 0.14, borderRadius: (s * 0.14) / 2, backgroundColor: color }} />
            </View>
          </View>
        );

      case 'rupee':
      case 'dollarSign':
      case 'dollar-sign':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* ₹ Glyphic construction */}
            <View style={{ width: s * 0.54, height: sw, backgroundColor: color, marginBottom: s * 0.04, borderRadius: 1 }} />
            <View style={{ width: s * 0.54, height: sw, backgroundColor: color, marginBottom: s * 0.04, borderRadius: 1 }} />
            <View
              style={{
                width: s * 0.42,
                height: s * 0.28,
                borderTopRightRadius: s * 0.14,
                borderBottomRightRadius: s * 0.14,
                borderWidth: sw,
                borderLeftWidth: 0,
                borderColor: color,
                alignSelf: 'flex-start',
                marginLeft: s * 0.22,
              }}
            />
            <View
              style={{
                width: sw,
                height: s * 0.32,
                backgroundColor: color,
                transform: [{ rotate: '-35deg' }],
                alignSelf: 'flex-end',
                marginRight: s * 0.26,
                marginTop: -s * 0.04,
              }}
            />
          </View>
        );

      case 'location':
      case 'mapPin':
      case 'map-pin':
      case 'navigation':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.56,
                height: s * 0.56,
                borderRadius: (s * 0.56) / 2,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: '45deg' }],
                borderBottomRightRadius: 0,
                top: -s * 0.06,
              }}
            >
              <View
                style={{
                  width: s * 0.18,
                  height: s * 0.18,
                  borderRadius: (s * 0.18) / 2,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );

      case 'shield':
      case 'shieldCheck':
      case 'shield-check':
      case 'shieldAlert':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.68,
                height: s * 0.74,
                borderWidth: sw,
                borderColor: color,
                borderTopLeftRadius: s * 0.16,
                borderTopRightRadius: s * 0.16,
                borderBottomLeftRadius: s * 0.38,
                borderBottomRightRadius: s * 0.38,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {(name === 'shieldCheck' || name === 'shield-check' || name === 'shieldAlert') && (
                <View
                  style={{
                    width: s * 0.22,
                    height: s * 0.12,
                    borderLeftWidth: sw,
                    borderBottomWidth: sw,
                    borderColor: color,
                    transform: [{ rotate: '-45deg' }, { translateY: -s * 0.02 }],
                  }}
                />
              )}
            </View>
          </View>
        );

      case 'lock':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Shackle */}
            <View
              style={{
                width: s * 0.38,
                height: s * 0.32,
                borderWidth: sw,
                borderBottomWidth: 0,
                borderColor: color,
                borderTopLeftRadius: s * 0.2,
                borderTopRightRadius: s * 0.2,
                marginBottom: -sw,
              }}
            />
            {/* Body */}
            <View
              style={{
                width: s * 0.62,
                height: s * 0.44,
                borderRadius: s * 0.08,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: s * 0.12, height: s * 0.14, backgroundColor: color, borderRadius: s * 0.04 }} />
            </View>
          </View>
        );

      case 'camera':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Top bump */}
            <View style={{ width: s * 0.26, height: s * 0.08, backgroundColor: color, borderRadius: 2, marginBottom: -1 }} />
            {/* Body */}
            <View
              style={{
                width: s * 0.78,
                height: s * 0.54,
                borderRadius: s * 0.1,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Lens */}
              <View style={{ width: s * 0.28, height: s * 0.28, borderRadius: (s * 0.28) / 2, borderWidth: sw, borderColor: color }} />
            </View>
          </View>
        );

      case 'upload':
      case 'download':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Arrow */}
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: s * 0.28,
                  height: s * 0.28,
                  borderTopWidth: name === 'download' ? 0 : sw,
                  borderLeftWidth: name === 'download' ? 0 : sw,
                  borderBottomWidth: name === 'download' ? sw : 0,
                  borderRightWidth: name === 'download' ? sw : 0,
                  borderColor: color,
                  transform: [{ rotate: '45deg' }],
                  marginBottom: name === 'download' ? 0 : -s * 0.12,
                  marginTop: name === 'download' ? -s * 0.12 : 0,
                }}
              />
              <View style={{ width: sw, height: s * 0.36, backgroundColor: color, borderRadius: sw / 2 }} />
            </View>
            {/* Bottom tray */}
            <View
              style={{
                width: s * 0.68,
                height: s * 0.24,
                borderWidth: sw,
                borderTopWidth: 0,
                borderColor: color,
                borderRadius: s * 0.06,
                marginTop: s * 0.06,
              }}
            />
          </View>
        );

      case 'trash':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Lid */}
            <View style={{ width: s * 0.68, height: sw, backgroundColor: color, borderRadius: 1, marginBottom: 2 }} />
            {/* Body */}
            <View
              style={{
                width: s * 0.52,
                height: s * 0.56,
                borderWidth: sw,
                borderTopWidth: 0,
                borderColor: color,
                borderBottomLeftRadius: s * 0.08,
                borderBottomRightRadius: s * 0.08,
                flexDirection: 'row',
                justifyContent: 'space-evenly',
                paddingTop: s * 0.08,
              }}
            >
              <View style={{ width: sw * 0.8, height: '70%', backgroundColor: color }} />
              <View style={{ width: sw * 0.8, height: '70%', backgroundColor: color }} />
            </View>
          </View>
        );

      case 'clock':
      case 'time':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.76,
                height: s * 0.76,
                borderRadius: (s * 0.76) / 2,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Center point */}
              <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: (s * 0.1) / 2, backgroundColor: color }} />
              {/* Hour hand */}
              <View
                style={{
                  position: 'absolute',
                  width: sw,
                  height: s * 0.22,
                  backgroundColor: color,
                  top: s * 0.14,
                  borderRadius: sw / 2,
                }}
              />
              {/* Minute hand */}
              <View
                style={{
                  position: 'absolute',
                  width: s * 0.22,
                  height: sw,
                  backgroundColor: color,
                  right: s * 0.14,
                  borderRadius: sw / 2,
                }}
              />
            </View>
          </View>
        );

      case 'calendar':
      case 'date':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Binder rings */}
            <View style={{ flexDirection: 'row', width: s * 0.44, justifyContent: 'space-between', marginBottom: -s * 0.06, zIndex: 2 }}>
              <View style={{ width: sw * 1.2, height: s * 0.14, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: sw * 1.2, height: s * 0.14, backgroundColor: color, borderRadius: 1 }} />
            </View>
            {/* Body */}
            <View
              style={{
                width: s * 0.72,
                height: s * 0.64,
                borderRadius: s * 0.08,
                borderWidth: sw,
                borderColor: color,
                overflow: 'hidden',
              }}
            >
              <View style={{ width: '100%', height: s * 0.16, backgroundColor: color + '40', borderBottomWidth: sw * 0.8, borderColor: color }} />
            </View>
          </View>
        );

      case 'phone':
      case 'mobile':
      case 'smartphone':
      case 'tablet':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.48,
                height: s * 0.78,
                borderRadius: s * 0.1,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: s * 0.08,
              }}
            >
              <View style={{ width: s * 0.16, height: sw, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: (s * 0.1) / 2, borderWidth: sw * 0.8, borderColor: color }} />
            </View>
          </View>
        );

      case 'laptop':
      case 'computer':
      case 'tv':
      case 'cpu':
      case 'monitor':
      case 'hardDrive':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Screen */}
            <View
              style={{
                width: s * 0.62,
                height: s * 0.46,
                borderWidth: sw,
                borderColor: color,
                borderRadius: s * 0.06,
                borderBottomWidth: 0,
              }}
            />
            {/* Base */}
            <View style={{ width: s * 0.82, height: sw * 1.5, backgroundColor: color, borderRadius: s * 0.04 }} />
          </View>
        );

      case 'battery':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: s * 0.64,
                  height: s * 0.38,
                  borderRadius: s * 0.06,
                  borderWidth: sw,
                  borderColor: color,
                  padding: s * 0.04,
                  flexDirection: 'row',
                  gap: 2,
                }}
              >
                <View style={{ width: '40%', height: '100%', backgroundColor: color, borderRadius: 1 }} />
                <View style={{ width: '30%', height: '100%', backgroundColor: color, borderRadius: 1 }} />
              </View>
              {/* Positive nub */}
              <View style={{ width: s * 0.08, height: s * 0.16, backgroundColor: color, borderTopRightRadius: 2, borderBottomRightRadius: 2 }} />
            </View>
          </View>
        );

      case 'leaf':
      case 'eco':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.64,
                height: s * 0.64,
                borderWidth: sw,
                borderColor: color,
                borderTopLeftRadius: s * 0.64,
                borderBottomRightRadius: s * 0.64,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: s * 0.2,
                transform: [{ rotate: '45deg' }],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Center vein */}
              <View style={{ width: sw, height: '70%', backgroundColor: color }} />
            </View>
          </View>
        );

      case 'check':
      case 'checkCircle':
      case 'check-circle':
      case 'radio-checked':
      case 'radio-unchecked':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {(name === 'checkCircle' || name === 'check-circle' || name === 'radio-checked' || name === 'radio-unchecked') && (
              <View
                style={{
                  position: 'absolute',
                  width: s * 0.82,
                  height: s * 0.82,
                  borderRadius: (s * 0.82) / 2,
                  borderWidth: sw,
                  borderColor: color,
                }}
              />
            )}
            {name !== 'radio-unchecked' && (
              <View
                style={{
                  width: s * 0.44,
                  height: s * 0.24,
                  borderLeftWidth: sw * 1.2,
                  borderBottomWidth: sw * 1.2,
                  borderColor: color,
                  transform: [{ rotate: '-45deg' }, { translateY: -s * 0.06 }],
                }}
              />
            )}
          </View>
        );

      case 'close':
      case 'x':
      case 'xCircle':
      case 'x-circle':
      case 'slash':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {(name === 'xCircle' || name === 'x-circle') && (
              <View
                style={{
                  position: 'absolute',
                  width: s * 0.82,
                  height: s * 0.82,
                  borderRadius: (s * 0.82) / 2,
                  borderWidth: sw,
                  borderColor: color,
                }}
              />
            )}
            <View style={{ width: s * 0.52, height: sw, backgroundColor: color, borderRadius: sw / 2, transform: [{ rotate: '45deg' }] }} />
            {name !== 'slash' && (
              <View style={{ position: 'absolute', width: s * 0.52, height: sw, backgroundColor: color, borderRadius: sw / 2, transform: [{ rotate: '-45deg' }] }} />
            )}
          </View>
        );

      case 'alert':
      case 'warning':
      case 'alertTriangle':
      case 'alert-triangle':
      case 'alert-circle':
      case 'wifi-off':
      case 'wifiOff':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Triangle warning */}
            <View
              style={{
                width: s * 0.68,
                height: s * 0.68,
                borderWidth: sw,
                borderColor: color,
                borderRadius: s * 0.1,
                transform: [{ rotate: '45deg' }],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ transform: [{ rotate: '-45deg' }], alignItems: 'center' }}>
                <View style={{ width: sw * 1.1, height: s * 0.22, backgroundColor: color, borderRadius: 1, marginBottom: 2 }} />
                <View style={{ width: sw * 1.1, height: sw * 1.1, backgroundColor: color, borderRadius: sw / 2 }} />
              </View>
            </View>
          </View>
        );

      case 'info':
      case 'infoCircle':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.78,
                height: s * 0.78,
                borderRadius: (s * 0.78) / 2,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: sw * 1.1, height: sw * 1.1, backgroundColor: color, borderRadius: sw / 2, marginBottom: 2 }} />
              <View style={{ width: sw * 1.1, height: s * 0.26, backgroundColor: color, borderRadius: 1 }} />
            </View>
          </View>
        );

      case 'settings':
      case 'gear':
      case 'tool':
      case 'wrench':
      case 'hammer':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.68,
                height: s * 0.68,
                borderRadius: (s * 0.68) / 2,
                borderWidth: sw,
                borderColor: color,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: s * 0.24, height: s * 0.24, borderRadius: (s * 0.24) / 2, borderWidth: sw, borderColor: color }} />
            </View>
          </View>
        );

      case 'bell':
      case 'notification':
      case 'volume':
      case 'volume-2':
      case 'volume2':
      case 'volumeX':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* Bell dome */}
            <View
              style={{
                width: s * 0.54,
                height: s * 0.52,
                borderWidth: sw,
                borderBottomWidth: 0,
                borderColor: color,
                borderTopLeftRadius: s * 0.27,
                borderTopRightRadius: s * 0.27,
              }}
            />
            {/* Rim */}
            <View style={{ width: s * 0.74, height: sw, backgroundColor: color, borderRadius: 1 }} />
            {/* Clapper */}
            <View style={{ width: s * 0.16, height: s * 0.1, backgroundColor: color, borderRadius: (s * 0.16) / 2, marginTop: 1 }} />
          </View>
        );

      case 'globe':
      case 'language':
      case 'radio':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.78,
                height: s * 0.78,
                borderRadius: (s * 0.78) / 2,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Equator & Meridian */}
              <View style={{ position: 'absolute', width: '100%', height: sw * 0.8, backgroundColor: color }} />
              <View style={{ position: 'absolute', height: '100%', width: sw * 0.8, backgroundColor: color }} />
            </View>
          </View>
        );

      case 'sparkles':
      case 'ai':
      case 'zap':
      case 'lightbulb':
      case 'sun':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            {/* 4-point Diamond Star */}
            <View
              style={{
                width: s * 0.44,
                height: s * 0.44,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }],
                borderRadius: s * 0.06,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: s * 0.1,
                right: s * 0.12,
                width: s * 0.2,
                height: s * 0.2,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }],
                borderRadius: 2,
                opacity: 0.8,
              }}
            />
          </View>
        );

      case 'chevronRight':
      case 'arrowRight':
      case 'play':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.32,
                height: s * 0.32,
                borderTopWidth: sw * 1.2,
                borderRightWidth: sw * 1.2,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginLeft: -s * 0.08,
              }}
            />
          </View>
        );

      case 'chevronLeft':
      case 'arrowLeft':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.32,
                height: s * 0.32,
                borderBottomWidth: sw * 1.2,
                borderLeftWidth: sw * 1.2,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginRight: -s * 0.08,
              }}
            />
          </View>
        );

      case 'chevronDown':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.32,
                height: s * 0.32,
                borderBottomWidth: sw * 1.2,
                borderRightWidth: sw * 1.2,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginTop: -s * 0.08,
              }}
            />
          </View>
        );

      case 'plus':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View style={{ width: s * 0.58, height: sw, backgroundColor: color, borderRadius: sw / 2 }} />
            <View style={{ position: 'absolute', height: s * 0.58, width: sw, backgroundColor: color, borderRadius: sw / 2 }} />
          </View>
        );

      case 'badge':
      case 'award':
      case 'certificate':
      case 'tag':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.56,
                height: s * 0.56,
                borderRadius: (s * 0.56) / 2,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: s * 0.18, height: s * 0.18, backgroundColor: color, borderRadius: (s * 0.18) / 2 }} />
            </View>
            <View style={{ flexDirection: 'row', width: s * 0.36, justifyContent: 'space-between', marginTop: -s * 0.04 }}>
              <View style={{ width: sw * 1.2, height: s * 0.22, backgroundColor: color, transform: [{ rotate: '25deg' }] }} />
              <View style={{ width: sw * 1.2, height: s * 0.22, backgroundColor: color, transform: [{ rotate: '-25deg' }] }} />
            </View>
          </View>
        );

      case 'refresh':
      case 'sync':
      case 'cable':
      case 'refreshCw':
      case 'refresh-cw':
      case 'link':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.68,
                height: s * 0.68,
                borderRadius: (s * 0.68) / 2,
                borderWidth: sw,
                borderColor: color,
                borderTopColor: 'transparent',
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      case 'box':
      case 'package':
      case 'inbox':
      case 'briefcase':
      case 'square':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.68,
                height: s * 0.64,
                borderRadius: s * 0.06,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
              }}
            >
              <View style={{ width: '100%', height: sw, backgroundColor: color, marginTop: s * 0.18 }} />
              <View style={{ width: sw, height: '100%', backgroundColor: color }} />
            </View>
          </View>
        );

      case 'receipt':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.6,
                height: s * 0.74,
                borderRadius: s * 0.04,
                borderWidth: sw,
                borderColor: color,
                paddingHorizontal: s * 0.08,
                justifyContent: 'space-evenly',
              }}
            >
              <View style={{ width: '60%', height: sw, backgroundColor: color }} />
              <View style={{ width: '85%', height: sw, backgroundColor: color }} />
              <View style={{ width: '70%', height: sw, backgroundColor: color }} />
            </View>
          </View>
        );

      case 'logout':
      case 'logOut':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.52,
                height: s * 0.7,
                borderWidth: sw,
                borderRightWidth: 0,
                borderColor: color,
                borderRadius: s * 0.06,
                justifyContent: 'center',
                alignItems: 'flex-end',
              }}
            >
              <View
                style={{
                  width: s * 0.34,
                  height: sw,
                  backgroundColor: color,
                  marginRight: -s * 0.14,
                }}
              />
            </View>
          </View>
        );

      case 'edit':
      case 'edit-2':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.54,
                height: s * 0.18,
                borderWidth: sw,
                borderColor: color,
                borderRadius: 2,
                transform: [{ rotate: '-45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: s * 0.18,
                left: s * 0.18,
                width: sw,
                height: sw,
                backgroundColor: color,
              }}
            />
          </View>
        );

      case 'activity':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', height: s * 0.6, width: s * 0.75, justifyContent: 'space-between' }}>
              <View style={{ width: s * 0.14, height: sw, backgroundColor: color }} />
              <View style={{ width: sw, height: s * 0.35, backgroundColor: color, transform: [{ rotate: '20deg' }] }} />
              <View style={{ width: sw, height: s * 0.55, backgroundColor: color, transform: [{ rotate: '-20deg' }] }} />
              <View style={{ width: s * 0.14, height: sw, backgroundColor: color }} />
            </View>
          </View>
        );

      case 'warehouse':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.72,
                height: s * 0.3,
                borderTopWidth: sw,
                borderLeftWidth: sw,
                borderColor: color,
                transform: [{ rotate: '45deg' }, { translateY: s * 0.06 }],
              }}
            />
            <View
              style={{
                width: s * 0.68,
                height: s * 0.44,
                borderWidth: sw,
                borderTopWidth: 0,
                borderColor: color,
                marginTop: -s * 0.06,
                flexDirection: 'row',
                justifyContent: 'space-evenly',
                alignItems: 'flex-end',
              }}
            >
              <View style={{ width: s * 0.16, height: s * 0.24, borderWidth: sw, borderBottomWidth: 0, borderColor: color }} />
              <View style={{ width: s * 0.16, height: s * 0.24, borderWidth: sw, borderBottomWidth: 0, borderColor: color }} />
            </View>
          </View>
        );

      case 'history':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.72,
                height: s * 0.72,
                borderRadius: (s * 0.72) / 2,
                borderWidth: sw,
                borderColor: color,
                borderTopColor: 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: sw, height: s * 0.22, backgroundColor: color, marginBottom: s * 0.08 }} />
            </View>
          </View>
        );

      case 'layers':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.54,
                height: s * 0.54,
                borderWidth: sw,
                borderColor: color,
                borderRadius: 2,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      case 'eye':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.76,
                height: s * 0.44,
                borderRadius: (s * 0.76) / 2,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: s * 0.22,
                  height: s * 0.22,
                  borderRadius: (s * 0.22) / 2,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );

      case 'eyeOff':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.76,
                height: s * 0.44,
                borderRadius: (s * 0.76) / 2,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: s * 0.18,
                  height: s * 0.18,
                  borderRadius: (s * 0.18) / 2,
                  backgroundColor: color,
                }}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                width: sw,
                height: s * 0.82,
                backgroundColor: color,
                borderRadius: sw / 2,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      case 'mail':
      case 'messageSquare':
      case 'message-square':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.76,
                height: s * 0.54,
                borderRadius: s * 0.08,
                borderWidth: sw,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'flex-start',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: s * 0.45,
                  height: s * 0.45,
                  borderBottomWidth: sw,
                  borderRightWidth: sw,
                  borderColor: color,
                  transform: [{ rotate: '45deg' }, { translateY: -s * 0.18 }],
                }}
              />
            </View>
          </View>
        );

      case 'key':
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                position: 'absolute',
                top: s * 0.16,
                left: s * 0.16,
                width: s * 0.38,
                height: s * 0.38,
                borderRadius: (s * 0.38) / 2,
                borderWidth: sw,
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: sw,
                height: s * 0.45,
                backgroundColor: color,
                bottom: s * 0.16,
                right: s * 0.3,
                transform: [{ rotate: '-45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: s * 0.14,
                height: sw,
                backgroundColor: color,
                bottom: s * 0.2,
                right: s * 0.22,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      default:
        // Clean default bullet indicator
        return (
          <View style={[styles.center, { width: s, height: s }]}>
            <View
              style={{
                width: s * 0.4,
                height: s * 0.4,
                borderRadius: (s * 0.4) / 2,
                backgroundColor: color,
              }}
            />
          </View>
        );
    }
  };

  return <View style={[styles.container, { width: size, height: size }, style]}>{renderIcon()}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});

export default AppIcon;
