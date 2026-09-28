import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// Safe background message handler for FCM
try {
  const messaging = require('@react-native-firebase/messaging').default;
  if (messaging) {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      // Background message received; Android system tray displays notifications automatically
    });
  }
} catch (e) {
  // Graceful fallback if native module is not ready
}

AppRegistry.registerComponent(appName, () => App);
