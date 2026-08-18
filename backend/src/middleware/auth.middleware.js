import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ghalla_mandi_super_secret_jwt_key_production_2026');
    req.user = decoded;
    req.shop_id = decoded.shop_id;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired authentication token' });
  }
};
