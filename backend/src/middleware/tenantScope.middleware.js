export const requireTenant = (req, res, next) => {
  if (!req.shop_id) {
    return res.status(400).json({
      success: false,
      message: 'Tenant context missing (shop_id missing from session)'
    });
  }
  next();
};
