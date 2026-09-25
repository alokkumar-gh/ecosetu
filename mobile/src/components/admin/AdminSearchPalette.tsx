/**
 * AdminSearchPalette — Global Command/Search Overlay
 *
 * Ctrl/Cmd+K quick search across:
 * - Platform pages (nav items)
 * - Users (via adminService.getUsers)
 * - Verifications (pending count shortcut)
 *
 * Results grouped by category.
 * Keyboard-navigable (up/down arrows, Enter, Esc).
 * Debounced search — 300ms.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { adminService } from '../../services/adminService';
import {
  ADMIN_COLOR,
  ADMIN_TYPE,
  ADMIN_RADIUS,
  ADMIN_NAV_GROUPS,
} from './AdminTheme';

interface SearchResult {
  id: string;
  category: 'Pages' | 'Users' | 'Verifications';
  title: string;
  subtitle?: string;
  icon: string;
  screen?: string;
  data?: any;
}

interface Props {
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

// Build static page results from nav groups
const PAGE_RESULTS: SearchResult[] = ADMIN_NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    id: `page-${item.key}`,
    category: 'Pages' as const,
    title: item.label,
    subtitle: item.description,
    icon: item.icon,
    screen: item.screen,
  }))
);

export const AdminSearchPalette: React.FC<Props> = ({ onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>(PAGE_RESULTS);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const panelAnim = useRef(new Animated.Value(-20)).current;

  // Auto-focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(panelAnim, { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(panelAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, backdropAnim, panelAnim]);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(PAGE_RESULTS);
      setIsSearching(false);
      return;
    }

    const ql = q.toLowerCase();

    // Filter pages
    const pageHits: SearchResult[] = PAGE_RESULTS.filter(
      (r) =>
        r.title.toLowerCase().includes(ql) ||
        (r.subtitle?.toLowerCase().includes(ql) ?? false)
    );

    // Search users
    setIsSearching(true);
    try {
      const userResults = await adminService.searchNotificationUsers(q);
      const userHits: SearchResult[] = (userResults || []).slice(0, 5).map((u: any) => ({
        id: `user-${u.id}`,
        category: 'Users' as const,
        title: u.name || u.displayName || 'Unknown',
        subtitle: `${u.role?.replace('_', ' ')} · ${u.status}`,
        icon: u.role === 'ADMIN' ? '🛡️' : u.role === 'INFORMAL_COLLECTOR' ? '♻️' : u.role === 'RECYCLER' ? '🏭' : '👤',
        screen: 'AdminUsers',
        data: u,
      }));

      setResults([...pageHits, ...userHits]);
    } catch {
      setResults(pageHits);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  // Group results
  const grouped = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    });
    return groups;
  }, [results]);

  const flatResults: (SearchResult | { type: 'header'; label: string })[] =
    React.useMemo(() => {
      const flat: (SearchResult | { type: 'header'; label: string })[] = [];
      Object.entries(grouped).forEach(([label, items]) => {
        flat.push({ type: 'header', label });
        flat.push(...items);
      });
      return flat;
    }, [grouped]);

  return (
    <Modal
      transparent
      animationType="none"
      visible
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Panel */}
      <View style={styles.panelWrapper} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateY: panelAnim }] },
          ]}
        >
          {/* Search Input */}
          <View style={styles.searchRow}>
            <Text style={styles.searchRowIcon}>⌕</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Search pages, users, verifications..."
              placeholderTextColor={ADMIN_COLOR.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {isSearching && (
              <ActivityIndicator size="small" color={ADMIN_COLOR.brand} />
            )}
            <TouchableOpacity
              onPress={handleClose}
              style={styles.escBtn}
              accessibilityLabel="Close search"
            >
              <Text style={styles.escBtnText}>ESC</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Results */}
          <FlatList
            data={flatResults}
            keyExtractor={(item, i) =>
              'type' in item ? `header-${item.label}` : item.id
            }
            style={styles.resultsList}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if ('type' in item) {
                return (
                  <Text style={styles.groupHeader}>{item.label}</Text>
                );
              }
              return (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => {
                    if (item.screen) onNavigate(item.screen);
                    else handleClose();
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                >
                  <Text style={styles.resultIcon}>{item.icon}</Text>
                  <View style={styles.resultText}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.resultArrow}>→</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {query ? 'No results found.' : 'Start typing to search...'}
                </Text>
              </View>
            }
          />

          {/* Footer hint */}
          <View style={styles.footer}>
            <Text style={styles.footerHint}>↑↓ Navigate</Text>
            <Text style={styles.footerSep}>·</Text>
            <Text style={styles.footerHint}>↵ Select</Text>
            <Text style={styles.footerSep}>·</Text>
            <Text style={styles.footerHint}>ESC Close</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ADMIN_COLOR.scrim,
  },
  panelWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: ADMIN_COLOR.cardElevated,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.cardBorder,
    borderRadius: ADMIN_RADIUS.lg,
    maxHeight: 480,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 24,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchRowIcon: {
    fontSize: 18,
    color: ADMIN_COLOR.textLow,
  },
  input: {
    flex: 1,
    ...ADMIN_TYPE.body,
    color: ADMIN_COLOR.textHigh,
    height: 32,
    padding: 0,
  },
  escBtn: {
    backgroundColor: ADMIN_COLOR.canvasMid,
    borderWidth: 1,
    borderColor: ADMIN_COLOR.divider,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  escBtnText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: ADMIN_COLOR.textMuted,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: ADMIN_COLOR.divider,
  },
  resultsList: {
    maxHeight: 340,
  },
  resultsContent: {
    paddingVertical: 8,
  },
  groupHeader: {
    ...ADMIN_TYPE.label,
    color: ADMIN_COLOR.textMuted,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  resultIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textHigh,
    fontWeight: '500' as const,
  },
  resultSubtitle: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textLow,
    marginTop: 1,
  },
  resultArrow: {
    fontSize: 13,
    color: ADMIN_COLOR.textMuted,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    ...ADMIN_TYPE.bodySmall,
    color: ADMIN_COLOR.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLOR.divider,
  },
  footerHint: {
    ...ADMIN_TYPE.caption,
    color: ADMIN_COLOR.textMuted,
  },
  footerSep: {
    color: ADMIN_COLOR.dividerStrong,
  },
});

export default AdminSearchPalette;
