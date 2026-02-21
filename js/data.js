// ============================================
// DATA LAYER — Supabase CMS
// ============================================

const SUPABASE_CONFIG_KEY = 'portfolio_supabase_config';
const DATA_KEY = 'portfolio_data';

// Default data (used as fallback & initial seed)
const DEFAULT_DATA = {
  hero: {
    name: 'John Doe',
    tagline: 'Full-Stack Developer & UI/UX Designer',
    description: 'I craft beautiful, performant digital experiences that live at the intersection of design and technology.',
    socials: [
      { platform: 'GitHub', url: 'https://github.com', icon: 'github' },
      { platform: 'LinkedIn', url: 'https://linkedin.com', icon: 'linkedin' },
      { platform: 'Twitter', url: 'https://twitter.com', icon: 'twitter' },
      { platform: 'Email', url: 'mailto:hello@example.com', icon: 'mail' }
    ]
  },
  about: {
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    introduction: "I'm a passionate developer with 5+ years of experience building modern web applications. I love turning complex problems into simple, beautiful, and intuitive solutions.",
    chips: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Figma', 'UI/UX Design', 'PostgreSQL', 'Docker', 'AWS']
  },
  projects: [
    { id: '1', title: 'E-Commerce Platform', description: 'A full-featured e-commerce platform with real-time inventory management and payment processing.', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop', tags: ['React', 'Node.js', 'MongoDB', 'Stripe'], liveUrl: 'https://example.com', repoUrl: 'https://github.com' },
    { id: '2', title: 'Task Management App', description: 'Collaborative task management application with real-time updates and drag-and-drop interfaces.', image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop', tags: ['Vue.js', 'Firebase', 'Tailwind CSS'], liveUrl: 'https://example.com', repoUrl: 'https://github.com' },
    { id: '3', title: 'AI Content Generator', description: 'An AI-powered content generation tool for articles, social media posts, and marketing copy.', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop', tags: ['Python', 'OpenAI', 'FastAPI', 'React'], liveUrl: 'https://example.com', repoUrl: 'https://github.com' },
    { id: '4', title: 'Weather Dashboard', description: 'Beautiful weather dashboard with interactive maps and 7-day forecasts.', image: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=600&h=400&fit=crop', tags: ['JavaScript', 'D3.js', 'OpenWeather API'], liveUrl: 'https://example.com', repoUrl: 'https://github.com' }
  ],
  experience: [
    { id: '1', company: 'Tech Solutions Inc.', role: 'Senior Full-Stack Developer', period: '2023 — Present', description: 'Leading microservices architecture development, mentoring junior developers, and implementing CI/CD pipelines.' },
    { id: '2', company: 'Digital Agency Co.', role: 'Frontend Developer', period: '2021 — 2023', description: 'Built responsive web applications for 20+ clients and improved page load performance by 40%.' },
    { id: '3', company: 'StartUp Hub', role: 'Junior Developer', period: '2019 — 2021', description: 'Developed and maintained multiple web applications, collaborated with designers to implement pixel-perfect UIs.' }
  ],
  education: [
    { id: '1', institution: 'University of Technology', degree: 'Bachelor of Computer Science', period: '2015 — 2019', description: 'Graduated with honors. Focused on software engineering, algorithms, and human-computer interaction.' },
    { id: '2', institution: 'Online Academy', degree: 'Advanced React & Node.js Certification', period: '2020', description: 'Completed intensive full-stack development program covering modern React patterns and RESTful API design.' }
  ],
  contact: { email: 'hello@example.com', location: 'Jakarta, Indonesia', availability: 'Open to freelance & full-time opportunities' }
};

// ============ Supabase Config ============

function getSupabaseConfig() {
  try {
    const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  // Fallback to config.js constants
  if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) {
    return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
  }
  return { url: '', anonKey: '' };
}

function saveSupabaseConfig(config) {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
}

function isSupabaseConfigured() {
  const c = getSupabaseConfig();
  return !!(c.url && c.anonKey);
}

// ============ Supabase API Helpers ============

async function supabaseRequest(method, endpoint, body) {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) throw new Error('Supabase not configured');

  const url = config.url + '/rest/v1/' + endpoint;
  const headers = {
    'apikey': config.anonKey,
    'Authorization': 'Bearer ' + config.anonKey,
    'Content-Type': 'application/json'
  };
  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }

  const options = { method: method, headers: headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Supabase error: ' + res.status + ' ' + err);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ============ Fetch Data (for portfolio visitors) ============

async function fetchPortfolioData() {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supabaseRequest('GET', 'portfolio_data?id=eq.1&select=content');
      if (rows && rows.length > 0 && rows[0].content && Object.keys(rows[0].content).length > 0) {
        return rows[0].content;
      }
    } catch (e) {
      console.warn('Supabase fetch failed:', e.message);
    }
  }
  return getPortfolioData() || JSON.parse(JSON.stringify(DEFAULT_DATA));
}

// ============ Save to Supabase ============

async function publishToSupabase(data) {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured. Go to Settings to set up.');

  try {
    const rows = await supabaseRequest('GET', 'portfolio_data?id=eq.1&select=id');
    if (rows && rows.length > 0) {
      await supabaseRequest('PATCH', 'portfolio_data?id=eq.1', {
        content: data,
        updated_at: new Date().toISOString()
      });
    } else {
      await supabaseRequest('POST', 'portfolio_data', {
        id: 1,
        content: data,
        updated_at: new Date().toISOString()
      });
    }
  } catch (e) {
    throw new Error('Failed to save: ' + e.message);
  }
}

// ============ localStorage (admin draft) ============

function getPortfolioData() {
  try {
    const stored = localStorage.getItem(DATA_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return null;
}

function savePortfolioData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

// ============ Load data for admin ============

async function loadAdminData() {
  var local = getPortfolioData();
  if (local) return local;

  if (isSupabaseConfigured()) {
    try {
      var rows = await supabaseRequest('GET', 'portfolio_data?id=eq.1&select=content');
      if (rows && rows.length > 0 && rows[0].content && Object.keys(rows[0].content).length > 0) {
        savePortfolioData(rows[0].content);
        return rows[0].content;
      }
    } catch (e) {
      console.warn('Failed to load from Supabase:', e.message);
    }
  }

  var fallback = JSON.parse(JSON.stringify(DEFAULT_DATA));
  savePortfolioData(fallback);
  return fallback;
}

// ============ Export / Import ============

function exportDataAsJSON() {
  var data = getPortfolioData() || DEFAULT_DATA;
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'portfolio-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importDataFromJSON(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        savePortfolioData(data);
        resolve(data);
      } catch (err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = function() { reject(new Error('Failed to read file')); };
    reader.readAsText(file);
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
