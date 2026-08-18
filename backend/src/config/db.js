import { initDatabase } from '../services/db.service.js';

export const connectDB = async () => {
  try {
    await initDatabase();
  } catch (error) {
    console.error(`[SQLite Connection Error]: ${error.message}`);
  }
};
