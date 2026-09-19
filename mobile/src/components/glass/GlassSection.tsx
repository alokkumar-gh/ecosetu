import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface GlassSectionProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export const GlassSection: React.FC<GlassSectionProps> = ({
  title,
  subtitle,
  action,
  children,
  style,
  titleStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      {(title || action) && (
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            {title ? (
              <Text style={[styles.title, titleStyle]}>{title}</Text>
            ) : null}
            {subtitle ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : null}
          </View>
          {action && <View style={styles.actionContainer}>{action}</View>}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.spaceSm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
    paddingHorizontal: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionContainer: {
    marginLeft: spacing.spaceSm,
  },
  content: {
    // Child items wrapper
  },
});

export default GlassSection;
