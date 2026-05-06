import { useState, useEffect } from 'react';
import { useUserProgress } from '../contexts/UserProgressContext';
import { AchievementSequenceModal } from './AchievementSequenceModal';
import { XPRewardModal } from './XPRewardModal';
import { NoRewardModal } from './NoRewardModal';

export function GlobalRewardManager() {
  const { pendingReward, pendingNoReward, clearReward, clearNoReward, totalXP } = useUserProgress();
  const [phase, setPhase] = useState<'idle' | 'achievements' | 'xp'>('idle');

  // React to new pending rewards
  useEffect(() => {
    if (pendingReward) {
      if (pendingReward.unlockedAchievements && pendingReward.unlockedAchievements.length > 0) {
        setPhase('achievements');
      } else {
        setPhase('xp');
      }
    } else {
      setPhase('idle');
    }
  }, [pendingReward]);

  if (pendingNoReward) {
    return (
      <div className="absolute inset-0 z-[10000]">
        <NoRewardModal
          type={pendingNoReward.type}
          videoTitle={pendingNoReward.videoTitle}
          onClose={clearNoReward}
          onRewatch={clearNoReward}
        />
      </div>
    );
  }

  if (!pendingReward) return null;

  return (
    <div className="absolute inset-0 z-[10000] pointer-events-none">
      <div className="pointer-events-auto">
        {phase === 'achievements' && (
          <AchievementSequenceModal
            achievements={pendingReward.unlockedAchievements}
            onComplete={() => setPhase('xp')}
          />
        )}
        
        {phase === 'xp' && (
          <XPRewardModal
            reward={pendingReward}
            totalXP={totalXP}
            nextVideo={pendingReward.nextVideo}
            onClose={() => {
              setPhase('idle');
              clearReward();
            }}
          />
        )}
      </div>
    </div>
  );
}
