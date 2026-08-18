import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { logAuditEvent } from '../services/audit.service.js';

export const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ shop_id: req.shop_id, role: 'Employee' }).select('-password');
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
        id: employee._id,
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

    const employee = await User.findOneAndUpdate(
      { _id: id, shop_id: req.shop_id, role: 'Employee' },
      { $set: { permissions } },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    return res.json({ success: true, employee });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
