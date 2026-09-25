import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import { I18nProvider } from './i18n';
import { RootNavigator } from './navigation/RootNavigator';
import { navigationRef } from './navigation/navigationRef';
import { EcoSaathiProvider } from './context/EcoSaathiContext';
import { EcoSaathiButton } from './components/eco/EcoSaathiButton';
import { EcoSaathiChatModal } from './components/eco/EcoSaathiChatModal';
import { OfflineBanner } from './components/common/OfflineBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { colors } from './theme/colors';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
      <AuthProvider>
        <NetworkProvider>
          <I18nProvider>
            <View style={styles.container}>
              <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDeep} />
              <OfflineBanner />
              <NavigationContainer ref={navigationRef}>
                <EcoSaathiProvider>
                  <View style={styles.appWrapper}>
                    <RootNavigator />
                    <EcoSaathiButton />
                    <EcoSaathiChatModal />
                  </View>
                </EcoSaathiProvider>
              </NavigationContainer>
            </View>
          </I18nProvider>
        </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },
  appWrapper: {
    flex: 1,
    position: 'relative',
  },
});

export default App;
