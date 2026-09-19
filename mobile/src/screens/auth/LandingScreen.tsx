import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthStackParamList } from '../../navigation/types';
import { EcoCarousel } from '../../components/auth/carousel';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { STORAGE_KEYS } from '../../utils/constants';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

export const LandingScreen: React.FC<Props> = ({ navigation, route }) => {
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkCompletion = async () => {
      try {
        if (route?.params?.forceShow) {
          if (isMounted) setCheckingStatus(false);
          return;
        }
        const completed = await AsyncStorage.getItem(STORAGE_KEYS.CAROUSEL_COMPLETED);
        if (completed === 'true' && isMounted) {
          navigation.replace('Login');
          return;
        }
      } catch {
        // Fall back to displaying carousel on storage read error
      } finally {
        if (isMounted) {
          setCheckingStatus(false);
        }
      }
    };

    checkCompletion();

    return () => {
      isMounted = false;
    };
  }, [navigation, route?.params?.forceShow]);

  const handleFinishCarousel = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CAROUSEL_COMPLETED, 'true');
    } catch {
      // Continue to Login even if storage write fails
    }
    navigation.replace('Login');
  };

  if (checkingStatus) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel="Loading ECOSETU">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  return (
    <View style={styles.container}>
      <EcoCarousel
        onComplete={handleFinishCarousel}
        onSkip={handleFinishCarousel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default LandingScreen;
