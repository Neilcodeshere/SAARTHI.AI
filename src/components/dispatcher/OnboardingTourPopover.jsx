import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ONBOARDING_TOUR_STEPS } from '../../data/mockData';

export default function OnboardingTourPopover({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const step = ONBOARDING_TOUR_STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="absolute top-4 right-6 z-40 w-96 bg-[#0E282E] text-slate-100 rounded-lg shadow-2xl border border-teal-800/60 p-5 select-none animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-teal-400 hover:text-white p-1 rounded hover:bg-teal-900/40 transition"
        title="Dismiss tour"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Dispatcher Avatar with Green Border Ring */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=160&fit=crop&crop=face"
            alt="Lisa Ray"
            className="w-16 h-16 rounded-full object-cover ring-2 ring-[#5AC445] p-0.5"
          />
        </div>
      </div>

      {/* Content */}
      <div className="text-center space-y-2.5">
        <h3 className="text-base font-bold text-white tracking-tight">
          {step.title}
        </h3>
        <p className="text-xs text-slate-200 leading-relaxed font-normal text-left px-1">
          {step.description}
        </p>
      </div>

      {/* Footer controls matching reference */}
      <div className="mt-6 flex items-center justify-between pt-2 border-t border-teal-800/40 text-xs">
        <span className="italic text-teal-300/80 font-medium text-[11px]">
          Step {step.step} of {step.total}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`px-3 py-1 rounded text-xs transition border ${
              currentStepIndex === 0
                ? 'border-transparent text-teal-600 cursor-not-allowed'
                : 'border-teal-700 text-teal-200 hover:bg-teal-800/50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            className="px-3.5 py-1 rounded text-xs font-semibold bg-[#5AC445] text-slate-950 hover:bg-[#4eb33a] shadow-sm transition"
          >
            {currentStepIndex === ONBOARDING_TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
