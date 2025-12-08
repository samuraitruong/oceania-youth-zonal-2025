import fs from 'fs';
import Handlebars from 'handlebars';

// Country to FIDE federation code mapping
const countryToFideCode = {
  'Australia': 'AUS',
  'Austrlaia': 'AUS', // typo in data
  'australia': 'AUS',
  'Ausralia': 'AUS',
  'AUS': 'AUS',
  'ACF': 'AUS', // Australian Chess Federation
  'New Zealand': 'NZL',
  'NZL': 'NZL',
  'NZ': 'NZL', // Short form of New Zealand
  'Guam': 'GUM',
  'Nauru': 'NRU',
  'Fiji': 'FIJ',
  'New Caledonia': 'NCL',
  'Vanuatu': 'VAN',
  'Tonga': 'TGA',
  'Papua New Guinea': 'PNG',
  'NA': null, // Not applicable
  '': null
};

// Helper function to get FIDE code from country
function getFideCode(country) {
  if (!country) return null;
  const normalized = country.trim();
  return countryToFideCode[normalized] || countryToFideCode[normalized.toLowerCase()] || null;
}

// Country to flag emoji mapping
const countryToFlag = {
  'Australia': '🇦🇺',
  'Austrlaia': '🇦🇺',
  'australia': '🇦🇺',
  'Ausralia': '🇦🇺',
  'AUS': '🇦🇺',
  'ACF': '🇦🇺', // Australian Chess Federation
  'New Zealand': '🇳🇿',
  'NZL': '🇳🇿',
  'NZ': '🇳🇿', // Short form of New Zealand
  'Guam': '🇬🇺',
  'GUM': '🇬🇺',
  'Nauru': '🇳🇷',
  'NRU': '🇳🇷',
  'Fiji': '🇫🇯',
  'FIJ': '🇫🇯',
  'New Caledonia': '🇳🇨',
  'NCL': '🇳🇨',
  'Vanuatu': '🇻🇺',
  'VAN': '🇻🇺',
  'Tonga': '🇹🇴',
  'TGA': '🇹🇴',
  'Papua New Guinea': '🇵🇬',
  'PNG': '🇵🇬'
};

// Helper function to get flag emoji from country
function getCountryFlag(country) {
  if (!country) return '';
  const normalized = country.trim();
  return countryToFlag[normalized] || countryToFlag[normalized.toLowerCase()] || '';
}

// Helper function to deduplicate titles (e.g., "CM CM" -> "CM", "WCM WCM" -> "WCM")
function deduplicateTitle(title) {
  if (!title) return '';
  // Split by whitespace and get unique values, then join back
  const titleParts = title.split(/\s+/).filter(Boolean);
  const uniqueParts = [...new Set(titleParts)];
  return uniqueParts.join(' ');
}

// Helper function to parse FIDE HTML response
function parseFideResponse(html, targetFideCode) {
  const results = [];
  
  // Extract table rows from tbody
  const tbodyMatch = html.match(/<tbody>(.*?)<\/tbody>/s);
  if (!tbodyMatch) return results;
  
  const tbody = tbodyMatch[1];
  const rowMatches = tbody.matchAll(/<tr>(.*?)<\/tr>/gs);
  
  for (const rowMatch of rowMatches) {
    const row = rowMatch[1];
    
    // Extract FED (federation code) - format: <td class="flag-wrapper"><img src="/svg/AUS.svg" alt="AUS">AUS</td>
    let fedCode = null;
    // Try pattern: <td class="flag-wrapper">...<img ... alt="AUS">AUS</td>
    const fedMatch1 = row.match(/<td[^>]*class="flag-wrapper"[^>]*>.*?<img[^>]*alt="([A-Z]+)"[^>]*>([A-Z]+)/s);
    if (fedMatch1) {
      fedCode = fedMatch1[2].trim();
    } else {
      // Try pattern: <td data-label="Fed">...<img ... alt="AUS">AUS</td>
      const fedMatch2 = row.match(/<td[^>]*data-label="Fed"[^>]*>.*?<img[^>]*alt="([A-Z]+)"[^>]*>([A-Z]+)/s);
      if (fedMatch2) {
        fedCode = fedMatch2[2].trim();
      } else {
        // Try to extract from flag-wrapper or direct text
        const fedMatch3 = row.match(/flag-wrapper[^>]*>.*?([A-Z]{2,3})/s);
        if (fedMatch3) {
          fedCode = fedMatch3[1].trim();
        } else {
          // Last resort: try data-label="Fed"
          const fedMatch4 = row.match(/<td[^>]*data-label="Fed"[^>]*>.*?([A-Z]{2,3})/s);
          if (fedMatch4) {
            fedCode = fedMatch4[1].trim();
          }
        }
      }
    }
    
    if (!fedCode) continue;
    
    // Only include if FED matches target country
    if (targetFideCode && fedCode !== targetFideCode) continue;
    
    // Extract FIDE ID
    const fideIdMatch = row.match(/<td[^>]*data-label="FIDEID"[^>]*>(\d+)<\/td>/);
    const fideId = fideIdMatch ? fideIdMatch[1] : '';
    
    // Extract Name
    const nameMatch = row.match(/<a[^>]*class="found_name"[^>]*>([^<]+)<\/a>/);
    const name = nameMatch ? nameMatch[1].trim() : '';
    
    // Extract Title
    const titleMatch = row.match(/<td[^>]*data-label="title"[^>]*>([^<]*)<\/td>/);
    const title = deduplicateTitle(titleMatch ? titleMatch[1].trim() : '');
    
    // Extract Standard Rating (first Rtg column)
    let stdRating = '';
    // Find all Rtg columns
    const rtgMatches = [...row.matchAll(/<td[^>]*data-label="Rtg"[^>]*>([^<]*)<\/td>/g)];
    if (rtgMatches && rtgMatches.length > 0) {
      // First Rtg is Standard rating
      stdRating = rtgMatches[0][1].trim();
    }
    
    // Extract Birth Year
    const birthYearMatch = row.match(/<td[^>]*data-label="B-Year"[^>]*>(\d+)<\/td>/);
    const birthYear = birthYearMatch ? birthYearMatch[1] : '';
    
    results.push({
      fideId,
      name,
      title,
      stdRating,
      fedCode,
      birthYear
    });
  }
  
  return results;
}

// Helper function to fetch FIDE rating
async function fetchFideRating(surname, firstName, country) {
  const fideCode = getFideCode(country);
  if (!fideCode) return null;
  
  // Format search query: "Surname, FirstName"
  const searchQuery = `${surname}, ${firstName}`;
  const encodedQuery = encodeURIComponent(searchQuery);
  const url = `https://ratings.fide.com/index.phtml?search=${encodedQuery}`;
  
  try {
    // The page uses AJAX to load results, so we need to fetch from the AJAX endpoint
    const ajaxUrl = `https://ratings.fide.com/incl_search_l.php?search=${encodedQuery}&simple=1`;
    
    const response = await fetch(ajaxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://ratings.fide.com/index.phtml',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for ${searchQuery}`);
      return null;
    }
    
    const html = await response.text();
    const results = parseFideResponse(html, fideCode);
    
    // If multiple results, filter out players older than 20 years old by 1/1/2025
    // A player is older than 20 if birthYear < 2005 (2025 - 20 = 2005)
    let filteredResults = results;
    if (results.length > 1) {
      // Check if all results have the same name and FED (true duplicates)
      const firstResult = results[0];
      const allSameNameAndFed = results.every(r => 
        r.name === firstResult.name && r.fedCode === firstResult.fedCode
      );
      
      if (allSameNameAndFed) {
        console.warn(`⚠️  Found ${results.length} duplicate players with same name and FED: "${firstResult.name}" (${firstResult.fedCode})`);
        results.forEach((player, idx) => {
          console.warn(`   [${idx + 1}] FIDE ID: ${player.fideId}, Birth Year: ${player.birthYear || 'N/A'}, Rating: ${player.stdRating || 'N/A'}`);
        });
      }
      
      filteredResults = results.filter(player => {
        // If birthYear is missing, keep the player (to be safe)
        if (!player.birthYear) return true;
        
        const birthYear = parseInt(player.birthYear);
        // Keep players born in 2005 or later (20 years old or younger by 1/1/2025)
        return birthYear >= 2005;
      });
      
      // If all players were filtered out, fall back to original results
      if (filteredResults.length === 0) {
        filteredResults = results;
        console.warn(`⚠️  All players filtered out for "${searchQuery}", using original results`);
      } else if (filteredResults.length < results.length && allSameNameAndFed) {
        console.warn(`   → Filtered to ${filteredResults.length} player(s) (removed players older than 20)`);
      }
    }
    
    // Return the first matching result (or null if no match)
    return filteredResults.length > 0 ? filteredResults[0] : null;
  } catch (error) {
    console.error(`Error fetching FIDE data for ${searchQuery}:`, error.message);
    return null;
  }
}

// Helper function to delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if this module is being run directly (not imported)
// When run directly, process.argv[1] will be the path to this file
import { fileURLToPath } from 'url';
const currentFile = fileURLToPath(import.meta.url);
const isMainModule = !process.argv[1] || process.argv[1] === currentFile || process.argv[1].endsWith('index.mjs');

// Only run main execution if this is the main module (not imported)
if (isMainModule) {
// Wrap main execution in async function to support await
(async () => {
// Google Sheets configuration
const GOOGLE_SHEETS_ID = '1kbWX5j6PMq-WFI7mjdYnup_J3YY5xkfrTBmQZuqMpWU';
const GOOGLE_SHEETS_GID = '1450537835';
const GOOGLE_SHEETS_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/export?format=csv&gid=${GOOGLE_SHEETS_GID}`;

// Function to fetch CSV from Google Sheets
async function fetchCsvFromGoogleSheets() {
  try {
    console.log('📥 Fetching data from Google Sheets...');
    const response = await fetch(GOOGLE_SHEETS_CSV_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvContent = await response.text();
    console.log('✅ Successfully fetched data from Google Sheets');
    
    // Save to data_live.csv
    fs.writeFileSync('www/data_live.csv', csvContent, 'utf-8');
    console.log('💾 Saved live data to www/data_live.csv');
    
    return csvContent;
  } catch (error) {
    console.error('❌ Error fetching from Google Sheets:', error.message);
    console.log('📁 Falling back to local CSV file...');
    
    // Fallback to local file
    if (fs.existsSync('www/data.csv')) {
      const csvContent = fs.readFileSync('www/data.csv', 'utf-8');
      console.log('✅ Using local CSV file as fallback');
      return csvContent;
    } else {
      throw new Error('Could not fetch from Google Sheets and local CSV file not found');
    }
  }
}

// Fetch CSV content (async)
const csvContent = await fetchCsvFromGoogleSheets();
const lines = csvContent.split('\n').filter(line => line.trim() !== '');

// Skip first line, get header from second line
const header = lines[1].split(',').map(h => h.trim());

// Get data rows (starting from line 3, index 2)
const dataRows = lines.slice(2);

// Parse each row into an object
let dataList = dataRows.map(row => {
  const values = row.split(',').map(v => v.trim());
  const obj = {};
  header.forEach((key, index) => {
    obj[key] = values[index] || '';
  });
  // Initialize FIDE fields
  obj.FIDETitle = '';
  obj.FIDERating = '';
  obj.FIDEId = '';
  obj.FIDEName = '';
  return obj;
});

// Remove duplicate entries based on Division, First Name, Surname, and Country
const seenEntries = new Set();
const uniqueDataList = [];
let duplicateCount = 0;

dataList.forEach((item, index) => {
  // Create a unique key from Division, First Name, Surname, and Country
  const key = `${item.Division || ''}|${item['First Name'] || ''}|${item.Surname || ''}|${item.Country || ''}`.toLowerCase();
  
  if (!seenEntries.has(key)) {
    seenEntries.add(key);
    uniqueDataList.push(item);
  } else {
    duplicateCount++;
    console.log(`⚠️  Duplicate entry removed: ${item['First Name']} ${item.Surname} (${item.Division})`);
  }
});

dataList = uniqueDataList;

if (duplicateCount > 0) {
  console.log(`✅ Removed ${duplicateCount} duplicate entry/entries`);
}

// Get unique divisions
const divisions = [...new Set(dataList.map(item => item.Division).filter(Boolean))].sort();

// Cache file for FIDE data
const cacheFile = 'fide-cache.json';
let cache = {};

// Check if cache is enabled via environment variable
const ENABLED_CACHE = process.env.ENABLED_CACHE === 'true';

// Load cache if enabled and exists
if (ENABLED_CACHE) {
  if (fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      console.log(`📦 Cache enabled: Loaded ${Object.keys(cache).length} entries`);
    } catch (error) {
      console.log('⚠️  Could not load cache, starting fresh');
    }
  } else {
    console.log('📦 Cache enabled but no cache file found, starting fresh');
  }
} else {
  console.log('📦 Cache disabled (ENABLED_CACHE != true)');
}

// Fetch FIDE ratings for all players with parallel processing
console.log('🔍 Fetching FIDE ratings for players...');
console.log(`📊 Processing ${dataList.length} players...`);

// Parallel fetching configuration
const CONCURRENT_REQUESTS = 5; // Number of parallel requests
const REQUEST_DELAY = 200; // Delay between batches (ms)

let processed = 0;
let found = 0;
let cached = 0;

// Process players in batches for parallel fetching
async function processPlayer(player, index) {
  const surname = player.Surname || '';
  const firstName = player['First Name'] || '';
  const country = player.Country || '';
  
  if (!surname || !firstName) {
    processed++;
    return;
  }
  
  // Create cache key
  const cacheKey = `${surname},${firstName},${country}`.toLowerCase();
  
  let fideData = null;
  
  // Check cache first (only if enabled)
  if (ENABLED_CACHE && cache[cacheKey]) {
    fideData = cache[cacheKey];
    // Deduplicate title if it exists (fixes old cache entries with duplicates)
    if (fideData && fideData.title) {
      fideData.title = deduplicateTitle(fideData.title);
    }
    cached++;
  } else {
    // Fetch from FIDE
    fideData = await fetchFideRating(surname, firstName, country);
    
    // Deduplicate title if it exists (before saving to cache)
    if (fideData && fideData.title) {
      fideData.title = deduplicateTitle(fideData.title);
    }
    
    // Save to cache (only if enabled, even if null, to avoid refetching)
    if (ENABLED_CACHE) {
      cache[cacheKey] = fideData;
    }
  }
  
  if (fideData) {
    player.FIDETitle = fideData.title || '';
    player.FIDERating = fideData.stdRating || '';
    player.FIDEId = fideData.fideId || '';
    player.FIDEName = fideData.name || '';
    found++;
  }
  
  processed++;
  
  // Progress indicator
  if (processed % 10 === 0 || processed === dataList.length) {
    console.log(`⏳ Progress: ${processed}/${dataList.length} (${found} found, ${cached} from cache)`);
  }
}

// Process players in parallel batches
const playersToProcess = dataList.filter(p => p.Surname && p['First Name']);
const totalPlayers = playersToProcess.length;

for (let i = 0; i < playersToProcess.length; i += CONCURRENT_REQUESTS) {
  const batch = playersToProcess.slice(i, i + CONCURRENT_REQUESTS);
  
  // Check how many in this batch are cached (to skip delay if all cached)
  let cachedInBatch = 0;
  if (ENABLED_CACHE) {
    batch.forEach(player => {
      const cacheKey = `${player.Surname || ''},${player['First Name'] || ''},${player.Country || ''}`.toLowerCase();
      if (cache[cacheKey]) {
        cachedInBatch++;
      }
    });
  }
  
  // Process batch in parallel
  await Promise.all(batch.map((player, batchIndex) => processPlayer(player, i + batchIndex)));
  
  // Save cache periodically (only if enabled)
  if (ENABLED_CACHE && i % (CONCURRENT_REQUESTS * 4) === 0 && i > 0) {
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
  }
  
  // Rate limiting: only delay if we made actual network requests (not all cached)
  // Skip delay if all items in batch were from cache
  if (i + CONCURRENT_REQUESTS < playersToProcess.length && cachedInBatch < batch.length) {
    await delay(REQUEST_DELAY);
  }
}

// Save final cache (only if enabled)
if (ENABLED_CACHE) {
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
  console.log(`💾 Cache saved to ${cacheFile}`);
}

console.log(`✅ Completed! Found FIDE ratings for ${found} out of ${totalPlayers} players.`);

// Prepare data for Handlebars template
const tableHeaders = header.filter(h => h !== 'First Name' && h !== 'Surname');

const tableRows = dataList.map((row, index) => {
  // Create name display: use FIDE name if available, otherwise "Surname, First Name"
  let displayName = '';
  if (row.FIDEName) {
    displayName = row.FIDEName;
  } else {
    const surname = row.Surname || '';
    const firstName = row['First Name'] || '';
    displayName = surname && firstName ? `${surname}, ${firstName}` : (surname || firstName || '');
  }
  
  // Make name a link to FIDE profile if FIDE ID exists
  const nameDisplay = row.FIDEId
    ? `<a href="https://ratings.fide.com/profile/${row.FIDEId}" target="_blank" rel="noopener noreferrer" class="fide-link" title="View FIDE Profile">${displayName}</a>`
    : displayName;
  
  // Prepare table cells
  const cells = tableHeaders.map(h => {
    // Special handling for Country column to show flag
    if (h === 'Country') {
      const flag = getCountryFlag(row[h] || '');
      return flag ? `<span class="country-flag">${flag}</span>${row[h] || ''}` : (row[h] || '');
    }
    return row[h] || '';
  });
  
  return {
    index: index + 1,
    division: row.Division || '',
    rating: row.FIDERating || '0',
    cells: cells,
    nameDisplay: nameDisplay,
    nameSort: displayName.toLowerCase(),
    titleDisplay: row.FIDETitle ? `<span class="badge bg-primary fide-title">${row.FIDETitle}</span>` : '<span class="text-muted">-</span>',
    ratingDisplay: row.FIDERating ? `<span class="fide-rating">${row.FIDERating}</span>` : '<span class="text-muted">-</span>',
    ratingSort: row.FIDERating || '0'
  };
});

// Read Handlebars template
const templateSource = fs.readFileSync('index.html.hbs', 'utf-8');
const template = Handlebars.compile(templateSource);

// Prepare template data
const templateData = {
  divisions: divisions,
  totalRecords: dataList.length,
  tableHeaders: tableHeaders,
  tableRows: tableRows
};

// Generate HTML using Handlebars
const html = template(templateData);

// Write HTML file to www folder
fs.writeFileSync('www/index.html', html, 'utf-8');
console.log('✅ HTML file generated successfully: www/index.html');
console.log(`📊 Total records: ${dataList.length}`);
console.log(`🏆 Divisions: ${divisions.length} unique divisions`);
})().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
}

// Export functions for use in other modules (must be at top level)
export { getFideCode, parseFideResponse, fetchFideRating };

