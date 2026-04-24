const mongoose = require('mongoose');
require('dotenv').config();

async function hardReset() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chess_tournament');
    console.log('✅ Connected to MongoDB');
    
    // Drop the entire database
    await mongoose.connection.db.dropDatabase();
    console.log('🗑️ Database dropped completely');
    
    console.log('\n✅ Complete reset successful!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart backend: npm run dev');
    console.log('2. Clear browser cache');
    console.log('3. Register new admin account\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

hardReset();
