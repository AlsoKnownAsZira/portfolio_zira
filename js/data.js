// ============================================
// DATA LAYER — localStorage CMS
// ============================================

const DATA_KEY = 'portfolio_data';

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
    introduction: "I'm a passionate developer with 5+ years of experience building modern web applications. I love turning complex problems into simple, beautiful, and intuitive solutions. When I'm not coding, you'll find me exploring new technologies, contributing to open-source projects, or enjoying a good cup of coffee.",
    chips: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Figma', 'UI/UX Design', 'PostgreSQL', 'Docker', 'AWS']
  },
  projects: [
    {
      id: '1',
      title: 'E-Commerce Platform',
      description: 'A full-featured e-commerce platform with real-time inventory management, payment processing, and an intuitive admin dashboard.',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
      tags: ['React', 'Node.js', 'MongoDB', 'Stripe'],
      liveUrl: 'https://example.com',
      repoUrl: 'https://github.com'
    },
    {
      id: '2',
      title: 'Task Management App',
      description: 'Collaborative task management application with real-time updates, drag-and-drop interfaces, and team productivity analytics.',
      image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop',
      tags: ['Vue.js', 'Firebase', 'Tailwind CSS'],
      liveUrl: 'https://example.com',
      repoUrl: 'https://github.com'
    },
    {
      id: '3',
      title: 'AI Content Generator',
      description: 'An AI-powered content generation tool that helps creators produce high-quality articles, social media posts, and marketing copy.',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
      tags: ['Python', 'OpenAI', 'FastAPI', 'React'],
      liveUrl: 'https://example.com',
      repoUrl: 'https://github.com'
    },
    {
      id: '4',
      title: 'Weather Dashboard',
      description: 'Beautiful weather dashboard with interactive maps, 7-day forecasts, and location-based alerts using real-time meteorological data.',
      image: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=600&h=400&fit=crop',
      tags: ['JavaScript', 'D3.js', 'OpenWeather API'],
      liveUrl: 'https://example.com',
      repoUrl: 'https://github.com'
    }
  ],
  experience: [
    {
      id: '1',
      company: 'Tech Solutions Inc.',
      role: 'Senior Full-Stack Developer',
      period: '2023 — Present',
      description: 'Leading the development of microservices architecture, mentoring junior developers, and implementing CI/CD pipelines that reduced deployment time by 60%.'
    },
    {
      id: '2',
      company: 'Digital Agency Co.',
      role: 'Frontend Developer',
      period: '2021 — 2023',
      description: 'Built responsive web applications for 20+ clients, improved page load performance by 40%, and established component library used across all projects.'
    },
    {
      id: '3',
      company: 'StartUp Hub',
      role: 'Junior Developer',
      period: '2019 — 2021',
      description: 'Developed and maintained multiple web applications, collaborated with designers to implement pixel-perfect UIs, and contributed to the internal tools ecosystem.'
    }
  ],
  education: [
    {
      id: '1',
      institution: 'University of Technology',
      degree: 'Bachelor of Computer Science',
      period: '2015 — 2019',
      description: 'Graduated with honors. Focused on software engineering, algorithms, and human-computer interaction. Led the university coding club.'
    },
    {
      id: '2',
      institution: 'Online Academy',
      degree: 'Advanced React & Node.js Certification',
      period: '2020',
      description: 'Completed intensive full-stack development program covering modern React patterns, server-side rendering, and RESTful API design.'
    }
  ],
  contact: {
    email: 'hello@example.com',
    location: 'Jakarta, Indonesia',
    availability: 'Open to freelance & full-time opportunities'
  }
};

// ---- Data Access Functions ----

function getPortfolioData() {
  try {
    const stored = localStorage.getItem(DATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to parse stored data, using defaults.');
  }
  // First visit: seed with default data
  savePortfolioData(DEFAULT_DATA);
  return { ...DEFAULT_DATA };
}

function savePortfolioData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function resetPortfolioData() {
  localStorage.removeItem(DATA_KEY);
  return getPortfolioData();
}

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

// Generate unique IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
