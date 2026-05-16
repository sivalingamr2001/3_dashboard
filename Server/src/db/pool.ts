import oracledb from 'oracledb';
import { Env } from '../config/env';

let pool: oracledb.Pool | null = null;

export async function initPool(config: Env): Promise<void> {
  oracledb.fetchAsString = [oracledb.CLOB];
  oracledb.outFormat   = oracledb.OUT_FORMAT_OBJECT;

  // Initialize Oracle Client binaries to unlock Thick Mode (supports legacy 10G verifiers)
  if (config.DB_CLIENT_DIR) {
    oracledb.initOracleClient({ libDir: config.DB_CLIENT_DIR });
  } else {
    // Fallback if no specific directory is declared in environment variables
    oracledb.initOracleClient();
  }

  pool = await oracledb.createPool({
    user:             config.DB_USER,
    password:         config.DB_PASSWORD,
    connectString:    config.DB_CONNECT_STRING,
    poolMin:          config.DB_POOL_MIN,
    poolMax:          config.DB_POOL_MAX,
    poolIncrement:    config.DB_POOL_INCREMENT,
    poolTimeout:      config.DB_POOL_TIMEOUT,
    queueTimeout:     10_000,
    enableStatistics: false,
  });
}

export async function getConnection(): Promise<oracledb.Connection> {
  if (!pool) throw new Error('Pool not initialised');
  return pool.getConnection();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close(10);
    pool = null;
  }
}
