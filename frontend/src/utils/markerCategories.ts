export const RISK_CATEGORIES = [
  'abuse',
  'poison',
  'trap',
  'theft',
  'missing_pet',
  'suspicious_vehicle',
];

export const ADOPTION_CATEGORY = 'nearby_adoption';

export const isRiskCategory = (category: string) => RISK_CATEGORIES.includes(category);

export const isAdoptionCategory = (category: string) => category === ADOPTION_CATEGORY;

export const getMarkerCategoryTone = (category: string) => {
  if (isRiskCategory(category)) {
    return {
      badgeClass: 'bg-amber-950/60 text-amber-200 border border-amber-700/70',
      markerColor: '#D58B2A',
      icon: '!',
    };
  }

  if (isAdoptionCategory(category)) {
    return {
      badgeClass: 'bg-[#3A2228] text-[#FF9AA8] border border-[#FF9AA8]/50',
      markerColor: '#FF6B57',
      icon: '♡',
    };
  }

  return {
    badgeClass: 'bg-[#25372F] text-[#7ED6A6] border border-[#4CB782]/50',
    markerColor: '#4CB782',
    icon: '♥',
  };
};
