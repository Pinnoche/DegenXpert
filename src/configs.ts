import { config } from 'dotenv';

config();

export const configs = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES,
  DMJ_API_KEY: process.env.DMJ_API_KEY,
};
