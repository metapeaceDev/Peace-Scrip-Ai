import React from 'react';
import { useTranslation } from './LanguageSwitcher';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, onStepClick }) => {
  const { t } = useTranslation();
  const steps = [
    t('studio.step1'),
    t('studio.step2'),
    t('studio.step3'),
    t('studio.step4'),
    t('studio.step5')
  ];

  return (
    <nav aria-label="Script creation steps" className="w-full px-4 sm:px-0">
      <ol className="flex items-center justify-between">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          let statusText = `Step ${stepNumber}: ${label}`;
          if (isCompleted) statusText += ' (Completed)';
          if (isActive) statusText += ' (Current Step)';

          return (
            <React.Fragment key={stepNumber}>
              <li 
                className="flex flex-col items-center text-center cursor-pointer group" 
                onClick={() => onStepClick(stepNumber)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onStepClick(stepNumber); }}
              >
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300
                    ${isActive ? 'bg-cyan-500 text-gray-900 scale-110 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : ''}
                    ${isCompleted ? 'bg-green-500 text-gray-900' : ''}
                    ${!isActive && !isCompleted ? 'bg-gray-700 text-gray-400 group-hover:bg-gray-600 group-hover:text-gray-200' : ''}
                  `}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="sr-only">{statusText}</span>
                  <span aria-hidden="true">{isCompleted ? '✔' : stepNumber}</span>
                </div>
                <p aria-hidden="true" className={`mt-2 text-xs sm:text-sm font-medium transition-colors duration-300
                  ${isActive ? 'text-cyan-400' : 'text-gray-400'}
                  ${isCompleted ? 'text-green-400' : ''}
                  group-hover:text-gray-200
                `}>
                  {label}
                </p>
              </li>
              {stepNumber < totalSteps && (
                <li className="flex-1" aria-hidden="true">
                    <div className={`h-1 mx-2 sm:mx-4 transition-colors duration-500 rounded-full
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}
                    `}></div>
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default StepIndicator;