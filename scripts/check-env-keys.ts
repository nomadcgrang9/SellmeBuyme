import * as dotenv from 'dotenv';
dotenv.config();

console.log('Available ENV Keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
