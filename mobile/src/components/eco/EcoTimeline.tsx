/**
 * EcoTimeline — Glassmorphic Request/Consignment Lifecycle Timeline
 * Clear visual representation of events with luminous progress nodes.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { AppIcon } from '../ui/AppIcon';

export interface TimelineStep {
  id: string;
  title: string;
  subtitle?: string;
  timestamp?: string;
  status: 'completed' | 'active' | 'upcoming';
}

interface EcoTimelineProps {
  steps: TimelineStep[];
  style?: ViewStyle;
}

export const EcoTimeline: React.FC<EcoTimelineProps> = memo(({ steps, style }) => {
  return (
    <View style={[styles.container, style]}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isDone = step.status === 'completed';
        const isActive = step.status === 'active';

        return (
          <View key={step.id} style={styles.stepRow}>
            {/* Timeline track + dot */}
            <View style={styles.trackContainer}>
              <View
                style={[
                  styles.node,
                  isDone && styles.nodeDone,
                  isActive && styles.nodeActive,
                ]}
              >
                {isDone && <AppIcon name="check" size={11} color="#03120E" strokeWidth={3} />}
                {isActive && <View style={styles.innerDot} />}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    isDone && styles.connectorDone,
                  ]}
                />
              )}
            </View>

            {/* Step content */}
            <View style={styles.contentContainer}>
              <Text
                style={[
                  styles.title,
                  isDone && styles.titleDone,
                  isActive && styles.titleActive,
                ]}
              >
                {step.title}
              </Text>
              {Boolean(step.subtitle) && (
                <Text style={styles.subtitle}>{step.subtitle}</Text>
              )}
              {Boolean(step.timestamp) && (
                <Text style={styles.timestamp}>{step.timestamp}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
});

EcoTimeline.displayName = 'EcoTimeline';

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.spaceSm,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  trackContainer: {
    alignItems: 'center',
    width: 28,
  },
  node: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: '#071A21',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  nodeDone: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  nodeActive: {
    borderColor: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  checkText: {
    color: '#03120E',
    fontSize: 11,
    fontWeight: '800',
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 2,
  },
  connectorDone: {
    backgroundColor: '#10B981',
  },
  contentContainer: {
    flex: 1,
    paddingLeft: spacing.spaceMd,
    paddingBottom: spacing.spaceMd,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  titleDone: {
    color: '#F1F5F9',
  },
  titleActive: {
    color: '#34D399',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});

export default EcoTimeline;
