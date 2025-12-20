import React, { useState, useMemo } from 'react';
import type { Character, ParamiPortfolio, AnusayaProfile } from '../types';
import { isFeatureEnabled } from '../config/featureFlags';
import {
  ParamiEvolutionChart,
  CittaMomentVisualizer,
  AnusayaStrengthIndicator,
  KarmaTimelineView,
} from './buddhist-psychology';

// Define KarmaAction type locally (matching KarmaTimelineView's interface)
export interface KarmaAction {
  id: string;
  timestamp: number;
  type: 'kaya' | 'vaca' | 'mano';
  classification: 'kusala' | 'akusala';
  intensity: number;
  description: string;
  effects: {
    paramiGains?: Record<string, number>;
    anusayaChanges?: Record<string, number>;
    cetanaStrength?: number;
  };
  scene?: number;
  character?: string;
}

interface PsychologyDashboardProps {
  character: Character;
  compact?: boolean;
  userId?: string;
}

/**
 * Psychology Dashboard - Unified view of Buddhist Psychology for a character
 *
 * Combines 4 Phase 3 components:
 * 1. ParamiEvolutionChart - 10 Perfections progress
 * 2. CittaMomentVisualizer - 17-moment mind process
 * 3. AnusayaStrengthIndicator - 7 latent tendencies
 * 4. KarmaTimelineView - Karma action timeline
 *
 * Protected by feature flags for gradual rollout
 */
export const PsychologyDashboard: React.FC<PsychologyDashboardProps> = ({
  character,
  compact = false,
  userId,
}) => {
  const [activeView, setActiveView] = useState<
    'overview' | 'parami' | 'citta' | 'anusaya' | 'karma'
  >('overview');

  // Feature flag checks
  const showParamiChart = isFeatureEnabled('PARAMI_SYNERGY_MATRIX', userId);
  const showCittaVisualizer = isFeatureEnabled('CITTA_MOMENT_VISUALIZATION', userId);
  const showAnusayaIndicator = isFeatureEnabled('ANUSAYA_STRENGTH_DISPLAY', userId);
  const showKarmaTimeline = isFeatureEnabled('KARMA_TIMELINE_VIEW', userId);

  // Data preparation
  const paramiPortfolio = character.parami_portfolio || getDefaultParamiPortfolio();
  const anusayaProfile = character.buddhist_psychology?.anusaya || getDefaultAnusayaProfile();
  const karmaActions = useMemo(() => {
    return extractKarmaActionsFromTimeline(character);
  }, [character]);

  // Sample sensory input for Citta visualization (can be dynamic later)
  const sampleSensoryInput = {
    door: 'eye' as const,
    type: 'visual object',
    intensity: 75,
  };

  // Sample decision for Citta visualization (can be from character's recent action)
  const sampleDecision = 'kusala' as const;

  // If all features disabled, show fallback
  if (!showParamiChart && !showCittaVisualizer && !showAnusayaIndicator && !showKarmaTimeline) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="text-center text-gray-400 py-8">
          <svg
            className="mx-auto h-12 w-12 mb-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-sm font-medium mb-2">Buddhist Psychology Features</p>
          <p className="text-xs text-gray-500">
            Advanced psychology visualization features are currently in development.
          </p>
          <p className="text-xs text-gray-600 mt-2">Contact admin for beta access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <svg
                className="h-6 w-6 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Buddhist Psychology Profile</h3>
              <p className="text-xs text-gray-400">{character.name} • Digital Mind Model v14</p>
            </div>
          </div>
          {!compact && (
            <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
              <ViewTab
                active={activeView === 'overview'}
                onClick={() => setActiveView('overview')}
                icon="⊞"
                label="All"
              />
              {showParamiChart && (
                <ViewTab
                  active={activeView === 'parami'}
                  onClick={() => setActiveView('parami')}
                  icon="✧"
                  label="Parami"
                />
              )}
              {showCittaVisualizer && (
                <ViewTab
                  active={activeView === 'citta'}
                  onClick={() => setActiveView('citta')}
                  icon="◉"
                  label="Citta"
                />
              )}
              {showAnusayaIndicator && (
                <ViewTab
                  active={activeView === 'anusaya'}
                  onClick={() => setActiveView('anusaya')}
                  icon="⚠"
                  label="Anusaya"
                />
              )}
              {showKarmaTimeline && (
                <ViewTab
                  active={activeView === 'karma'}
                  onClick={() => setActiveView('karma')}
                  icon="⧗"
                  label="Karma"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Overview - Show all enabled components */}
        {activeView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {showParamiChart && (
              <ComponentCard title="Parami Evolution" icon="✧">
                <ParamiEvolutionChart
                  portfolio={paramiPortfolio}
                  showSynergy
                  compact={compact}
                  animated
                />
              </ComponentCard>
            )}
            {showAnusayaIndicator && (
              <ComponentCard title="Anusaya Strength" icon="⚠">
                <AnusayaStrengthIndicator
                  anusaya={anusayaProfile}
                  paramiPortfolio={paramiPortfolio}
                  showResistance
                  compact={compact}
                />
              </ComponentCard>
            )}
            {showCittaVisualizer && (
              <ComponentCard title="Mind Process (Citta)" icon="◉">
                <CittaMomentVisualizer
                  sensoryInput={sampleSensoryInput}
                  decision={sampleDecision}
                  autoPlay={false}
                  speed={1}
                />
              </ComponentCard>
            )}
            {showKarmaTimeline && (
              <ComponentCard title="Karma Timeline" icon="⧗">
                <KarmaTimelineView
                  actions={karmaActions}
                  maxDisplay={5}
                  compact={compact}
                  showFilters={false}
                />
              </ComponentCard>
            )}
          </div>
        )}

        {/* Individual Views */}
        {activeView === 'parami' && showParamiChart && (
          <ParamiEvolutionChart portfolio={paramiPortfolio} showSynergy compact={false} animated />
        )}

        {activeView === 'citta' && showCittaVisualizer && (
          <CittaMomentVisualizer
            sensoryInput={sampleSensoryInput}
            decision={sampleDecision}
            autoPlay={false}
            speed={1}
          />
        )}

        {activeView === 'anusaya' && showAnusayaIndicator && (
          <AnusayaStrengthIndicator
            anusaya={anusayaProfile}
            paramiPortfolio={paramiPortfolio}
            showResistance
            compact={false}
          />
        )}

        {activeView === 'karma' && showKarmaTimeline && (
          <KarmaTimelineView actions={karmaActions} maxDisplay={20} compact={false} showFilters />
        )}
      </div>
    </div>
  );
};

// Helper component for view tabs
const ViewTab: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      px-3 py-1.5 rounded-md text-xs font-medium transition-all
      ${
        active
          ? 'bg-purple-600 text-white shadow-lg'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
      }
    `}
  >
    <span className="mr-1.5">{icon}</span>
    {label}
  </button>
);

// Helper component for cards
const ComponentCard: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
    <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
      <span className="text-purple-400">{icon}</span>
      {title}
    </h4>
    {children}
  </div>
);

// Helper function: Default Parami Portfolio
function getDefaultParamiPortfolio(): ParamiPortfolio {
  return {
    dana: { level: 1, exp: 0 },
    sila: { level: 1, exp: 0 },
    nekkhamma: { level: 1, exp: 0 },
    panna: { level: 1, exp: 0 },
    viriya: { level: 1, exp: 0 },
    khanti: { level: 1, exp: 0 },
    sacca: { level: 1, exp: 0 },
    adhitthana: { level: 1, exp: 0 },
    metta: { level: 1, exp: 0 },
    upekkha: { level: 1, exp: 0 },
  };
}

// Helper function: Default Anusaya Profile
function getDefaultAnusayaProfile(): AnusayaProfile {
  return {
    kama_raga: 50,
    patigha: 50,
    mana: 50,
    ditthi: 50,
    vicikiccha: 50,
    bhava_raga: 50,
    avijja: 50,
  };
}

// Helper function: Extract Karma Actions from Character Timeline
function extractKarmaActionsFromTimeline(character: Character): KarmaAction[] {
  // Check if character has psychology timeline with changes
  if (!character.psychology_timeline?.changes) {
    // Return sample data for demonstration if no timeline exists
    return generateSampleKarmaActions(character);
  }

  // Convert psychology changes to karma actions
  const karmaActions: KarmaAction[] = [];

  character.psychology_timeline.changes.forEach((change, index) => {
    // Extract karma-related changes and convert to KarmaAction format
    if (change.parami_delta) {
      const paramiKeys = Object.keys(change.parami_delta);
      paramiKeys.forEach(key => {
        const delta = change.parami_delta?.[key as keyof ParamiPortfolio];
        if (delta && delta !== 0) {
          karmaActions.push({
            id: `karma-${change.sceneNumber || index}-${key}`,
            timestamp: Date.now() - index * 3600000,
            type: guessActionType(key),
            classification: delta > 0 ? 'kusala' : 'akusala',
            intensity: Math.abs(delta) * 10,
            description: `${key} ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}`,
            effects: {
              paramiGains: { [key]: delta },
            },
            scene: change.sceneNumber,
            character: character.name,
          });
        }
      });
    }
  });

  return karmaActions.slice(0, 20); // Return recent 20
}

// Helper: Guess action type from parami key
function guessActionType(paramiKey: string): 'kaya' | 'vaca' | 'mano' {
  const bodyActions = ['viriya', 'nekkhamma'];
  const speechActions = ['sacca', 'metta'];

  if (bodyActions.includes(paramiKey)) return 'kaya';
  if (speechActions.includes(paramiKey)) return 'vaca';
  return 'mano';
}

// Helper: Generate sample karma actions for characters without timeline
function generateSampleKarmaActions(character: Character): KarmaAction[] {
  const actions: KarmaAction[] = [];
  const now = Date.now();

  // Sample actions based on character's existing parami portfolio
  const portfolio = character.parami_portfolio;
  if (!portfolio) return [];

  const samples = [
    {
      parami: 'dana',
      description: 'Shared food with a stranger',
      type: 'kaya' as const,
      classification: 'kusala' as const,
    },
    {
      parami: 'sila',
      description: 'Kept moral precepts throughout the day',
      type: 'kaya' as const,
      classification: 'kusala' as const,
    },
    {
      parami: 'metta',
      description: 'Spoke words of encouragement',
      type: 'vaca' as const,
      classification: 'kusala' as const,
    },
    {
      parami: 'panna',
      description: 'Reflected on impermanence',
      type: 'mano' as const,
      classification: 'kusala' as const,
    },
  ];

  samples.forEach((sample, index) => {
    const paramiLevel = portfolio[sample.parami as keyof ParamiPortfolio]?.level || 1;
    actions.push({
      id: `sample-${character.id}-${index}`,
      timestamp: now - index * 7200000,
      type: sample.type,
      classification: sample.classification,
      intensity: paramiLevel * 10,
      description: sample.description,
      effects: {
        paramiGains: { [sample.parami]: paramiLevel },
      },
      character: character.name,
    });
  });

  return actions;
}

