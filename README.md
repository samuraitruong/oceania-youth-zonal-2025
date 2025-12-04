# Oceania Youth Chess Championship 2025 - Participants List

A web application that displays the list of participants for the 2025 Oceania Youth Chess Championship with automatic FIDE rating integration.

## 🌟 Features

- **Interactive Participant Table**: View all registered participants with filtering by division
- **FIDE Rating Integration**: Automatically fetches and displays FIDE ratings and titles for players
- **Country Flags**: Visual country flags displayed next to each participant's country
- **Sortable Columns**: Click any column header to sort the table
- **FIDE Profile Links**: Direct links to player FIDE profiles when available
- **Responsive Design**: Mobile-friendly interface built with Bootstrap 5
- **Real-time Data Source**: Links to the official Google Sheets for the most up-to-date information

## 📋 Prerequisites

- Node.js 20 or higher
- npm (comes with Node.js)

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd oceaniazonalyouth2025
```

2. Install dependencies:
```bash
npm install
```

### Usage

#### Generate HTML (without cache)
```bash
npm start
# or
node index.mjs
```

#### Generate HTML (with cache enabled)
```bash
npm run dev
# or
ENABLED_CACHE=true node index.mjs
```

The generated HTML file will be created in the `www/` folder.

### Environment Variables

- `ENABLED_CACHE`: Set to `'true'` to enable caching of FIDE rating data. This significantly speeds up subsequent runs by avoiding redundant API calls. Default: disabled

## 📁 Project Structure

```
oceaniazonalyouth2025/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD workflow
├── www/
│   ├── data.csv                # Participant data (CSV format)
│   └── index.html              # Generated HTML output
├── debug.mjs                   # Debug script for testing FIDE API
├── index.mjs                   # Main script for generating HTML
├── fide-cache.json             # Cache file for FIDE ratings (generated)
├── package.json
└── README.md
```

## 🔧 How It Works

1. **Data Loading**: Reads participant data from `www/data.csv`
   - Skips the first line (comment)
   - Uses the second line as headers
   - Parses remaining rows into participant objects

2. **FIDE Rating Fetching**: 
   - Fetches player ratings from the FIDE ratings database
   - Matches players by name and country to ensure accuracy
   - Supports parallel fetching (5 concurrent requests) for faster processing
   - Optional caching to avoid redundant API calls

3. **HTML Generation**:
   - Creates a responsive, interactive HTML table
   - Includes filtering, sorting, and search capabilities
   - Displays FIDE ratings, titles, and profile links
   - Shows country flags for visual identification

## 🎨 Features in Detail

### Table Features
- **Division Filter**: Filter participants by division (U8, U10, U12, etc.)
- **Column Sorting**: Click any column header to sort (ascending/descending)
- **FIDE Rating Sorting**: Numeric sorting for ratings
- **FIDE Profile Links**: Clickable links to player profiles on ratings.fide.com

### Data Display
- **Country Flags**: Emoji flags for each country
- **FIDE Titles**: Displayed as badges (GM, IM, WGM, etc.)
- **FIDE Ratings**: Highlighted standard ratings
- **FIDE ID Links**: Direct links to player profiles

## 🚢 Deployment

### GitHub Pages (Automatic)

The project includes a GitHub Actions workflow that automatically:
1. Generates the HTML file on every push to `main` or `master`
2. Deploys it to GitHub Pages

**Setup:**
1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Push to `main` or `master` branch

The workflow will:
- Install dependencies
- Generate HTML with cache enabled
- Deploy to GitHub Pages

### Manual Deployment

1. Generate the HTML file:
```bash
ENABLED_CACHE=true node index.mjs
```

2. Upload the `www/` folder contents to your web server

## 🛠️ Development

### Debug Mode

Use `debug.mjs` to test FIDE API fetching for a single player:

```bash
node debug.mjs
```

This will test fetching FIDE data for "Xia, Justin" from Australia and display detailed debugging information.

### Cache Management

- Cache file: `fide-cache.json`
- Automatically created when `ENABLED_CACHE=true`
- Speeds up subsequent runs by avoiding redundant API calls
- Can be deleted to force fresh data fetching

## 📊 Data Source

- **Primary Source**: [Google Sheets](https://docs.google.com/spreadsheets/d/1kbWX5j6PMq-WFI7mjdYnup_J3YY5xkfrTBmQZuqMpWU/edit?gid=1450537835#gid=1450537835)
- **FIDE Ratings**: [FIDE Ratings Database](https://ratings.fide.com)
- **Official Website**: [2025 Oceania Youth Chess Championship](https://sites.google.com/view/oceaniayouthzonal2025/home)

## 🔍 Supported Countries

The application supports the following countries with their FIDE federation codes:
- 🇦🇺 Australia (AUS)
- 🇳🇿 New Zealand (NZL)
- 🇬🇺 Guam (GUM)
- 🇳🇷 Nauru (NRU)
- 🇫🇯 Fiji (FIJ)
- 🇳🇨 New Caledonia (NCL)
- 🇻🇺 Vanuatu (VAN)
- 🇹🇴 Tonga (TGA)
- 🇵🇬 Papua New Guinea (PNG)

## ⚙️ Configuration

### Parallel Fetching
- Default: 5 concurrent requests
- Delay between batches: 200ms
- Configurable in `index.mjs`:
  ```javascript
  const CONCURRENT_REQUESTS = 5;
  const REQUEST_DELAY = 200;
  ```

### Rate Limiting
The script includes rate limiting to be respectful to the FIDE API:
- 200ms delay between batches of requests
- Parallel processing for faster overall completion

## 📝 Notes

- First run without cache will take approximately 2-3 minutes for ~300 players
- Subsequent runs with cache enabled are much faster
- FIDE ratings are matched by country to avoid false positives
- Players without FIDE ratings will show "-" in rating columns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC

## 📧 Contact

For questions about the event, please contact:
- Email: oceanicyouthchesschamps2025@gmail.com
- Official Website: https://sites.google.com/view/oceaniayouthzonal2025/home

## 🙏 Acknowledgments

- Data provided by Oceania Chess Confederation
- FIDE ratings from the official FIDE database
- Built with Bootstrap 5 and modern web technologies

