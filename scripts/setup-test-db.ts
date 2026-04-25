import { execSync } from 'child_process';
import { config } from 'dotenv';

config();

async function setupTestDatabase() {
  console.log('🚀 Setting up test database...');

  const testDbUrl = process.env.TEST_DATABASE_URL;

  if (!testDbUrl) {
    console.error('❌ TEST_DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  try {
    console.log('📦 Creating test database if it does not exist...');
    execSync(`psql -U postgres -c "CREATE DATABASE task_orchestrator_test;"`, { 
      stdio: 'ignore',
      env: { ...process.env, PGPASSWORD: 'postgres' }
    });
  } catch (e) {
    // Database may already exist
  }

  console.log('🔄 Running Prisma migrations on test database...');
  
  const originalDbUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = testDbUrl;

  try {
    execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', { 
      stdio: 'inherit' 
    });
    console.log('✅ Test database setup completed successfully!');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    process.exit(1);
  } finally {
    process.env.DATABASE_URL = originalDbUrl;
  }
}

setupTestDatabase()
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
