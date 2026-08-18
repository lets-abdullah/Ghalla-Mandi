import { AuditLog } from '../models/auditLog.model.js';

export const logAuditEvent = async ({ shop_id, userId, userName, action, entity, details }) => {
  try {
    await AuditLog.create({
      shop_id,
      userId: userId || 'SYSTEM',
      userName: userName || 'System User',
      action,
      entity,
      details
    });
  } catch (err) {
    console.error('Failed to log audit event:', err.message);
  }
};
