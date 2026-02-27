import { AppDataSource } from '../config/data-source';
import logger from '../utils/logger';

class TypeORMConnection {
  async initialize(): Promise<void> {
    try {
      await AppDataSource.initialize();
      logger.info('TypeORM DataSource has been initialized');
    } catch (error) {
      logger.error('Error initializing TypeORM DataSource', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await AppDataSource.destroy();
      logger.info('TypeORM DataSource has been closed');
    } catch (error) {
      logger.error('Error closing TypeORM DataSource', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  getRepository<T>(entity: any) {
    return AppDataSource.getRepository<T>(entity);
  }

  getManager() {
    return AppDataSource.manager;
  }

  async runMigrations(): Promise<void> {
    try {
      const migrations = await AppDataSource.runMigrations();
      logger.info(`Ran ${migrations.length} migrations`);
    } catch (error) {
      logger.error('Error running migrations', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export const typeormConnection = new TypeORMConnection();
export default typeormConnection;
