// ============================================
// DATA LAYER — data.json + GitHub API CMS
// ============================================

const DATA_KEY = 'portfolio_data';
const GITHUB_CONFIG_KEY = 'portfolio_github_config';

// ---- Fetch data from data.json (for portfolio visitors) ----
async function fetchPortfolioData() {
  try {
    const res = await fetch('data.json?t=' + Date.now());
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Failed to fetch data.json, using localStorage fallback.');
  }
  // Fallback to localStorage
  return getPortfolioData();
}

// ---- localStorage access (for admin draft editing) ----
function getPortfolioData() {
  try {
    const stored = localStorage.getItem(DATA_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('Failed to parse stored data.');
  }
  return null;
}

function savePortfolioData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

// ---- Load data for admin (fetch from data.json, then cache to localStorage) ----
async function loadAdminData() {
  // If we have a local draft, use it
  const local = getPortfolioData();
  if (local) return local;

  // Otherwise fetch from data.json and cache
  const data = await fetchPortfolioData();
  if (data) {
    savePortfolioData(data);
    return data;
  }
  return null;
}

// ---- GitHub Config ----
function getGitHubConfig() {
  try {
    const stored = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return { owner: '', repo: '', token: '', branch: 'main' };
}

function saveGitHubConfig(config) {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
}

// ---- Publish to GitHub (commits data.json to repo) ----
async function publishToGitHub(data) {
  const config = getGitHubConfig();

  if (!config.owner || !config.repo || !config.token) {
    throw new Error('GitHub not configured. Go to Settings → GitHub to set up.');
  }

  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/data.json`;

  // First, get the current file SHA (required for updates)
  let sha = null;
  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.ok) {
      const fileInfo = await getRes.json();
      sha = fileInfo.sha;
    }
  } catch (e) {
    // File might not exist yet, that's OK
  }

  // Encode content as base64
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  const body = {
    message: 'Update portfolio content via admin dashboard',
    content: content,
    branch: config.branch || 'main'
  };

  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const error = await putRes.json();
    throw new Error(error.message || 'Failed to publish to GitHub');
  }

  return await putRes.json();
}

// ---- Export/Import ----
function exportDataAsJSON() {
  const data = getPortfolioData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfolio-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importDataFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        savePortfolioData(data);
        resolve(data);
      } catch (err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Clear local draft (after publish)
function clearLocalDraft() {
  localStorage.removeItem(DATA_KEY);
}
