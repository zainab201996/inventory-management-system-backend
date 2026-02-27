import { Pool, PoolClient } from 'pg';
import dbConfig from '../config/database';
import logger from '../utils/logger';

class DatabaseConnection {
  private pool: Pool | null = null;

  async initPool(): Promise<Pool> {
    return new Promise(async (resolve, reject) => {
      logger.info('Initializing PostgreSQL Pool...');
      try {
        this.pool = new Pool(dbConfig);
        console.log('dbConfig', dbConfig);
        
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        logger.info('PostgreSQL Pool Initialized Successfully');
        resolve(this.pool);
      } catch (err) {
        logger.error('Error initializing PostgreSQL pool', { 
          error: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined
        });
        
        logger.warn('Retrying connection to PostgreSQL in 5 seconds');
        setTimeout(() => this.initPool().then(resolve).catch(reject), 5000);
      }
    });
  }

  async getConnection(): Promise<PoolClient> {
    // Auto-initialize if pool is not initialized
    if (!this.pool) {
      await this.initPool();
    }

    return new Promise((resolve, reject) => {
      if (!this.pool) {
        const errorMessage = 'Database pool is not initialized';
        logger.error(errorMessage);
        return reject(new Error(errorMessage));
      }

      this.pool.connect()
        .then((connection) => {
          if (!connection) {
            const errorMessage = 'Failed to get connection from pool';
            logger.error(errorMessage);
            return reject(new Error(errorMessage));
          }
          resolve(connection);
        })
        .catch((err) => {
          logger.error('Error getting connection from pool', {
            error: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined,
            additionalContext: {
              poolStatus: this.pool ? 'Initialized' : 'Not Initialized'
            }
          });
          reject(err);
        });
    });
  }

  async closePool(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pool) {
        this.pool.end()
          .then(() => {
            logger.info('PostgreSQL pool closed successfully');
            this.pool = null;
            resolve();
          })
          .catch((err) => {
            logger.error('Error closing PostgreSQL pool', {
              error: err instanceof Error ? err.message : 'Unknown error',
              stack: err instanceof Error ? err.stack : undefined
            });
            reject(err);
          });
      } else {
        logger.warn('No PostgreSQL pool to close');
        resolve();
      }
    });
  }

  getPool(): Pool | null {
    return this.pool;
  }
}

const dbConnection = new DatabaseConnection();

export { dbConnection };
export default dbConnection;

