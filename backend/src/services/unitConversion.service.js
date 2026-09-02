export const defaultMandiUnits = [
  { unitName: 'KG', aliases: ['kg', 'kgs', 'kilogram', 'kilograms'], factorKg: 1 },
  { unitName: 'Gram', aliases: ['gram', 'grams', 'gm', 'g'], factorKg: 0.001 },
  { unitName: 'Litre', aliases: ['litre', 'liter', 'ltr', 'l'], factorKg: 1 },
  { unitName: 'ML', aliases: ['ml', 'millilitre', 'milliliter'], factorKg: 0.001 },
  { unitName: 'Meter', aliases: ['meter', 'metre', 'm'], factorKg: 1 },
  { unitName: 'Piece', aliases: ['piece', 'pieces', 'pc', 'pcs'], factorKg: 1 },
  { unitName: 'Unit', aliases: ['unit', 'units'], factorKg: 1 }
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

  // Check default genuine units
  for (const def of defaultMandiUnits) {
    if (def.unitName.toLowerCase() === clean || def.aliases.some(a => a === clean)) {
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

