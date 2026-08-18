export const defaultMandiUnits = [
  { unitName: 'KG', factorKg: 1 },
  { unitName: 'Bag (Bora)', factorKg: 50 },
  { unitName: 'Mann (Maund)', factorKg: 40 },
  { unitName: 'Ton', factorKg: 1000 },
  { unitName: 'Quintal', factorKg: 100 }
];

export const convertToKg = (quantity, unitName, customUnitConversions = []) => {
  const allUnits = [...defaultMandiUnits, ...customUnitConversions];
  const found = allUnits.find(u => u.unitName.toLowerCase() === unitName.toLowerCase());
  const factor = found ? found.factorKg : 1;
  return quantity * factor;
};

export const convertFromKg = (qtyKg, targetUnitName, customUnitConversions = []) => {
  const allUnits = [...defaultMandiUnits, ...customUnitConversions];
  const found = allUnits.find(u => u.unitName.toLowerCase() === targetUnitName.toLowerCase());
  const factor = found ? found.factorKg : 1;
  return qtyKg / factor;
};
