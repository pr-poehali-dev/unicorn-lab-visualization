import React from 'react';
import AIAssistant from '@/components/AIAssistant';
import { Entrepreneur } from '@/types/entrepreneur';

interface DesktopViewProps {
  showAIAssistant: boolean;
  filteredEntrepreneurs: Entrepreneur[];
  onAISelectUsers: (userIds: string[]) => void;
}

const DesktopView: React.FC<DesktopViewProps> = ({
  showAIAssistant,
  filteredEntrepreneurs,
  onAISelectUsers
}) => {
  if (!showAIAssistant) return null;

  return (
    <div className="w-[400px] border-r border-border flex-shrink-0 bg-background">
      <AIAssistant
        entrepreneurs={filteredEntrepreneurs}
        onSelectUsers={onAISelectUsers}
        isVisible={true}
      />
    </div>
  );
};

export default DesktopView;