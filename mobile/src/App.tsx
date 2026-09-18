import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import { RootNavigator } from './navigation/RootNavigator';
import { OfflineBanner } from './components/common/OfflineBanner';
import { colors } from './theme/colors';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NetworkProvider>
          <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
            <OfflineBanner />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </View>
        </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
