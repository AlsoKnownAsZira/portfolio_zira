// ============================================
// ADMIN DASHBOARD — Logic
// ============================================

const DEFAULT_PASSWORD = 'admin123';
const PASSWORD_KEY = 'portfolio_admin_password';
let currentPanel = 'hero';

function getAdminPassword() {
  return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
}

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initSidebar();
  initPanels();
  initAdminData();
});

// ---- Init: load data from data.json ----
async function initAdminData() {
  const data = await loadAdminData();
  if (data) {
    loadAllPanels(data);
  }
  loadGitHubConfig();
}

// ---- Login ----
function initLogin() {
  const overlay = document.getElementById('login-overlay');
  const form = document.getElementById('login-form');
  const errorMsg = document.getElementById('login-error');

  if (sessionStorage.getItem('admin_auth') === 'true') {
    overlay.classList.add('hidden');
    document.getElementById('admin-layout').classList.remove('locked');
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = document.getElementById('login-password').value;
    if (pw === getAdminPassword()) {
      sessionStorage.setItem('admin_auth', 'true');
      overlay.classList.add('hidden');
      document.getElementById('admin-layout').classList.remove('locked');
      showToast('Welcome to the admin dashboard!', 'success');
    } else {
      errorMsg.classList.add('show');
      document.getElementById('login-password').value = '';
    }
  });
}

// ---- Sidebar Navigation ----
function initSidebar() {
  const navItems = document.querySelectorAll('.sidebar-nav-item[data-panel]');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      switchPanel(item.dataset.panel);
    });
  });

  const toggle = document.getElementById('mobile-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}

function switchPanel(panelId) {
  currentPanel = panelId;
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`panel-${panelId}`);
  if (panel) panel.classList.add('active');

  const titles = {
    hero: { title: 'Hero & Social Links', desc: 'Edit your hero section and social media links' },
    about: { title: 'About Me', desc: 'Manage your photo, introduction, and skills' },
    projects: { title: 'Projects', desc: 'Add, edit, or remove your portfolio projects' },
    experience: { title: 'Experience', desc: 'Manage your work experience entries' },
    education: { title: 'Education', desc: 'Manage your education history' },
    settings: { title: 'Settings', desc: 'GitHub deployment, export/import, and contact info' }
  };

  const info = titles[panelId] || { title: 'Dashboard', desc: '' };
  document.getElementById('panel-title').textContent = info.title;
  document.getElementById('panel-desc').textContent = info.desc;
  document.querySelector('.sidebar').classList.remove('open');
}

// ---- Initialize Panels ----
function initPanels() {
  document.getElementById('hero-form').addEventListener('submit', saveHero);
  document.getElementById('about-form').addEventListener('submit', saveAbout);
  initChipsEditor();

  // Photo preview
  const photoInput = document.getElementById('about-photo');
  const photoPreview = document.getElementById('photo-preview');
  photoInput.addEventListener('input', () => {
    if (photoInput.value) {
      photoPreview.src = photoInput.value;
      photoPreview.classList.add('show');
      photoPreview.onerror = () => photoPreview.classList.remove('show');
    } else {
      photoPreview.classList.remove('show');
    }
  });

  // Settings buttons
  document.getElementById('btn-export').addEventListener('click', () => {
    exportDataAsJSON();
    showToast('Data exported successfully!', 'success');
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const data = await importDataFromJSON(file);
        loadAllPanels(data);
        showToast('Data imported successfully!', 'success');
      } catch (err) {
        showToast('Import failed: ' + err.message, 'error');
      }
    }
  });

  document.getElementById('btn-reset').addEventListener('click', async () => {
    if (confirm('Are you sure? This will reload data from the live site.')) {
      clearLocalDraft();
      const data = await fetchPortfolioData();
      if (data) {
        savePortfolioData(data);
        loadAllPanels(data);
      }
      showToast('Data reloaded from live site', 'success');
    }
  });

  document.getElementById('btn-view-site').addEventListener('click', () => {
    window.open('index.html', '_blank');
  });

  // Publish button
  document.getElementById('btn-publish').addEventListener('click', handlePublish);

  // GitHub config form
  document.getElementById('github-form').addEventListener('submit', saveGitHubConfigForm);

  // Password form
  document.getElementById('password-form').addEventListener('submit', changePassword);
}

// ---- Load All Panels ----
function loadAllPanels(data) {
  if (!data) data = getPortfolioData();
  if (!data) return;
  loadHeroPanel(data.hero);
  loadAboutPanel(data.about);
  loadProjectsPanel(data.projects);
  loadExperiencePanel(data.experience);
  loadEducationPanel(data.education);
  loadContactPanel(data.contact);
}

// ---- Publish to GitHub ----
async function handlePublish() {
  const btn = document.getElementById('btn-publish');
  const data = getPortfolioData();

  if (!data) {
    showToast('No changes to publish', 'error');
    return;
  }

  const config = getGitHubConfig();
  if (!config.owner || !config.repo || !config.token) {
    showToast('Configure GitHub first! Go to Settings → GitHub Configuration', 'error');
    switchPanel('settings');
    document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector('[data-panel="settings"]').classList.add('active');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Publishing...';

  try {
    await publishToGitHub(data);
    clearLocalDraft();
    showToast('✅ Published! Your site will update in ~30 seconds.', 'success');
    updatePublishStatus('published');
  } catch (err) {
    showToast('Publish failed: ' + err.message, 'error');
    updatePublishStatus('error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 Publish to Live Site';
  }
}

function updatePublishStatus(status) {
  const indicator = document.getElementById('publish-status');
  if (!indicator) return;
  if (status === 'published') {
    indicator.className = 'publish-status success';
    indicator.textContent = '✓ Live — up to date';
  } else if (status === 'draft') {
    indicator.className = 'publish-status draft';
    indicator.textContent = '● Unpublished changes';
  } else if (status === 'error') {
    indicator.className = 'publish-status error';
    indicator.textContent = '✕ Publish failed';
  }
}

function markDraftChanged() {
  updatePublishStatus('draft');
}

// ---- GitHub Config ----
function loadGitHubConfig() {
  const config = getGitHubConfig();
  document.getElementById('gh-owner').value = config.owner || '';
  document.getElementById('gh-repo').value = config.repo || '';
  document.getElementById('gh-token').value = config.token || '';
  document.getElementById('gh-branch').value = config.branch || 'main';
}

function saveGitHubConfigForm(e) {
  e.preventDefault();
  const config = {
    owner: document.getElementById('gh-owner').value.trim(),
    repo: document.getElementById('gh-repo').value.trim(),
    token: document.getElementById('gh-token').value.trim(),
    branch: document.getElementById('gh-branch').value.trim() || 'main'
  };
  saveGitHubConfig(config);
  showToast('GitHub configuration saved!', 'success');
}

// ---- Hero Panel ----
function loadHeroPanel(hero) {
  document.getElementById('hero-name').value = hero.name || '';
  document.getElementById('hero-tagline').value = hero.tagline || '';
  document.getElementById('hero-description').value = hero.description || '';
  loadSocialLinks(hero.socials || []);
}

function loadSocialLinks(socials) {
  const container = document.getElementById('socials-list');
  container.innerHTML = socials.map((s, i) => `
    <div class="social-item" data-index="${i}">
      <input type="text" class="form-input" value="${s.platform}" placeholder="Platform" data-field="platform" />
      <input type="text" class="form-input" value="${s.icon}" placeholder="Icon name" data-field="icon" />
      <input type="url" class="form-input" value="${s.url}" placeholder="URL" data-field="url" />
      <button type="button" class="btn btn-danger btn-sm" onclick="removeSocial(${i})">✕</button>
    </div>
  `).join('');
}

function addSocial() {
  const data = getPortfolioData();
  data.hero.socials.push({ platform: '', url: '', icon: 'globe' });
  savePortfolioData(data);
  loadSocialLinks(data.hero.socials);
  markDraftChanged();
}

function removeSocial(index) {
  const data = getPortfolioData();
  data.hero.socials.splice(index, 1);
  savePortfolioData(data);
  loadSocialLinks(data.hero.socials);
  markDraftChanged();
  showToast('Social link removed', 'success');
}

function saveHero(e) {
  e.preventDefault();
  const data = getPortfolioData();
  data.hero.name = document.getElementById('hero-name').value;
  data.hero.tagline = document.getElementById('hero-tagline').value;
  data.hero.description = document.getElementById('hero-description').value;

  const socialItems = document.querySelectorAll('.social-item');
  data.hero.socials = Array.from(socialItems).map(item => ({
    platform: item.querySelector('[data-field="platform"]').value,
    icon: item.querySelector('[data-field="icon"]').value,
    url: item.querySelector('[data-field="url"]').value
  }));

  savePortfolioData(data);
  markDraftChanged();
  showToast('Hero section saved! Click Publish to go live.', 'success');
}

// ---- About Panel ----
function loadAboutPanel(about) {
  document.getElementById('about-photo').value = about.photo || '';
  document.getElementById('about-intro').value = about.introduction || '';

  const photoPreview = document.getElementById('photo-preview');
  if (about.photo) {
    photoPreview.src = about.photo;
    photoPreview.classList.add('show');
  }

  loadChips(about.chips || []);
}

let currentChips = [];

function loadChips(chips) {
  currentChips = [...chips];
  renderChips();
}

function renderChips() {
  const container = document.getElementById('chips-container');
  const input = document.getElementById('chip-input');
  const chipsHtml = currentChips.map((chip, i) => `
    <span class="chip">${chip}<span class="chip-remove" onclick="removeChip(${i})">×</span></span>
  `).join('');
  container.innerHTML = chipsHtml;
  container.appendChild(input);
}

function initChipsEditor() {
  const input = document.getElementById('chip-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.value.trim().replace(',', '');
      if (val && !currentChips.includes(val)) {
        currentChips.push(val);
        renderChips();
        input.value = '';
      }
    }
    if (e.key === 'Backspace' && !input.value && currentChips.length) {
      currentChips.pop();
      renderChips();
    }
  });
}

function removeChip(index) {
  currentChips.splice(index, 1);
  renderChips();
}

function saveAbout(e) {
  e.preventDefault();
  const data = getPortfolioData();
  data.about.photo = document.getElementById('about-photo').value;
  data.about.introduction = document.getElementById('about-intro').value;
  data.about.chips = [...currentChips];
  savePortfolioData(data);
  markDraftChanged();
  showToast('About section saved! Click Publish to go live.', 'success');
}

// ---- Projects Panel ----
function loadProjectsPanel(projects) {
  const container = document.getElementById('projects-list');
  if (!projects || !projects.length) {
    container.innerHTML = '<div class="empty-state">No projects yet. Click "Add Project" to get started.</div>';
    return;
  }
  container.innerHTML = projects.map(p => `
    <div class="item-card">
      <img src="${p.image}" alt="" class="item-thumb" onerror="this.style.display='none'" />
      <div class="item-info">
        <h4>${p.title}</h4>
        <p>${(p.tags || []).join(' · ')}</p>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost btn-sm" onclick="editProject('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function showProjectModal(project = null) {
  const isEdit = !!project;
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = isEdit ? 'Edit Project' : 'Add Project';

  document.getElementById('modal-body').innerHTML = `
    <form id="project-modal-form">
      <input type="hidden" id="pm-id" value="${isEdit ? project.id : ''}" />
      <div class="form-group">
        <label>Title</label>
        <input type="text" class="form-input" id="pm-title" value="${isEdit ? project.title : ''}" required />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea class="form-textarea" id="pm-desc">${isEdit ? project.description : ''}</textarea>
      </div>
      <div class="form-group">
        <label>Image URL</label>
        <input type="url" class="form-input" id="pm-image" value="${isEdit ? project.image : ''}" />
        <img class="img-preview ${isEdit && project.image ? 'show' : ''}" id="pm-image-preview" src="${isEdit ? project.image : ''}" onerror="this.classList.remove('show')" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Live URL</label>
          <input type="url" class="form-input" id="pm-live" value="${isEdit ? project.liveUrl || '' : ''}" />
        </div>
        <div class="form-group">
          <label>Repo URL</label>
          <input type="url" class="form-input" id="pm-repo" value="${isEdit ? project.repoUrl || '' : ''}" />
        </div>
      </div>
      <div class="form-group">
        <label>Tags (comma separated)</label>
        <input type="text" class="form-input" id="pm-tags" value="${isEdit ? (project.tags || []).join(', ') : ''}" />
      </div>
    </form>
  `;

  const imgInput = document.getElementById('pm-image');
  const imgPreview = document.getElementById('pm-image-preview');
  imgInput.addEventListener('input', () => {
    if (imgInput.value) {
      imgPreview.src = imgInput.value;
      imgPreview.classList.add('show');
      imgPreview.onerror = () => imgPreview.classList.remove('show');
    } else {
      imgPreview.classList.remove('show');
    }
  });

  document.getElementById('modal-save').onclick = saveProjectModal;
  modal.classList.remove('hidden');
}

function saveProjectModal() {
  const id = document.getElementById('pm-id').value;
  const data = getPortfolioData();
  const project = {
    id: id || generateId(),
    title: document.getElementById('pm-title').value,
    description: document.getElementById('pm-desc').value,
    image: document.getElementById('pm-image').value,
    liveUrl: document.getElementById('pm-live').value,
    repoUrl: document.getElementById('pm-repo').value,
    tags: document.getElementById('pm-tags').value.split(',').map(t => t.trim()).filter(Boolean)
  };

  if (!project.title) { showToast('Title is required', 'error'); return; }

  if (id) {
    const idx = data.projects.findIndex(p => p.id === id);
    if (idx !== -1) data.projects[idx] = project;
  } else {
    data.projects.push(project);
  }

  savePortfolioData(data);
  loadProjectsPanel(data.projects);
  closeModal();
  markDraftChanged();
  showToast(id ? 'Project updated!' : 'Project added!', 'success');
}

function editProject(id) {
  const data = getPortfolioData();
  const project = data.projects.find(p => p.id === id);
  if (project) showProjectModal(project);
}

function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  const data = getPortfolioData();
  data.projects = data.projects.filter(p => p.id !== id);
  savePortfolioData(data);
  loadProjectsPanel(data.projects);
  markDraftChanged();
  showToast('Project deleted', 'success');
}

// ---- Experience Panel ----
function loadExperiencePanel(experience) {
  const container = document.getElementById('experience-list');
  if (!experience || !experience.length) {
    container.innerHTML = '<div class="empty-state">No experience entries. Click "Add Experience" to start.</div>';
    return;
  }
  container.innerHTML = experience.map(e => `
    <div class="item-card">
      <div class="item-info">
        <h4>${e.role}</h4>
        <p>${e.company} · ${e.period}</p>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost btn-sm" onclick="editExperience('${e.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteExperience('${e.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function showExperienceModal(exp = null) {
  const isEdit = !!exp;
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = isEdit ? 'Edit Experience' : 'Add Experience';

  document.getElementById('modal-body').innerHTML = `
    <form id="exp-modal-form">
      <input type="hidden" id="em-id" value="${isEdit ? exp.id : ''}" />
      <div class="form-row">
        <div class="form-group">
          <label>Company</label>
          <input type="text" class="form-input" id="em-company" value="${isEdit ? exp.company : ''}" required />
        </div>
        <div class="form-group">
          <label>Role</label>
          <input type="text" class="form-input" id="em-role" value="${isEdit ? exp.role : ''}" required />
        </div>
      </div>
      <div class="form-group">
        <label>Period</label>
        <input type="text" class="form-input" id="em-period" value="${isEdit ? exp.period : ''}" placeholder="e.g. 2022 — Present" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea class="form-textarea" id="em-desc">${isEdit ? exp.description : ''}</textarea>
      </div>
    </form>
  `;

  document.getElementById('modal-save').onclick = saveExperienceModal;
  modal.classList.remove('hidden');
}

function saveExperienceModal() {
  const id = document.getElementById('em-id').value;
  const data = getPortfolioData();
  const entry = {
    id: id || generateId(),
    company: document.getElementById('em-company').value,
    role: document.getElementById('em-role').value,
    period: document.getElementById('em-period').value,
    description: document.getElementById('em-desc').value
  };

  if (!entry.company || !entry.role) { showToast('Company and role are required', 'error'); return; }

  if (id) {
    const idx = data.experience.findIndex(e => e.id === id);
    if (idx !== -1) data.experience[idx] = entry;
  } else {
    data.experience.push(entry);
  }

  savePortfolioData(data);
  loadExperiencePanel(data.experience);
  closeModal();
  markDraftChanged();
  showToast(id ? 'Experience updated!' : 'Experience added!', 'success');
}

function editExperience(id) {
  const data = getPortfolioData();
  const entry = data.experience.find(e => e.id === id);
  if (entry) showExperienceModal(entry);
}

function deleteExperience(id) {
  if (!confirm('Delete this experience?')) return;
  const data = getPortfolioData();
  data.experience = data.experience.filter(e => e.id !== id);
  savePortfolioData(data);
  loadExperiencePanel(data.experience);
  markDraftChanged();
  showToast('Experience deleted', 'success');
}

// ---- Education Panel ----
function loadEducationPanel(education) {
  const container = document.getElementById('education-list');
  if (!education || !education.length) {
    container.innerHTML = '<div class="empty-state">No education entries. Click "Add Education" to start.</div>';
    return;
  }
  container.innerHTML = education.map(e => `
    <div class="item-card">
      <div class="item-info">
        <h4>${e.degree}</h4>
        <p>${e.institution} · ${e.period}</p>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost btn-sm" onclick="editEducation('${e.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEducation('${e.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function showEducationModal(edu = null) {
  const isEdit = !!edu;
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = isEdit ? 'Edit Education' : 'Add Education';

  document.getElementById('modal-body').innerHTML = `
    <form id="edu-modal-form">
      <input type="hidden" id="edm-id" value="${isEdit ? edu.id : ''}" />
      <div class="form-row">
        <div class="form-group">
          <label>Institution</label>
          <input type="text" class="form-input" id="edm-institution" value="${isEdit ? edu.institution : ''}" required />
        </div>
        <div class="form-group">
          <label>Degree / Certificate</label>
          <input type="text" class="form-input" id="edm-degree" value="${isEdit ? edu.degree : ''}" required />
        </div>
      </div>
      <div class="form-group">
        <label>Period</label>
        <input type="text" class="form-input" id="edm-period" value="${isEdit ? edu.period : ''}" placeholder="e.g. 2015 — 2019" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea class="form-textarea" id="edm-desc">${isEdit ? edu.description : ''}</textarea>
      </div>
    </form>
  `;

  document.getElementById('modal-save').onclick = saveEducationModal;
  modal.classList.remove('hidden');
}

function saveEducationModal() {
  const id = document.getElementById('edm-id').value;
  const data = getPortfolioData();
  const entry = {
    id: id || generateId(),
    institution: document.getElementById('edm-institution').value,
    degree: document.getElementById('edm-degree').value,
    period: document.getElementById('edm-period').value,
    description: document.getElementById('edm-desc').value
  };

  if (!entry.institution || !entry.degree) { showToast('Institution and degree are required', 'error'); return; }

  if (id) {
    const idx = data.education.findIndex(e => e.id === id);
    if (idx !== -1) data.education[idx] = entry;
  } else {
    data.education.push(entry);
  }

  savePortfolioData(data);
  loadEducationPanel(data.education);
  closeModal();
  markDraftChanged();
  showToast(id ? 'Education updated!' : 'Education added!', 'success');
}

function editEducation(id) {
  const data = getPortfolioData();
  const entry = data.education.find(e => e.id === id);
  if (entry) showEducationModal(entry);
}

function deleteEducation(id) {
  if (!confirm('Delete this education entry?')) return;
  const data = getPortfolioData();
  data.education = data.education.filter(e => e.id !== id);
  savePortfolioData(data);
  loadEducationPanel(data.education);
  markDraftChanged();
  showToast('Education deleted', 'success');
}

// ---- Contact Panel ----
function loadContactPanel(contact) {
  if (!contact) return;
  document.getElementById('contact-email').value = contact.email || '';
  document.getElementById('contact-location').value = contact.location || '';
  document.getElementById('contact-availability').value = contact.availability || '';
}

function saveContact(e) {
  e.preventDefault();
  const data = getPortfolioData();
  if (!data.contact) data.contact = {};
  data.contact.email = document.getElementById('contact-email').value;
  data.contact.location = document.getElementById('contact-location').value;
  data.contact.availability = document.getElementById('contact-availability').value;
  savePortfolioData(data);
  markDraftChanged();
  showToast('Contact info saved! Click Publish to go live.', 'success');
}

// ---- Change Password ----
function changePassword(e) {
  e.preventDefault();
  const current = document.getElementById('pw-current').value;
  const newPw = document.getElementById('pw-new').value;
  const confirmPw = document.getElementById('pw-confirm').value;

  if (current !== getAdminPassword()) {
    showToast('Current password is incorrect', 'error');
    return;
  }
  if (newPw.length < 4) {
    showToast('New password must be at least 4 characters', 'error');
    return;
  }
  if (newPw !== confirmPw) {
    showToast('New passwords do not match', 'error');
    return;
  }

  localStorage.setItem(PASSWORD_KEY, newPw);
  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  showToast('Password changed successfully!', 'success');
}

// ---- Modal ----
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ---- Toast ----
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
