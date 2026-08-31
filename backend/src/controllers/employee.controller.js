import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { logAuditEvent } from '../services/audit.service.js';

export const getEmployees = async (req, res) => {
  try {
    const allUsers = await User.find({ shop_id: req.shop_id });
    const employees = allUsers
      .filter(u => u.role === 'Employee')
      .map(({ password, ...u }) => u);
    return res.json({ success: true, employees });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { fullName, email, phone, password, permissions = [] } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = await User.create({
      shop_id: req.shop_id,
      fullName,
      email: email.toLowerCase(),
      phone: phone || '',
      password: hashedPassword,
      role: 'Employee',
      permissions: permissions.length ? permissions : ['sales:add', 'inventory:view', 'customers:view']
    });

    await logAuditEvent({
      shop_id: req.shop_id,
      userId: req.user.userId,
      userName: req.user.fullName,
      action: 'CREATE_EMPLOYEE',
      entity: 'Employee',
      details: `Created employee account for ${fullName}`
    });

    return res.status(201).json({
      success: true,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        permissions: employee.permissions
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEmployeePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const user = await User.findById(id);
    if (!user || user.shop_id !== req.shop_id || user.role !== 'Employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const updated = await User.updateOne({ id }, { permissions });
    const { password, ...safeEmployee } = updated;

    return res.json({ success: true, employee: safeEmployee });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
