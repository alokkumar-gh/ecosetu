import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface GlassListItemProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  disabled?: boolean;
}

export const GlassListItem: React.FC<GlassListItemProps> = ({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  style,
  titleStyle,
  subtitleStyle,
  disabled = false,
}) => {
  const content = (
    <View style={[styles.container, style]}>
      {leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.textContainer}>
        <Text style={[styles.title, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    marginVertical: 4,
  },
  leading: {
    marginRight: spacing.spaceSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trailing: {
    marginLeft: spacing.spaceSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GlassListItem;
