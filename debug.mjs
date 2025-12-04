// Debug script to test FIDE rating fetch for Xia, Justin from Australia
// Imports reusable functions from index.mjs to ensure same code is used
// Only console output, no HTML generation

import { getFideCode, parseFideResponse, fetchFideRating } from './index.mjs';

// Test with Xia, Justin from Australia
console.log('🔍 Debug Test - Fetching FIDE Rating');
console.log('=====================================');
console.log(`Player: Xia, Justin`);
console.log(`Country: Australia`);
console.log(`FIDE Code: ${getFideCode('Australia')}`);
console.log('');

// Test the fetch with detailed logging
console.log('📡 Fetching from FIDE...');
const fideData = await fetchFideRating('Xia', 'Justin', 'Australia');

console.log('\n📊 Final Results:');
console.log('=====================================');
if (fideData) {
  console.log('✅ SUCCESS! Found FIDE data:');
  console.log(JSON.stringify(fideData, null, 2));
  console.log('');
  console.log('Parsed fields:');
  console.log(`  FIDE ID: ${fideData.fideId || 'N/A'}`);
  console.log(`  Name: ${fideData.name || 'N/A'}`);
  console.log(`  Title: ${fideData.title || 'N/A'}`);
  console.log(`  Standard Rating: ${fideData.stdRating || 'N/A'}`);
  console.log(`  Federation: ${fideData.fedCode || 'N/A'}`);
  console.log(`  Birth Year: ${fideData.birthYear || 'N/A'}`);
} else {
  console.log('❌ No FIDE data found');
  console.log('');
  console.log('💡 This could mean:');
  console.log('   - Player not found in FIDE database');
  console.log('   - Country code mismatch');
  console.log('   - Network/parsing error');
}
