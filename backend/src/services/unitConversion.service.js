export const defaultMandiUnits = [
  { unitName: 'KG', aliases: ['kg', 'kgs', 'kilogram', 'kilograms'], factorKg: 1 },
  { unitName: 'Mann (Maund)', aliases: ['mann', 'maund', 'mon', 'mann (40 kg)', 'mann (maund)', 'maunds'], factorKg: 40 },
  { unitName: 'Bag (Bora)', aliases: ['bag', 'bags', 'bori', 'bora', 'bag (bora)', 'bori (50 kg)', 'bag (50kg)', 'bori (50kg)'], factorKg: 50 },
  { unitName: 'Ton', aliases: ['ton', 'tons', 'tonne', 'tonnes', 'metric ton'], factorKg: 1000 },
  { unitName: 'Quintal', aliases: ['quintal', 'quintals', 'qtl'], factorKg: 100 },
  { unitName: 'Gram', aliases: ['gram', 'grams', 'gm', 'g'], factorKg: 0.001 }
];

export const getUnitFactor = (unitName = 'KG', customUnitConversions = []) => {
  if (!unitName || typeof unitName !== 'string') return 1;
  const clean = unitName.trim().toLowerCase();

  // Check custom conversions first
  for (const cu of customUnitConversions) {
    if (cu.unitName && cu.unitName.toLowerCase() === clean) {
      return Number(cu.factorKg) || 1;
    }
  }

  // Check default Mandi units and aliases
  for (const def of defaultMandiUnits) {
    if (def.unitName.toLowerCase() === clean || def.aliases.some(a => a === clean || clean.includes(a))) {
      return def.factorKg;
    }
  }

  return 1;
};

export const convertToKg = (quantity, unitName, customUnitConversions = []) => {
  const qtyNum = Number(quantity) || 0;
  const factor = getUnitFactor(unitName, customUnitConversions);
  return qtyNum * factor;
};

export const convertFromKg = (qtyKg, targetUnitName, customUnitConversions = []) => {
  const kgNum = Number(qtyKg) || 0;
  const factor = getUnitFactor(targetUnitName, customUnitConversions);
  return factor > 0 ? kgNum / factor : kgNum;
};
