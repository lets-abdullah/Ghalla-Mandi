import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Shop } from '../models/shop.model.js';
import { User } from '../models/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ghalla_mandi_super_secret_jwt_key_production_2026';

export const login = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ success: false, message: 'Email/Phone and password are required' });
    }

    const query = emailOrPhone.includes('@')
      ? { email: emailOrPhone.toLowerCase() }
      : { phone: emailOrPhone.trim() };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email/phone or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email/phone or password' });
    }

    const shop = await Shop.findOne({ shop_id: user.shop_id });

    const token = jwt.sign(
      { userId: user.id, shop_id: user.shop_id, email: user.email, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, shop_id: user.shop_id },
      shop: shop ? { shop_id: shop.shop_id, name: shop.name, ownerName: shop.ownerName, city: shop.city, phone: shop.phone, address: shop.address } : null
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, message: 'Server login error' });
  }
};

export const register = async (req, res) => {
  try {
    const { shopName, ownerName, phone, email, password, city, address } = req.body;

    if (!email || !password || !ownerName || !shopName) {
      return res.status(400).json({ success: false, message: 'Owner name, shop name, email, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const shop_id = `shp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newShop = await Shop.create({
      shop_id,
      name: shopName,
      ownerName,
      phone: phone || '',
      email: normalizedEmail,
      address: address || '',
      city: city || 'Faisalabad Mandi'
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      shop_id,
      email: normalizedEmail,
      phone: phone || '',
      password: hashedPassword,
      fullName: ownerName
    });

    const token = jwt.sign(
      { userId: newUser.id, shop_id: newUser.shop_id, email: newUser.email, fullName: newUser.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account and Shop successfully registered!',
      token,
      user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email, phone: newUser.phone, shop_id: newUser.shop_id },
      shop: { shop_id: newShop.shop_id, name: newShop.name, ownerName: newShop.ownerName, city: newShop.city, phone: newShop.phone, email: newShop.email, address: newShop.address }
    });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error during registration' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const shop = await Shop.findOne({ shop_id: req.shop_id });

    if (!user || !shop) {
      return res.status(404).json({ success: false, message: 'User or Shop record not found' });
    }

    const { password, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      user: userWithoutPassword,
      shop
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const shop_id = req.shop_id;

    const { fullName, phone, email, currentPassword, newPassword, shopName, city, address } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found' });
    }

    let updatedPassword = undefined;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }
      const salt = await bcrypt.genSalt(10);
      updatedPassword = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await User.updateOne(
      { id: userId },
      {
        fullName: fullName || user.fullName,
        phone: phone !== undefined ? phone : user.phone,
        password: updatedPassword
      }
    );

    const updatedShop = await Shop.updateOne(
      { shop_id },
      {
        name: shopName || undefined,
        ownerName: fullName || undefined,
        phone: phone !== undefined ? phone : undefined,
        city: city || undefined,
        address: address !== undefined ? address : undefined
      }
    );

    return res.json({
      success: true,
      message: 'Profile details successfully updated!',
      user: { id: updatedUser.id, fullName: updatedUser.fullName, email: updatedUser.email, phone: updatedUser.phone, shop_id: updatedUser.shop_id },
      shop: updatedShop ? { shop_id: updatedShop.shop_id, name: updatedShop.name, ownerName: updatedShop.ownerName, city: updatedShop.city, phone: updatedShop.phone, address: updatedShop.address } : null
    });
  } catch (err) {
    console.error('Update Profile Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error updating profile' });
  }
};
