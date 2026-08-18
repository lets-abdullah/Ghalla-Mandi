import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import saleRoutes from './routes/sale.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import customerRoutes from './routes/customer.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import ledgerRoutes from './routes/ledger.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration supporting both local development and Vercel production
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, serverless internal)
    if (!origin) return callback(null, true);
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl && (origin === frontendUrl || origin.startsWith(frontendUrl))) {
      return callback(null, true);
    }
    // Allow local dev origins & vercel preview deployments
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Connect Database (Neon Postgres)
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Ghalla Mandi ERP API Server',
    database: 'Neon Postgres (Cloud)',
    healthCheck: '/api/health'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Ghalla Mandi ERP API',
    database: 'Neon Postgres',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Only listen when running standalone locally, not in serverless environments (like Vercel)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Ghalla Mandi ERP Backend] Server listening on http://localhost:${PORT}`);
  });
}

export default app;
