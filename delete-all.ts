import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function deleteAll() {
  console.log('Fetching participants to delete...');
  const snapshot = await getDocs(collection(db, 'participants'));
  
  if (snapshot.empty) {
    console.log('No participants found.');
    process.exit(0);
  }

  console.log(`Found ${snapshot.size} participants. Deleting in batches...`);
  
  const batches = [];
  let currentBatch = writeBatch(db);
  let operationCount = 0;

  snapshot.docs.forEach((doc) => {
    currentBatch.delete(doc.ref);
    operationCount++;

    if (operationCount === 400) {
      batches.push(currentBatch.commit());
      currentBatch = writeBatch(db);
      operationCount = 0;
    }
  });

  if (operationCount > 0) {
    batches.push(currentBatch.commit());
  }

  await Promise.all(batches);
  console.log('All participants deleted successfully.');
  process.exit(0);
}

deleteAll().catch(console.error);
