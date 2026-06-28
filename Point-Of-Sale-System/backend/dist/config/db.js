import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({
    host: process.env.PGHOST || 'helium',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'heliumdb',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'password',
});
export const query = (text, params) => pool.query(text, params);
export default pool;
