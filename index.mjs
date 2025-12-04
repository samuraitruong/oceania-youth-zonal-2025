import fs from 'fs';

// Country to FIDE federation code mapping
const countryToFideCode = {
  'Australia': 'AUS',
  'Austrlaia': 'AUS', // typo in data
  'australia': 'AUS',
  'Ausralia': 'AUS',
  'AUS': 'AUS',
  'New Zealand': 'NZL',
  'NZL': 'NZL',
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
  'New Zealand': '🇳🇿',
  'NZL': '🇳🇿',
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
    const title = titleMatch ? titleMatch[1].trim() : '';
    
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
    
    // Return the first matching result (or null if no match)
    return results.length > 0 ? results[0] : null;
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
// Read the CSV file from www folder
const csvContent = fs.readFileSync('www/data.csv', 'utf-8');
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
  return obj;
});

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
    cached++;
  } else {
    // Fetch from FIDE
    fideData = await fetchFideRating(surname, firstName, country);
    
    // Save to cache (only if enabled, even if null, to avoid refetching)
    if (ENABLED_CACHE) {
      cache[cacheKey] = fideData;
    }
  }
  
  if (fideData) {
    player.FIDETitle = fideData.title || '';
    player.FIDERating = fideData.stdRating || '';
    player.FIDEId = fideData.fideId || '';
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
  
  // Process batch in parallel
  await Promise.all(batch.map((player, batchIndex) => processPlayer(player, i + batchIndex)));
  
  // Save cache periodically (only if enabled)
  if (ENABLED_CACHE && i % (CONCURRENT_REQUESTS * 4) === 0 && i > 0) {
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
  }
  
  // Rate limiting: small delay between batches
  if (i + CONCURRENT_REQUESTS < playersToProcess.length) {
    await delay(REQUEST_DELAY);
  }
}

// Save final cache (only if enabled)
if (ENABLED_CACHE) {
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
  console.log(`💾 Cache saved to ${cacheFile}`);
}

console.log(`✅ Completed! Found FIDE ratings for ${found} out of ${totalPlayers} players.`);

// Generate HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oceania Zonal Youth 2025 - Participants</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        .container {
            max-width: 1400px;
        }
        .header-card {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 30px;
            margin-bottom: 30px;
        }
        .header-card h1 {
            color: #667eea;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .filter-section {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 25px;
            margin-bottom: 30px;
        }
        .table-card {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 25px;
            overflow-x: auto;
        }
        .table {
            margin-bottom: 0;
        }
        .table thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .table thead th {
            border: none;
            padding: 15px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 0.5px;
        }
        .table tbody tr {
            transition: all 0.3s ease;
        }
        .table tbody tr:hover {
            background-color: #f8f9fa;
            transform: scale(1.01);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .table tbody td {
            padding: 15px;
            vertical-align: middle;
            border-bottom: 1px solid #e9ecef;
        }
        .fide-title {
            font-weight: 600;
            font-size: 0.9rem;
        }
        .fide-rating {
            font-weight: 700;
            color: #667eea;
            font-size: 1.1rem;
        }
        .table thead th {
            cursor: pointer;
            user-select: none;
            position: relative;
        }
        .table thead th:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        .table thead th.sortable::after {
            content: ' ↕';
            opacity: 0.5;
            font-size: 0.8rem;
        }
        .table thead th.sort-asc::after {
            content: ' ↑';
            opacity: 1;
        }
        .table thead th.sort-desc::after {
            content: ' ↓';
            opacity: 1;
        }
        .fide-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        .fide-link:hover {
            color: #764ba2;
            text-decoration: underline;
        }
        .badge-count {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: 600;
        }
        .form-select {
            border-radius: 10px;
            border: 2px solid #e9ecef;
            padding: 12px 15px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        .form-select:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        .stats-badge {
            display: inline-block;
            background: #f8f9fa;
            padding: 10px 20px;
            border-radius: 25px;
            margin: 5px;
            font-weight: 500;
        }
        .no-results {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }
        .no-results i {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.3;
        }
        .info-icon {
            color: #667eea;
            cursor: pointer;
            margin-left: 8px;
            font-size: 1.1rem;
            transition: all 0.3s ease;
        }
        .info-icon:hover {
            color: #764ba2;
            transform: scale(1.2);
        }
        .country-flag {
            font-size: 1.3rem;
            margin-right: 6px;
            vertical-align: middle;
        }
        .modal-content {
            border-radius: 15px;
            border: none;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px 15px 0 0;
            border: none;
        }
        .modal-header .btn-close {
            filter: invert(1);
        }
        .modal-body a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        .modal-body a:hover {
            color: #764ba2;
            text-decoration: underline;
        }
        @media (max-width: 768px) {
            .header-card, .filter-section, .table-card {
                padding: 20px;
                margin-bottom: 20px;
            }
            .table {
                font-size: 0.9rem;
            }
            .table thead th,
            .table tbody td {
                padding: 10px 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-card">
            <h1><i class="bi bi-trophy-fill"></i> Oceania Zonal Youth 2025</h1>
            <p class="text-muted mb-0">
                All paid entries as of the 3rd of Dec
                <i class="bi bi-info-circle info-icon" data-bs-toggle="modal" data-bs-target="#dataSourceModal" title="About this data"></i>
            </p>
        </div>

        <!-- Data Source Modal -->
        <div class="modal fade" id="dataSourceModal" tabindex="-1" aria-labelledby="dataSourceModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="dataSourceModalLabel">
                            <i class="bi bi-info-circle"></i> Data Source Information
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>About this data:</strong></p>
                        <p>This data is extracted from the official Google Sheets source. For the most up-to-date real-time list, please visit:</p>
                        <p>
                            <a href="https://docs.google.com/spreadsheets/d/1kbWX5j6PMq-WFI7mjdYnup_J3YY5xkfrTBmQZuqMpWU/edit?gid=1450537835#gid=1450537835" target="_blank" rel="noopener noreferrer">
                                <i class="bi bi-box-arrow-up-right"></i>
                                View Real-time List on Google Sheets
                            </a>
                        </p>
                        <hr>
                        <p><strong>Official Event Website:</strong></p>
                        <p>
                            <a href="https://sites.google.com/view/oceaniayouthzonal2025/home" target="_blank" rel="noopener noreferrer">
                                <i class="bi bi-globe"></i>
                                2025 Oceania Youth Chess Championship
                            </a>
                        </p>
                        <hr>
                        <p><strong>FIDE Ratings:</strong></p>
                        <p>FIDE ratings are automatically fetched from the official FIDE ratings database. Ratings are matched by player name and country to ensure accuracy.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="filter-section">
            <div class="row g-3 align-items-end">
                <div class="col-md-6">
                    <label for="divisionFilter" class="form-label fw-bold">
                        <i class="bi bi-funnel-fill"></i> Filter by Division
                    </label>
                    <select class="form-select" id="divisionFilter">
                        <option value="">All Divisions</option>
                        ${divisions.map(div => `<option value="${div}">${div}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <div class="stats-badge">
                        <i class="bi bi-people-fill"></i> 
                        <span id="recordCount">${dataList.length}</span> participants
                    </div>
                </div>
            </div>
        </div>

        <div class="table-card">
            <div id="tableContainer">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>#</th>
                            ${header.map(h => `<th class="sortable" data-sort="${h}">${h}</th>`).join('')}
                            <th class="sortable" data-sort="FIDETitle">FIDE Title</th>
                            <th class="sortable" data-sort="FIDERating">FIDE Rating</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        ${dataList.map((row, index) => {
                          // Create FIDE ID link if available
                          const fideIdDisplay = row.FIDEId 
                            ? `<a href="https://ratings.fide.com/profile/${row.FIDEId}" target="_blank" rel="noopener noreferrer" class="fide-link" title="View FIDE Profile"><i class="bi bi-box-arrow-up-right"></i> ${row.FIDEId}</a>`
                            : '<span class="text-muted">-</span>';
                          
                          return `
                            <tr data-division="${row.Division || ''}" data-rating="${row.FIDERating || '0'}">
                                <td>${index + 1}</td>
                                ${header.map(h => {
                                  // Special handling for Surname column to show FIDE ID link
                                  if (h === 'Surname' && row.FIDEId) {
                                    return `<td>${row[h] || ''} ${fideIdDisplay}</td>`;
                                  }
                                  // Special handling for Country column to show flag
                                  if (h === 'Country') {
                                    const flag = getCountryFlag(row[h] || '');
                                    return `<td>${flag ? `<span class="country-flag">${flag}</span>` : ''}${row[h] || ''}</td>`;
                                  }
                                  return `<td>${row[h] || ''}</td>`;
                                }).join('')}
                                <td>${row.FIDETitle ? `<span class="badge bg-primary fide-title">${row.FIDETitle}</span>` : '<span class="text-muted">-</span>'}</td>
                                <td data-sort-value="${row.FIDERating || '0'}">${row.FIDERating ? `<span class="fide-rating">${row.FIDERating}</span>` : '<span class="text-muted">-</span>'}</td>
                            </tr>
                          `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div id="noResults" class="no-results" style="display: none;">
                <i class="bi bi-inbox"></i>
                <h4>No participants found</h4>
                <p>Try selecting a different division</p>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const divisionFilter = document.getElementById('divisionFilter');
        const tableBody = document.getElementById('tableBody');
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const recordCount = document.getElementById('recordCount');
        const noResults = document.getElementById('noResults');
        const tableContainer = document.getElementById('tableContainer');

        function filterTable() {
            const selectedDivision = divisionFilter.value;
            let visibleCount = 0;
            
            // Get fresh rows list (in case table was sorted)
            const currentRows = Array.from(tableBody.querySelectorAll('tr'));

            currentRows.forEach((row) => {
                const rowDivision = row.getAttribute('data-division');
                if (!selectedDivision || rowDivision === selectedDivision) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            recordCount.textContent = visibleCount;

            if (visibleCount === 0) {
                tableContainer.style.display = 'none';
                noResults.style.display = 'block';
            } else {
                tableContainer.style.display = 'block';
                noResults.style.display = 'none';
            }
        }

        divisionFilter.addEventListener('change', filterTable);

        // Table sorting functionality
        let currentSort = {
            column: null,
            direction: 'asc'
        };

        function sortTable(column, direction) {
            const tbody = tableBody;
            const rows = Array.from(tbody.querySelectorAll('tr'));
            
            // Remove sort classes from all headers
            document.querySelectorAll('th.sortable').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
            });
            
            // Add sort class to current header
            const header = document.querySelector('th[data-sort="' + column + '"]');
            if (header) {
                header.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
            }
            
            // Sort rows
            rows.sort((a, b) => {
                let aValue, bValue;
                
                if (column === 'FIDERating') {
                    // Sort by numeric rating value
                    aValue = parseInt(a.querySelector('td[data-sort-value]')?.getAttribute('data-sort-value') || '0');
                    bValue = parseInt(b.querySelector('td[data-sort-value]')?.getAttribute('data-sort-value') || '0');
                } else {
                    // Get cell value based on column index
                    const columnIndex = Array.from(document.querySelectorAll('th')).findIndex(th => th.getAttribute('data-sort') === column);
                    if (columnIndex === -1) return 0;
                    
                    const aCell = a.querySelectorAll('td')[columnIndex];
                    const bCell = b.querySelectorAll('td')[columnIndex];
                    
                    aValue = aCell ? (aCell.textContent || '').trim().toLowerCase() : '';
                    bValue = bCell ? (bCell.textContent || '').trim().toLowerCase() : '';
                }
                
                // Handle numeric comparison for ratings
                if (column === 'FIDERating') {
                    return direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                
                // String comparison
                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                return 0;
            });
            
            // Re-append sorted rows
            rows.forEach(row => tbody.appendChild(row));
            
            // Update current sort
            currentSort = { column, direction };
            
            // Re-apply filter if active (use setTimeout to ensure DOM is updated)
            if (divisionFilter.value) {
                setTimeout(() => filterTable(), 0);
            }
        }

        // Add click handlers to sortable headers
        document.querySelectorAll('th.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                if (!column) return;
                
                // Toggle direction if clicking same column
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.direction = 'asc';
                }
                
                sortTable(column, currentSort.direction);
            });
        });
    </script>
</body>
</html>`;

// Write HTML file to www folder
fs.writeFileSync('www/index.html', html, 'utf-8');
console.log('✅ HTML file generated successfully: www/index.html');
console.log(`📊 Total records: ${dataList.length}`);
console.log(`🏆 Divisions: ${divisions.length} unique divisions`);
}

// Export functions for use in other modules (must be at top level)
export { getFideCode, parseFideResponse, fetchFideRating };

