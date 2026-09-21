/**
 * OfflineBanner — Backward-compatible wrapper over SyncStatusBanner
 * Automatically renders appropriate offline / sync / conflict state.
 */

import React, { memo } from 'react';
import { SyncStatusBanner } from './SyncStatusBanner';

export const OfflineBanner: React.FC = memo(() => {
  return <SyncStatusBanner />;
});

OfflineBanner.displayName = 'OfflineBanner';

export default OfflineBanner;
