import React from 'react';
import { User, Shirt, ArrowRightLeft, HelpCircle } from 'lucide-react';

export type SlotType = 'front' | 'back' | 'side' | 'garment_front' | 'garment_back';

interface PoseGuideProps {
  slotType: SlotType;
}

export const PoseGuide: React.FC<PoseGuideProps> = ({ slotType }) => {
  const guideData = {
    front: {
      title: 'Shopper Front Pose',
      icon: User,
      rules: [
        'Full body visible from head to soles of feet',
        'Standing straight, facing the camera directly',
        'Arms slightly away from torso (15°)',
        'Plain background, even lighting',
      ],
      diagram: (
        <svg viewBox="0 0 100 130" className="w-12 h-16 text-slate-700 mx-auto">
          {/* Head */}
          <circle cx="50" cy="18" r="10" fill="currentColor" opacity="0.8" />
          {/* Torso */}
          <path d="M42,32 L58,32 L55,75 L45,75 Z" fill="currentColor" opacity="0.9" />
          {/* Arms out 15 degrees */}
          <path d="M42,33 L30,68 M58,33 L70,68" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          {/* Legs straight */}
          <path d="M46,75 L44,120 M54,75 L56,120" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          {/* Feet */}
          <ellipse cx="42" cy="122" rx="5" ry="2" fill="currentColor" />
          <ellipse cx="58" cy="122" rx="5" ry="2" fill="currentColor" />
        </svg>
      ),
    },
    back: {
      title: 'Shopper Back Pose',
      icon: ArrowRightLeft,
      rules: [
        'Same distance and camera height as front',
        'Back turned squarely to camera',
        'Upright posture, arms relaxed at sides',
        'Full body head to toe visible',
      ],
      diagram: (
        <svg viewBox="0 0 100 130" className="w-12 h-16 text-slate-700 mx-auto">
          <circle cx="50" cy="18" r="10" fill="currentColor" opacity="0.9" />
          <path d="M41,32 L59,32 L56,75 L44,75 Z" fill="currentColor" opacity="0.9" />
          <path d="M41,33 L30,68 M59,33 L70,68" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M46,75 L44,120 M54,75 L56,120" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="42" cy="122" rx="4" ry="2" fill="currentColor" />
          <ellipse cx="58" cy="122" rx="4" ry="2" fill="currentColor" />
        </svg>
      ),
    },
    side: {
      title: 'Shopper Side Profile',
      icon: User,
      rules: [
        'Improves chest & waist depth accuracy',
        'Turned 90° sideways in true profile',
        'Standing tall, arms resting naturally',
        'Replaces prior assumptions with real depth',
      ],
      diagram: (
        <svg viewBox="0 0 100 130" className="w-12 h-16 text-slate-700 mx-auto">
          <circle cx="48" cy="18" r="10" fill="currentColor" opacity="0.85" />
          <path d="M44,32 L54,32 L52,75 L46,75 Z" fill="currentColor" opacity="0.9" />
          <path d="M48,34 L47,70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M49,75 L48,120" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="52" cy="122" rx="6" ry="2" fill="currentColor" />
        </svg>
      ),
    },
    garment_front: {
      title: 'Garment Front Shot',
      icon: Shirt,
      rules: [
        'Flat lay or on hanger / mannequin',
        'Clear view of front collar, buttons, details',
        'Even neutral background',
        'Unwrinkled, smoothed flat',
      ],
      diagram: (
        <svg viewBox="0 0 100 130" className="w-12 h-16 text-slate-700 mx-auto">
          <path d="M35,35 L45,42 L55,42 L65,35 L80,50 L72,58 L62,50 L62,95 L38,95 L38,50 L28,58 L20,50 Z" fill="currentColor" opacity="0.8" />
          <line x1="50" y1="42" x2="50" y2="95" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      ),
    },
    garment_back: {
      title: 'Garment Back Shot',
      icon: Shirt,
      rules: [
        'Flat lay or hanger showing garment back',
        'Shows yoke, pleats, and back hem shape',
        'Same lighting and scale as garment front',
        'Smooth and fully uncurled',
      ],
      diagram: (
        <svg viewBox="0 0 100 130" className="w-12 h-16 text-slate-700 mx-auto">
          <path d="M35,35 L45,39 L55,39 L65,35 L80,50 L72,58 L62,50 L62,95 L38,95 L38,50 L28,58 L20,50 Z" fill="currentColor" opacity="0.8" />
          <path d="M42,50 Q50,53 58,50" stroke="#ffffff" strokeWidth="1.5" fill="none" />
        </svg>
      ),
    },
  }[slotType];

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600">
      <div className="flex items-center gap-2 mb-2 font-medium text-slate-800">
        <guideData.icon className="w-4 h-4 text-indigo-600" />
        <span>{guideData.title}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-white rounded-lg p-1.5 border border-slate-200/60 shadow-xs shrink-0">
          {guideData.diagram}
        </div>
        <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-500">
          {guideData.rules.map((rule, idx) => (
            <li key={idx} className="leading-tight">
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
