import crypto from 'crypto';

export const cryptoNativeUUID = () => {
  return crypto.randomUUID();
};
