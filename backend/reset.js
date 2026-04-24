const mongoose = require('mongoose');
require('dotenv').config();

async function resetDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chess_tournament');
    console.log('✅ Connected to MongoDB');

    // Get all collections
    const collections = mongoose.connection.collections;

    // Drop all collections except users (optional - keep users)
    const keepUsers = process.argv.includes('--keep-users');
    
    for (const [name, collection] of Object.entries(collections)) {
      if (keepUsers && name === 'users') {
        console.log(`📝 Keeping users collection`);
        continue;
      }
      await collection.deleteMany({});
      console.log(`🗑️ Cleared ${name} collection`);
    }

    console.log('\n✅ Database reset complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your backend: npm run dev');
    console.log('2. Register a new account (first user becomes admin)');
    console.log('3. Create a tournament');
    console.log('4. Have users join and play!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();