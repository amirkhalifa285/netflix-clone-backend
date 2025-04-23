// cleanup.js - Run this with: node cleanup.js
// This will safely clean up your profiles collection by fixing inconsistent field names
// and removing profiles with null user/owner fields

const mongoose = require('mongoose');
require('dotenv').config();

// Wait for connection to be fully established
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for cleanup');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return false;
  }
};

const main = async () => {
  // Make sure we're connected to the database
  const connected = await connectDB();
  if (!connected) {
    console.log('Could not connect to the database. Exiting.');
    process.exit(1);
  }

  try {
    // Wait a moment to ensure connection is fully established
    await new Promise(resolve => setTimeout(resolve, 1000));

    // We'll work directly with the database collection
    const db = mongoose.connection.db;
    
    // List all collections to confirm we're connected
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name).join(', '));
    
    // Check if profiles collection exists
    const profilesCollectionExists = collections.some(c => c.name === 'profiles');
    if (!profilesCollectionExists) {
      console.log('Profiles collection does not exist. Nothing to clean up.');
      return;
    }
    
    const profilesCollection = db.collection('profiles');
    
    console.log('Starting database cleanup...');
    
    // 1. Find and count profiles with null user or owner fields
    const nullUserProfiles = await profilesCollection.find({
      $or: [
        { user: null },
        { owner: null }
      ]
    }).toArray();
    
    console.log(`Found ${nullUserProfiles.length} profiles with null user/owner fields`);
    
    if (nullUserProfiles.length > 0) {
      console.log('Profiles with null fields (showing first 5):');
      nullUserProfiles.slice(0, 5).forEach(p => {
        console.log(`ID: ${p._id}, Name: ${p.name}, User: ${p.user}, Owner: ${p.owner}`);
      });
      
      // 2. Delete profiles with null user or owner fields
      const deleteResult = await profilesCollection.deleteMany({
        $or: [
          { user: null },
          { owner: null }
        ]
      });
      
      console.log(`Deleted ${deleteResult.deletedCount} profiles with null user/owner fields`);
    }
    
    // 3. Find profiles with 'owner' field (old schema)
    const ownerProfiles = await profilesCollection.find({
      owner: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`Found ${ownerProfiles.length} profiles with 'owner' field`);
    
    // 4. Update profiles to use 'user' field instead of 'owner'
    if (ownerProfiles.length > 0) {
      console.log('Profiles with owner field (showing first 5):');
      ownerProfiles.slice(0, 5).forEach(p => {
        console.log(`ID: ${p._id}, Name: ${p.name}, Owner: ${p.owner}`);
      });
      
      let updatedCount = 0;
      for (const profile of ownerProfiles) {
        const updateResult = await profilesCollection.updateOne(
          { _id: profile._id },
          { 
            $set: { user: profile.owner },
            $unset: { owner: "" }
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          updatedCount++;
        }
      }
      
      console.log(`Updated ${updatedCount} profiles to use 'user' field instead of 'owner'`);
    }
    
    // 5. Verify indices
    const indices = await profilesCollection.indexes();
    console.log('Current indexes:');
    console.log(JSON.stringify(indices, null, 2));
    
    // 6. Check if we need to update indexes
    const hasOldIndex = indices.some(index => 
      index.name === 'owner_1_name_1' || 
      (index.key && index.key.owner === 1 && index.key.name === 1)
    );
    
    const hasNewIndex = indices.some(index => 
      index.name === 'user_1_name_1' || 
      (index.key && index.key.user === 1 && index.key.name === 1)
    );
    
    console.log(`Old index exists: ${hasOldIndex}`);
    console.log(`New index exists: ${hasNewIndex}`);
    
    // 7. Drop old index if it exists and if we have the new one or can create it
    if (hasOldIndex) {
      try {
        // Create new index first if it doesn't exist
        if (!hasNewIndex) {
          await profilesCollection.createIndex({ user: 1, name: 1 }, { unique: true });
          console.log('Created new user_1_name_1 index');
        }
        
        // Now safe to drop the old index
        await profilesCollection.dropIndex('owner_1_name_1');
        console.log('Dropped old owner_1_name_1 index');
      } catch (error) {
        console.log('Error updating indexes:', error.message);
      }
    } else if (!hasNewIndex) {
      // If we don't have either index, create the new one
      try {
        await profilesCollection.createIndex({ user: 1, name: 1 }, { unique: true });
        console.log('Created new user_1_name_1 index');
      } catch (error) {
        console.error('Error creating index:', error.message);
      }
    }
    
    console.log('Database cleanup completed successfully!');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the main function
main().catch(console.error);