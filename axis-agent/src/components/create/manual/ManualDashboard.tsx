import { useIsMobile } from '../../../hooks/useIsMobile';
import { useManualDashboard } from '../../../hooks/useManualDashboard';
import { useTokenPreferences } from '../../../hooks/useTokenPreferences';
import { MobileBuilder } from './MobileBuilder';
import { DesktopBuilder } from './DesktopBuilder';
import { IdentityStep } from './IdentityStep';
import type { ManualDashboardProps } from './types';

// Re-export types for consumers (e.g. KagemushaFlow.tsx)
export type { ManualData } from './types';

export const ManualDashboard = ({
  onDeploySuccess,
  onBack,
  initialConfig,
  initialTokens,
}: ManualDashboardProps) => {
  const isMobile = useIsMobile();
  const preferences = useTokenPreferences();
  const dashboard = useManualDashboard({
    onDeploySuccess,
    initialConfig,
    initialTokens,
    verifiedOnly: preferences.verifiedOnly,
  });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col h-[100dvh] bg-black text-white overflow-hidden font-sans">
      {dashboard.step === 'builder' &&
        (isMobile ? (
          <MobileBuilder dashboard={dashboard} preferences={preferences} onBack={onBack} />
        ) : (
          <DesktopBuilder dashboard={dashboard} preferences={preferences} onBack={onBack} />
        ))}

      <IdentityStep
        visible={dashboard.step === 'identity'}
        config={dashboard.config}
        setConfig={dashboard.setConfig}
        focusedField={dashboard.focusedField}
        setFocusedField={dashboard.setFocusedField}
        portfolioCount={dashboard.portfolio.length}
        connected={dashboard.connected}
        onBack={dashboard.handleBackToBuilder}
        onDeploy={dashboard.handleDeploy}
        onGenerateRandomTicker={dashboard.generateRandomTicker}
      />
    </div>
  );
};
