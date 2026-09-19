/**
 * GlassScreen
 * Standard top-level screen layout container.
 * Wraps content in SafeAreaView + GlassBackground with optional ScrollView.
 */

import React, { memo } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  ViewStyle,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from './GlassBackground';
import { spacing } from '../../theme/spacing';

interface GlassScreenProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  testID?: string;
  keyboardAvoiding?: boolean;
}

export const GlassScreen: React.FC<GlassScreenProps> = memo(({
  children,
  header,
  scrollable = true,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  testID = 'glass-screen',
  keyboardAvoiding = false,
}) => {
  const content = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0F2942', '#059669']}
            tintColor="#0F2942"
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.nonScrollContent, contentContainerStyle]}>{children}</View>
  );

  const wrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <GlassBackground style={style} testID={testID}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {header}
        {wrapped}
      </SafeAreaView>
    </GlassBackground>
  );
});

GlassScreen.displayName = 'GlassScreen';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  nonScrollContent: {
    flex: 1,
    padding: spacing.spaceMd,
  },
});

export default GlassScreen;
