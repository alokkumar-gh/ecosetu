/**
 * WorkQueue
 * The "TODAY" work queue concept.
 * Shows actionable items in a clean timeline list.
 * NOT a task management dashboard — just simple, direct day summary.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type WorkItemStatus = 'done' | 'action' | 'pending' | 'info';

export interface WorkItem {
  id: string;
  label: string;
  status: WorkItemStatus;
  onPress?: () => void;
  actionLabel?: string;
}

interface WorkQueueProps {
  items: WorkItem[];
  title?: string;
}

const STATUS_CONFIG: Record<WorkItemStatus, { icon: string; color: string; dotColor: string }> = {
  done:    { icon: '✓', color: 'rgba(255,255,255,0.35)', dotColor: '#10B981' },
  action:  { icon: '●', color: '#FFFFFF',                dotColor: '#F59E0B' },
  pending: { icon: '○', color: 'rgba(255,255,255,0.55)', dotColor: '#64748B' },
  info:    { icon: '·', color: 'rgba(255,255,255,0.45)', dotColor: '#06B6D4' },
};

export const WorkQueue: React.FC<WorkQueueProps> = ({ items, title = 'TODAY' }) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.list}>
        {items.map((item, idx) => {
          const cfg = STATUS_CONFIG[item.status];
          const isDone = item.status === 'done';
          const isAction = item.status === 'action';

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.row, idx < items.length - 1 && styles.rowBorder]}
              onPress={item.onPress}
              disabled={!item.onPress}
              activeOpacity={item.onPress ? 0.7 : 1}
              accessibilityRole={item.onPress ? 'button' : 'text'}
            >
              {/* Timeline dot + line */}
              <View style={styles.timelineCol}>
                <View style={[styles.dot, { backgroundColor: cfg.dotColor }]} />
                {idx < items.length - 1 && <View style={styles.line} />}
              </View>

              {/* Label */}
              <View style={styles.labelCol}>
                <Text
                  style={[
                    styles.label,
                    { color: cfg.color, textDecorationLine: isDone ? 'line-through' : 'none' },
                  ]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </View>

              {/* Action button */}
              {isAction && item.actionLabel && item.onPress && (
                <View style={styles.actionPill}>
                  <Text style={styles.actionPillText}>{item.actionLabel}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  list: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  timelineCol: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
    minHeight: 16,
  },
  labelCol: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  actionPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
    alignSelf: 'center',
  },
  actionPillText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default WorkQueue;
