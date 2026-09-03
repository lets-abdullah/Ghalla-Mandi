import React from 'react';

export const CurrencyDisplay = ({
  amount = 0,
  currency = 'Rs.',
  showSign = false,
  className = ''
}) => {
  const num = Number(amount) || 0;
  const formatted = Math.abs(num).toLocaleString('en-PK', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

  const sign = num > 0 && showSign ? '+' : (num < 0 ? '-' : '');

  return (
    <span className={`font-mono font-bold ${className}`}>
      {sign} {currency} {formatted}
    </span>
  );
};

export default CurrencyDisplay;
