import { parse } from 'csv-parse';
import * as fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase Client SDK (which uses the security rules we just relaxed)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function importCsvToFirestore(csvFilePath: string, collectionName: string) {
  console.log(`Starting import from ${csvFilePath} to collection ${collectionName}...`);
  
  const fileContent = fs.readFileSync(csvFilePath, 'utf8');
  
  parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }, async (err, records) => {
    if (err) {
      console.error('Error parsing CSV:', err);
      return;
    }

    console.log(`Parsed ${records.length} records. Starting upload...`);
    
    let successCount = 0;
    let errorCount = 0;

    // Process in batches for better performance and to respect Firestore limits
    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = writeBatch(db);
      const currentBatchRecords = records.slice(i, i + batchSize);
      
      currentBatchRecords.forEach((record: any) => {
        // Map CSV columns to Firestore fields based on the schema
        const docData = {
          firstName: record['First Name'] || '',
          lastName: record['Last Name '] || '', // Note the space in the CSV header
          email: record['Email'] || '',
          countryCode: record['Country Code '] || '', // Note the space
          phone: record['Phone'] || '',
          company: record['Company'] || '',
          designation: record['Designation'] || '',
          gender: record['Gender'] || '',
          batchNumber: record['Batch Number'] || '',
          city: record['City'] || '',
          industry: record['Industry'] || '',
          linkedIn: record['LinkedIn'] || '',
          coachingJourney: record['Coaching Journey'] || '',
          otherPrograms: record['Any other program done from us?'] || '',
          cmm: record['CMM'] || '',
          tcc: record['TCC'] || '',
          tlc: record['TLC'] || '',
          clientPartner: record['Client Partner'] || '',
          leadSource: record['Lead Source'] || '',
          profilePicture: record['Profile Picture URL'] || '',
          fullAddress: record['Full Address'] || '',
          totalAmount: record['Total Amount'] ? Number(record['Total Amount']) : 0,
          paymentReceived: record['Payment Received'] ? Number(record['Payment Received']) : 0,
          paymentStatus: record['Payment Status'] || '',
          createdAt: new Date().toISOString()
        };
        
        // Recalculate remaining amount
        (docData as any).remainingAmount = docData.totalAmount - docData.paymentReceived;

        // Skip records without required fields
        if (!docData.firstName || !docData.email) {
          console.warn(`Skipping record missing required fields (firstName or email):`, record);
          errorCount++;
          return;
        }

        const docRef = doc(collection(db, collectionName)); // Auto-generate ID
        batch.set(docRef, docData);
        successCount++;
      });

      try {
        await batch.commit();
        console.log(`Committed batch ${i / batchSize + 1} (${currentBatchRecords.length} records)`);
      } catch (batchErr) {
        console.error(`Error committing batch ${i / batchSize + 1}:`, batchErr);
        // Adjust success/error counts if the whole batch fails
        successCount -= currentBatchRecords.length;
        errorCount += currentBatchRecords.length;
      }
    }

    console.log('Import complete!');
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Errors/Skipped: ${errorCount}`);
    process.exit(0);
  });
}

// Run the import
const fileToImport = process.argv[2] || './data1.csv';
importCsvToFirestore(fileToImport, 'participants');
