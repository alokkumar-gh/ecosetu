/**
 * EcoSetu Global Navigation Reference
 * Allows safe programmatic navigation from global components (like Eco-Saathi).
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigateSafely(name: string, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate(name, params);
  } else {
    console.warn(`[NavigationRef] Cannot navigate to "${name}". NavigationContainer is not ready.`);
  }
}
