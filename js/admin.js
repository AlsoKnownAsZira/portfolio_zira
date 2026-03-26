// ============================================
// ADMIN DASHBOARD — Logic
// ============================================

var DEFAULT_PASSWORD = 'admin123';
var PASSWORD_KEY = 'portfolio_admin_password';
var currentPanel = 'hero';

function getAdminPassword() {
  return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
}

document.addEventListener('DOMContentLoaded', function() {
  initLogin();
  initSidebar();
  initPanels();
  initAdminData();
  initMessages();
});

async function initAdminData() {
  var data = await loadAdminData();
  if (data) loadAllPanels(data);
  loadSupabaseConfig();
}

// ---- Login ----
function initLogin() {
  var overlay = document.getElementById('login-overlay');
  var form = document.getElementById('login-form');
  var errorMsg = document.getElementById('login-error');

  if (sessionStorage.getItem('admin_auth') === 'true') {
    overlay.classList.add('hidden');
    document.getElementById('admin-layout').classList.remove('locked');
    return;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var pw = document.getElementById('login-password').value;
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

// ---- Sidebar ----
function initSidebar() {
  var navItems = document.querySelectorAll('.sidebar-nav-item[data-panel]');
  navItems.forEach(function(item) {
    item.addEventListener('click', function() {
      navItems.forEach(function(i) { i.classList.remove('active'); });
      item.classList.add('active');
      switchPanel(item.dataset.panel);
    });
  });
  var toggle = document.getElementById('mobile-toggle');
  var sidebar = document.querySelector('.sidebar');
  if (toggle) {
    toggle.addEventListener('click', function() { sidebar.classList.toggle('open'); });
  }
}

function switchPanel(panelId) {
  currentPanel = panelId;
  document.querySelectorAll('.admin-panel').forEach(function(p) { p.classList.remove('active'); });
  var panel = document.getElementById('panel-' + panelId);
  if (panel) panel.classList.add('active');

  var titles = {
    hero: { title: 'Hero & Social Links', desc: 'Edit your hero section and social media links' },
    about: { title: 'About Me', desc: 'Manage your photo, introduction, and skills' },
    projects: { title: 'Projects', desc: 'Add, edit, or remove your portfolio projects' },
    experience: { title: 'Experience', desc: 'Manage your work experience entries' },
    education: { title: 'Education', desc: 'Manage your education history' },
    settings: { title: 'Settings', desc: 'Supabase config, export/import, and contact info' },
    messages: { title: 'Messages', desc: 'View messages from your contact form' },
    cvmaker: { title: 'CV Maker', desc: 'Generate and download a professional CV from your data' }
  };
  var info = titles[panelId] || { title: 'Dashboard', desc: '' };
  document.getElementById('panel-title').textContent = info.title;
  document.getElementById('panel-desc').textContent = info.desc;
  document.querySelector('.sidebar').classList.remove('open');
}

// ---- Init Panels ----
function initPanels() {
  document.getElementById('hero-form').addEventListener('submit', saveHero);
  document.getElementById('about-form').addEventListener('submit', saveAbout);
  initChipsEditor();

  var photoInput = document.getElementById('about-photo');
  var photoPreview = document.getElementById('photo-preview');
  photoInput.addEventListener('input', function() {
    if (photoInput.value) {
      photoPreview.src = photoInput.value;
      photoPreview.classList.add('show');
      photoPreview.onerror = function() { photoPreview.classList.remove('show'); };
    } else {
      photoPreview.classList.remove('show');
    }
  });

  document.getElementById('btn-export').addEventListener('click', function() {
    exportDataAsJSON();
    showToast('Data exported successfully!', 'success');
  });

  document.getElementById('btn-import').addEventListener('click', function() {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', async function(e) {
    var file = e.target.files[0];
    if (file) {
      try {
        var data = await importDataFromJSON(file);
        loadAllPanels(data);
        showToast('Data imported successfully!', 'success');
      } catch (err) {
        showToast('Import failed: ' + err.message, 'error');
      }
    }
  });

  document.getElementById('btn-reset').addEventListener('click', async function() {
    if (confirm('Are you sure? This will reset all data to defaults.')) {
      localStorage.removeItem(DATA_KEY);
      var data = await loadAdminData();
      loadAllPanels(data);
      showToast('Data reloaded successfully', 'success');
    }
  });

  document.getElementById('btn-view-site').addEventListener('click', function() {
    window.open('index.html', '_blank');
  });

  document.getElementById('btn-publish').addEventListener('click', handlePublish);
  document.getElementById('supabase-form').addEventListener('submit', saveSupabaseConfigForm);
  document.getElementById('password-form').addEventListener('submit', changePassword);
  document.getElementById('discord-form').addEventListener('submit', saveDiscordWebhook);
  document.getElementById('btn-test-webhook').addEventListener('click', testDiscordWebhook);
  loadDiscordWebhook();
  initCVMaker();
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

// ---- Publish ----
async function handlePublish() {
  var btn = document.getElementById('btn-publish');
  var data = getPortfolioData();

  if (!data) { showToast('No changes to publish', 'error'); return; }

  if (!isSupabaseConfigured()) {
    showToast('Configure Supabase first! Go to Settings', 'error');
    switchPanel('settings');
    document.querySelectorAll('.sidebar-nav-item').forEach(function(i) { i.classList.remove('active'); });
    document.querySelector('[data-panel="settings"]').classList.add('active');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Publishing...';

  try {
    await publishToSupabase(data);
    showToast('Published! Changes are live now.', 'success');
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
  var indicator = document.getElementById('publish-status');
  if (!indicator) return;
  if (status === 'published') { indicator.className = 'publish-status success'; indicator.textContent = '✓ Live — up to date'; }
  else if (status === 'draft') { indicator.className = 'publish-status draft'; indicator.textContent = '● Unpublished changes'; }
  else if (status === 'error') { indicator.className = 'publish-status error'; indicator.textContent = '✕ Publish failed'; }
}

function markDraftChanged() { updatePublishStatus('draft'); }

// ---- Supabase Config ----
function loadSupabaseConfig() {
  var config = getSupabaseConfig();
  document.getElementById('sb-url').value = config.url || '';
  document.getElementById('sb-anon-key').value = config.anonKey || '';
}

function saveSupabaseConfigForm(e) {
  e.preventDefault();
  var config = {
    url: document.getElementById('sb-url').value.trim(),
    anonKey: document.getElementById('sb-anon-key').value.trim()
  };
  saveSupabaseConfig(config);
  showToast('Supabase configuration saved!', 'success');
}

// ---- Hero Panel ----
function loadHeroPanel(hero) {
  document.getElementById('hero-name').value = hero.name || '';
  document.getElementById('hero-tagline').value = hero.tagline || '';
  document.getElementById('hero-description').value = hero.description || '';
  loadSocialLinks(hero.socials || []);
}

function loadSocialLinks(socials) {
  var container = document.getElementById('socials-list');
  container.innerHTML = socials.map(function(s, i) {
    return '<div class="social-item" data-index="' + i + '"><input type="text" class="form-input" value="' + s.platform + '" placeholder="Platform" data-field="platform" /><input type="text" class="form-input" value="' + s.icon + '" placeholder="Icon name" data-field="icon" /><input type="url" class="form-input" value="' + s.url + '" placeholder="URL" data-field="url" /><button type="button" class="btn btn-danger btn-sm" onclick="removeSocial(' + i + ')">✕</button></div>';
  }).join('');
}

function addSocial() {
  var data = getPortfolioData();
  data.hero.socials.push({ platform: '', url: '', icon: 'globe' });
  savePortfolioData(data);
  loadSocialLinks(data.hero.socials);
  markDraftChanged();
}

function removeSocial(index) {
  var data = getPortfolioData();
  data.hero.socials.splice(index, 1);
  savePortfolioData(data);
  loadSocialLinks(data.hero.socials);
  markDraftChanged();
  showToast('Social link removed', 'success');
}

function saveHero(e) {
  e.preventDefault();
  var data = getPortfolioData();
  data.hero.name = document.getElementById('hero-name').value;
  data.hero.tagline = document.getElementById('hero-tagline').value;
  data.hero.description = document.getElementById('hero-description').value;

  var socialItems = document.querySelectorAll('.social-item');
  data.hero.socials = Array.from(socialItems).map(function(item) {
    return {
      platform: item.querySelector('[data-field="platform"]').value,
      icon: item.querySelector('[data-field="icon"]').value,
      url: item.querySelector('[data-field="url"]').value
    };
  });
  savePortfolioData(data);
  markDraftChanged();
  showToast('Hero section saved! Click Publish to go live.', 'success');
}

// ---- About Panel ----
function loadAboutPanel(about) {
  document.getElementById('about-photo').value = about.photo || '';
  document.getElementById('about-intro').value = about.introduction || '';
  var photoPreview = document.getElementById('photo-preview');
  if (about.photo) { photoPreview.src = about.photo; photoPreview.classList.add('show'); }
  loadChips(about.chips || []);
}

var currentChips = [];

function loadChips(chips) { currentChips = chips.slice(); renderChips(); }

function renderChips() {
  var container = document.getElementById('chips-container');
  var input = document.getElementById('chip-input');
  var html = currentChips.map(function(chip, i) {
    return '<span class="chip">' + chip + '<span class="chip-remove" onclick="removeChip(' + i + ')">×</span></span>';
  }).join('');
  container.innerHTML = html;
  container.appendChild(input);
}

function initChipsEditor() {
  var input = document.getElementById('chip-input');
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      var val = input.value.trim().replace(',', '');
      if (val && currentChips.indexOf(val) === -1) {
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

function removeChip(index) { currentChips.splice(index, 1); renderChips(); }

function saveAbout(e) {
  e.preventDefault();
  var data = getPortfolioData();
  data.about.photo = document.getElementById('about-photo').value;
  data.about.introduction = document.getElementById('about-intro').value;
  data.about.chips = currentChips.slice();
  savePortfolioData(data);
  markDraftChanged();
  showToast('About section saved! Click Publish to go live.', 'success');
}

// ---- Projects Panel ----
function loadProjectsPanel(projects) {
  var container = document.getElementById('projects-list');
  if (!projects || !projects.length) { container.innerHTML = '<div class="empty-state">No projects yet. Click "Add Project" to get started.</div>'; return; }
  container.innerHTML = projects.map(function(p) {
    return '<div class="item-card"><img src="' + p.image + '" alt="" class="item-thumb" onerror="this.style.display=\'none\'" /><div class="item-info"><h4>' + p.title + '</h4><p>' + (p.tags || []).join(' · ') + '</p></div><div class="item-actions"><button class="btn btn-ghost btn-sm" onclick="editProject(\'' + p.id + '\')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProject(\'' + p.id + '\')">Delete</button></div></div>';
  }).join('');
}

function showProjectModal(project) {
  var isEdit = !!project;
  var modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = isEdit ? 'Edit Project' : 'Add Project';
  document.getElementById('modal-body').innerHTML =
    '<form id="project-modal-form"><input type="hidden" id="pm-id" value="' + (isEdit ? project.id : '') + '" />' +
    '<div class="form-group"><label>Title</label><input type="text" class="form-input" id="pm-title" value="' + (isEdit ? project.title : '') + '" required /></div>' +
    '<div class="form-group"><label>Description</label><textarea class="form-textarea" id="pm-desc">' + (isEdit ? project.description : '') + '</textarea></div>' +
    '<div class="form-group"><label>Image URL</label><input type="url" class="form-input" id="pm-image" value="' + (isEdit ? project.image : '') + '" /></div>' +
    '<div class="form-row"><div class="form-group"><label>Live URL</label><input type="url" class="form-input" id="pm-live" value="' + (isEdit ? project.liveUrl || '' : '') + '" /></div>' +
    '<div class="form-group"><label>Repo URL</label><input type="url" class="form-input" id="pm-repo" value="' + (isEdit ? project.repoUrl || '' : '') + '" /></div></div>' +
    '<div class="form-group"><label>Tags (comma separated)</label><input type="text" class="form-input" id="pm-tags" value="' + (isEdit ? (project.tags || []).join(', ') : '') + '" /></div></form>';
  document.getElementById('modal-save').onclick = saveProjectModal;
  modal.classList.remove('hidden');
}

function saveProjectModal() {
  var id = document.getElementById('pm-id').value;
  var data = getPortfolioData();
  var project = {
    id: id || generateId(),
    title: document.getElementById('pm-title').value,
    description: document.getElementById('pm-desc').value,
    image: document.getElementById('pm-image').value,
    liveUrl: document.getElementById('pm-live').value,
    repoUrl: document.getElementById('pm-repo').value,
    tags: document.getElementById('pm-tags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean)
  };
  if (!project.title) { showToast('Title is required', 'error'); return; }
  if (id) { var idx = data.projects.findIndex(function(p) { return p.id === id; }); if (idx !== -1) data.projects[idx] = project; }
  else { data.projects.push(project); }
  savePortfolioData(data);
  loadProjectsPanel(data.projects);
  closeModal();
  markDraftChanged();
  showToast(id ? 'Project updated!' : 'Project added!', 'success');
}

function editProject(id) {
  var data = getPortfolioData();
  var project = data.projects.find(function(p) { return p.id === id; });
  if (project) showProjectModal(project);
}

function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  var data = getPortfolioData();
  data.projects = data.projects.filter(function(p) { return p.id !== id; });
  savePortfolioData(data);
  loadProjectsPanel(data.projects);
  markDraftChanged();
  showToast('Project deleted', 'success');
}

// ---- Experience Panel ----
function loadExperiencePanel(experience) {
  var container = document.getElementById('experience-list');
  if (!experience || !experience.length) { container.innerHTML = '<div class="empty-state">No experience entries.</div>'; return; }
  container.innerHTML = experience.map(function(e) {
    return '<div class="item-card"><div class="item-info"><h4>' + e.role + '</h4><p>' + e.company + ' · ' + e.period + '</p></div><div class="item-actions"><button class="btn btn-ghost btn-sm" onclick="editExperience(\'' + e.id + '\')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteExperience(\'' + e.id + '\')">Delete</button></div></div>';
  }).join('');
}

function showExperienceModal(exp) {
  var isEdit = !!exp;
  var modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = isEdit ? 'Edit Experience' : 'Add Experience';
  document.getElementById('modal-body').innerHTML =
    '<form id="exp-modal-form"><input type="hidden" id="em-id" value="' + (isEdit ? exp.id : '') + '" />' +
    '<div class="form-row"><div class="form-group"><label>Company</label><input type="text" class="form-input" id="em-company" value="' + (isEdit ? exp.company : '') + '" required /></div>' +
    '<div class="form-group"><label>Role</label><input type="text" class="form-input" id="em-role" value="' + (isEdit ? exp.role : '') + '" required /></div></div>' +
    '<div class="form-group"><label>Period</label><input type="text" class="form-input" id="em-period" value="' + (isEdit ? exp.period : '') + '" placeholder="e.g. 2022 — Present" /></div>' +
    '<div class="form-group"><label>Description</label><textarea class="form-textarea" id="em-desc">' + (isEdit ? exp.description : '') + '</textarea></div></form>';
  document.getElementById('modal-save').onclick = saveExperienceModal;
  modal.classList.remove('hidden');
}

function saveExperienceModal() {
  var id = document.getElementById('em-id').value;
  var data = getPortfolioData();
  var entry = { id: id || generateId(), company: document.getElementById('em-company').value, role: document.getElementById('em-role').value, period: document.getElementById('em-period').value, description: document.getElementById('em-desc').value };
  if (!entry.company || !entry.role) { showToast('Company and role are required', 'error'); return; }
  if (id) { var idx = data.experience.findIndex(function(e) { return e.id === id; }); if (idx !== -1) data.experience[idx] = entry; }
  else { data.experience.push(entry); }
  savePortfolioData(data);
  loadExperiencePanel(data.experience);
  closeModal();
  markDraftChanged();
  showToast(id ? 'Experience updated!' : 'Experience added!', 'success');
}

function editExperience(id) { var data = getPortfolioData(); var entry = data.experience.find(function(e) { return e.id === id; }); if (entry) showExperienceModal(entry); }

function deleteExperience(id) {
  if (!confirm('Delete this experience?')) return;
  var data = getPortfolioData();
  data.experience = data.experience.filter(function(e) { return e.id !== id; });
  savePortfolioData(data);
  loadExperiencePanel(data.experience);
  markDraftChanged();
  showToast('Experience deleted', 'success');
}

// ---- Education Panel ----
function loadEducationPanel(education) {
  var container = document.getElementById('education-list');
  if (!education || !education.length) { container.innerHTML = '<div class="empty-state">No education entries.</div>'; return; }
  container.innerHTML = education.map(function(e) {
    return '<div class="item-card"><div class="item-info"><h4>' + e.degree + '</h4><p>' + e.institution + ' · ' + e.period + '</p></div><div class="item-actions"><button class="btn btn-ghost btn-sm" onclick="editEducation(\'' + e.id + '\')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteEducation(\'' + e.id + '\')">Delete</button></div></div>';
  }).join('');
}

function showEducationModal(edu) {
  var isEdit = !!edu;
  var modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = isEdit ? 'Edit Education' : 'Add Education';
  document.getElementById('modal-body').innerHTML =
    '<form id="edu-modal-form"><input type="hidden" id="edm-id" value="' + (isEdit ? edu.id : '') + '" />' +
    '<div class="form-row"><div class="form-group"><label>Institution</label><input type="text" class="form-input" id="edm-institution" value="' + (isEdit ? edu.institution : '') + '" required /></div>' +
    '<div class="form-group"><label>Degree / Certificate</label><input type="text" class="form-input" id="edm-degree" value="' + (isEdit ? edu.degree : '') + '" required /></div></div>' +
    '<div class="form-group"><label>Period</label><input type="text" class="form-input" id="edm-period" value="' + (isEdit ? edu.period : '') + '" /></div>' +
    '<div class="form-group"><label>Description</label><textarea class="form-textarea" id="edm-desc">' + (isEdit ? edu.description : '') + '</textarea></div></form>';
  document.getElementById('modal-save').onclick = saveEducationModal;
  modal.classList.remove('hidden');
}

function saveEducationModal() {
  var id = document.getElementById('edm-id').value;
  var data = getPortfolioData();
  var entry = { id: id || generateId(), institution: document.getElementById('edm-institution').value, degree: document.getElementById('edm-degree').value, period: document.getElementById('edm-period').value, description: document.getElementById('edm-desc').value };
  if (!entry.institution || !entry.degree) { showToast('Institution and degree are required', 'error'); return; }
  if (id) { var idx = data.education.findIndex(function(e) { return e.id === id; }); if (idx !== -1) data.education[idx] = entry; }
  else { data.education.push(entry); }
  savePortfolioData(data);
  loadEducationPanel(data.education);
  closeModal();
  markDraftChanged();
  showToast(id ? 'Education updated!' : 'Education added!', 'success');
}

function editEducation(id) { var data = getPortfolioData(); var entry = data.education.find(function(e) { return e.id === id; }); if (entry) showEducationModal(entry); }

function deleteEducation(id) {
  if (!confirm('Delete this education entry?')) return;
  var data = getPortfolioData();
  data.education = data.education.filter(function(e) { return e.id !== id; });
  savePortfolioData(data);
  loadEducationPanel(data.education);
  markDraftChanged();
  showToast('Education deleted', 'success');
}

// ---- Contact ----
function loadContactPanel(contact) {
  if (!contact) return;
  document.getElementById('contact-email').value = contact.email || '';
  document.getElementById('contact-location').value = contact.location || '';
  document.getElementById('contact-availability').value = contact.availability || '';
}

function saveContact(e) {
  e.preventDefault();
  var data = getPortfolioData();
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
  var current = document.getElementById('pw-current').value;
  var newPw = document.getElementById('pw-new').value;
  var confirmPw = document.getElementById('pw-confirm').value;
  if (current !== getAdminPassword()) { showToast('Current password is incorrect', 'error'); return; }
  if (newPw.length < 4) { showToast('New password must be at least 4 characters', 'error'); return; }
  if (newPw !== confirmPw) { showToast('New passwords do not match', 'error'); return; }
  localStorage.setItem(PASSWORD_KEY, newPw);
  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  showToast('Password changed successfully!', 'success');
}

// ---- Discord Webhook ----
var DISCORD_WEBHOOK_KEY = 'portfolio_discord_webhook';

async function saveDiscordWebhook(e) {
  e.preventDefault();
  var url = document.getElementById('discord-webhook-url').value.trim();
  if (url && !url.startsWith('https://discord.com/api/webhooks/')) {
    showToast('Invalid Discord webhook URL', 'error');
    return;
  }

  var config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    showToast('Configure Supabase first', 'error');
    return;
  }

  try {
    // Upsert: try update first, if not found then insert
    var res = await fetch(config.url + '/rest/v1/site_settings?key=eq.discord_webhook', {
      method: 'PATCH',
      headers: {
        'apikey': config.anonKey,
        'Authorization': 'Bearer ' + config.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ value: url })
    });

    var rows = await res.json();
    if (!rows || rows.length === 0) {
      // Row doesn't exist yet, insert it
      await fetch(config.url + '/rest/v1/site_settings', {
        method: 'POST',
        headers: {
          'apikey': config.anonKey,
          'Authorization': 'Bearer ' + config.anonKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ key: 'discord_webhook', value: url })
      });
    }

    showToast(url ? 'Discord webhook saved!' : 'Discord webhook removed', 'success');
  } catch (err) {
    showToast('Failed to save: ' + err.message, 'error');
  }
}

async function loadDiscordWebhook() {
  var config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return;

  try {
    var res = await fetch(config.url + '/rest/v1/site_settings?key=eq.discord_webhook&select=value', {
      headers: {
        'apikey': config.anonKey,
        'Authorization': 'Bearer ' + config.anonKey
      }
    });
    var rows = await res.json();
    if (rows && rows.length > 0 && rows[0].value) {
      document.getElementById('discord-webhook-url').value = rows[0].value;
    }
  } catch (e) {}
}

async function testDiscordWebhook() {
  var url = document.getElementById('discord-webhook-url').value.trim();
  if (!url) { showToast('Enter a webhook URL first', 'error'); return; }

  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🧪 Test Notification',
          description: 'Your Discord webhook is working! Contact form notifications will appear here.',
          color: 3447003,
          timestamp: new Date().toISOString(),
          footer: { text: 'Portfolio Contact Form' }
        }]
      })
    });
    if (res.ok || res.status === 204) {
      showToast('Test message sent to Discord!', 'success');
    } else {
      showToast('Failed: ' + res.status + ' ' + res.statusText, 'error');
    }
  } catch (err) {
    showToast('Failed to send: ' + err.message, 'error');
  }
}

// ---- Modal ----
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

// ---- Toast ----
function showToast(message, type) {
  type = type || 'success';
  var container = document.getElementById('toast-container');
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

// ---- Messages ----
function initMessages() {
  var refreshBtn = document.getElementById('btn-refresh-msgs');
  if (refreshBtn) refreshBtn.addEventListener('click', loadMessages);
  loadMessages();
}

async function loadMessages() {
  var config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    document.getElementById('messages-list').innerHTML = '<div class="empty-state">Configure Supabase in Settings first.</div>';
    return;
  }

  try {
    var res = await fetch(config.url + '/rest/v1/contact_messages?order=created_at.desc', {
      headers: {
        'apikey': config.anonKey,
        'Authorization': 'Bearer ' + config.anonKey
      }
    });
    if (!res.ok) throw new Error('Failed to fetch');
    var messages = await res.json();
    renderMessages(messages);
    updateBadge(messages);
    var setupBox = document.getElementById('messages-setup');
    if (setupBox) setupBox.style.display = 'none';
  } catch (err) {
    document.getElementById('messages-list').innerHTML = '<div class="empty-state">Failed to load messages. Make sure the contact_messages table exists.</div>';
    var setupBox = document.getElementById('messages-setup');
    if (setupBox) setupBox.style.display = '';
  }
}

function renderMessages(messages) {
  var container = document.getElementById('messages-list');
  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="empty-state">📭 No messages yet</div>';
    return;
  }

  container.innerHTML = messages.map(function(m) {
    var date = new Date(m.created_at);
    var timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return '<div class="msg-card ' + (m.is_read ? '' : 'unread') + '" data-id="' + m.id + '">' +
      '<div class="msg-card-header">' +
        '<div>' +
          '<div class="msg-sender">' + escapeHtml(m.name) + '</div>' +
          '<div class="msg-email">' + escapeHtml(m.email) + '</div>' +
        '</div>' +
        '<span class="msg-time">' + timeStr + '</span>' +
      '</div>' +
      '<div class="msg-body">' + escapeHtml(m.message) + '</div>' +
      '<div class="msg-actions">' +
        (!m.is_read ? '<button class="btn btn-ghost btn-sm" onclick="markMessageRead(' + m.id + ')">✓ Mark Read</button>' : '') +
        '<button class="btn btn-danger btn-sm" onclick="deleteMessage(' + m.id + ')">🗑 Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function updateBadge(messages) {
  var badge = document.getElementById('msg-badge');
  if (!badge) return;
  var unread = messages.filter(function(m) { return !m.is_read; }).length;
  if (unread > 0) {
    badge.textContent = unread;
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }
}

async function markMessageRead(id) {
  var config = getSupabaseConfig();
  try {
    await fetch(config.url + '/rest/v1/contact_messages?id=eq.' + id, {
      method: 'PATCH',
      headers: {
        'apikey': config.anonKey,
        'Authorization': 'Bearer ' + config.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ is_read: true })
    });
    loadMessages();
  } catch (err) {
    showToast('Failed to update', 'error');
  }
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  var config = getSupabaseConfig();
  try {
    await fetch(config.url + '/rest/v1/contact_messages?id=eq.' + id, {
      method: 'DELETE',
      headers: {
        'apikey': config.anonKey,
        'Authorization': 'Bearer ' + config.anonKey
      }
    });
    showToast('Message deleted', 'success');
    loadMessages();
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
}

// ============================================
// CV MAKER
// ============================================

function initCVMaker() {
  document.getElementById('cv-template').addEventListener('change', renderCVPreview);
  document.getElementById('cv-accent-color').addEventListener('input', renderCVPreview);
  document.getElementById('cv-toggle-skills').addEventListener('change', renderCVPreview);
  document.getElementById('cv-toggle-projects').addEventListener('change', renderCVPreview);
  document.getElementById('cv-toggle-photo').addEventListener('change', renderCVPreview);
  document.getElementById('btn-download-cv').addEventListener('click', downloadCV);

  // Initial render
  renderCVPreview();
}

function getCVOptions() {
  return {
    template: document.getElementById('cv-template').value,
    accent: document.getElementById('cv-accent-color').value,
    showSkills: document.getElementById('cv-toggle-skills').checked,
    showProjects: document.getElementById('cv-toggle-projects').checked,
    showPhoto: document.getElementById('cv-toggle-photo').checked
  };
}

function renderCVPreview() {
  var data = getPortfolioData() || JSON.parse(JSON.stringify(DEFAULT_DATA));
  var opts = getCVOptions();
  var container = document.getElementById('cv-preview');
  var html = '';

  if (opts.template === 'modern') html = buildModernCV(data, opts);
  else if (opts.template === 'classic') html = buildClassicCV(data, opts);
  else html = buildMinimalCV(data, opts);

  container.innerHTML = html;
}

function cvEsc(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

function darkenColor(hex, amount) {
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return '#' + [r,g,b].map(function(c) { return c.toString(16).padStart(2,'0'); }).join('');
}

function lightenColor(hex, amount) {
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);
  return '#' + [r,g,b].map(function(c) { return c.toString(16).padStart(2,'0'); }).join('');
}

function buildContactItems(contact) {
  var items = [];
  if (contact.email) items.push('✉ ' + cvEsc(contact.email));
  if (contact.location) items.push('📍 ' + cvEsc(contact.location));
  if (contact.availability) items.push('💼 ' + cvEsc(contact.availability));
  return items;
}

// ---- Modern Template ----
function buildModernCV(data, opts) {
  var accent = opts.accent;
  var darkAccent = darkenColor(accent, 40);
  var hero = data.hero || {};
  var about = data.about || {};
  var contact = data.contact || {};
  var experience = data.experience || [];
  var education = data.education || [];
  var projects = data.projects || [];

  // Sidebar
  var sidebar = '<div class="cv-sidebar" style="background: linear-gradient(135deg, ' + darkAccent + ' 0%, ' + accent + ' 100%);">';
  if (opts.showPhoto && about.photo) {
    sidebar += '<img class="cv-photo" src="' + cvEsc(about.photo) + '" alt="Photo" onerror="this.style.display=\'none\'" />';
  }
  sidebar += '<div class="cv-name">' + cvEsc(hero.name) + '</div>';
  sidebar += '<div class="cv-tagline">' + cvEsc(hero.tagline) + '</div>';

  // Contact
  var contactItems = buildContactItems(contact);
  if (contactItems.length) {
    sidebar += '<div class="cv-section-title">Contact</div>';
    sidebar += contactItems.map(function(c) { return '<div class="cv-contact-item">' + c + '</div>'; }).join('');
  }

  // Skills
  if (opts.showSkills && about.chips && about.chips.length) {
    sidebar += '<div class="cv-section-title">Skills</div>';
    sidebar += '<div class="cv-skill-chips">' + about.chips.map(function(s) { return '<span class="cv-skill-chip">' + cvEsc(s) + '</span>'; }).join('') + '</div>';
  }
  sidebar += '</div>';

  // Main
  var main = '<div class="cv-main">';

  // About summary
  if (about.introduction) {
    main += '<div class="cv-section-title" style="border-color:' + accent + ';">Profile</div>';
    main += '<div class="cv-entry-desc">' + cvEsc(about.introduction) + '</div>';
  }

  // Experience
  if (experience.length) {
    main += '<div class="cv-section-title" style="border-color:' + accent + ';">Experience</div>';
    main += experience.map(function(e) {
      return '<div class="cv-entry">' +
        '<div class="cv-entry-header"><span class="cv-entry-title">' + cvEsc(e.role) + '</span><span class="cv-entry-period">' + cvEsc(e.period) + '</span></div>' +
        '<div class="cv-entry-subtitle" style="color:' + accent + ';">' + cvEsc(e.company) + '</div>' +
        '<div class="cv-entry-desc">' + cvEsc(e.description) + '</div>' +
      '</div>';
    }).join('');
  }

  // Education
  if (education.length) {
    main += '<div class="cv-section-title" style="border-color:' + accent + ';">Education</div>';
    main += education.map(function(e) {
      return '<div class="cv-entry">' +
        '<div class="cv-entry-header"><span class="cv-entry-title">' + cvEsc(e.degree) + '</span><span class="cv-entry-period">' + cvEsc(e.period) + '</span></div>' +
        '<div class="cv-entry-subtitle" style="color:' + accent + ';">' + cvEsc(e.institution) + '</div>' +
        '<div class="cv-entry-desc">' + cvEsc(e.description) + '</div>' +
      '</div>';
    }).join('');
  }

  // Projects
  if (opts.showProjects && projects.length) {
    main += '<div class="cv-section-title" style="border-color:' + accent + ';">Projects</div>';
    main += '<div class="cv-project-grid">' + projects.map(function(p) {
      return '<div class="cv-project-card" style="border-left-color:' + accent + ';">' +
        '<h4>' + cvEsc(p.title) + '</h4>' +
        '<p>' + cvEsc(p.description) + '</p>' +
        (p.tags && p.tags.length ? '<div class="cv-project-tags">' + p.tags.map(function(t) { return '<span>' + cvEsc(t) + '</span>'; }).join('') + '</div>' : '') +
      '</div>';
    }).join('') + '</div>';
  }

  main += '</div>';
  return '<div class="cv-modern">' + sidebar + main + '</div>';
}

// ---- Classic Template ----
function buildClassicCV(data, opts) {
  var accent = opts.accent;
  var hero = data.hero || {};
  var about = data.about || {};
  var contact = data.contact || {};
  var experience = data.experience || [];
  var education = data.education || [];
  var projects = data.projects || [];

  var html = '<div class="cv-classic">';

  // Header
  html += '<div class="cv-header" style="border-color:' + accent + ';">';
  if (opts.showPhoto && about.photo) {
    html += '<img class="cv-photo" src="' + cvEsc(about.photo) + '" alt="Photo" onerror="this.style.display=\'none\'" />';
  }
  html += '<div class="cv-name">' + cvEsc(hero.name) + '</div>';
  html += '<div class="cv-tagline">' + cvEsc(hero.tagline) + '</div>';
  var contactItems = buildContactItems(contact);
  if (contactItems.length) {
    html += '<div class="cv-contact-row">' + contactItems.map(function(c) { return '<span>' + c + '</span>'; }).join('') + '</div>';
  }
  html += '</div>';

  // About
  if (about.introduction) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Profile</div>';
    html += '<div class="cv-entry-desc">' + cvEsc(about.introduction) + '</div>';
  }

  // Experience
  if (experience.length) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Experience</div>';
    html += experience.map(function(e) {
      return '<div class="cv-entry">' +
        '<div class="cv-entry-header"><span class="cv-entry-title">' + cvEsc(e.role) + '</span><span class="cv-entry-period">' + cvEsc(e.period) + '</span></div>' +
        '<div class="cv-entry-subtitle">' + cvEsc(e.company) + '</div>' +
        '<div class="cv-entry-desc">' + cvEsc(e.description) + '</div>' +
      '</div>';
    }).join('');
  }

  // Education
  if (education.length) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Education</div>';
    html += education.map(function(e) {
      return '<div class="cv-entry">' +
        '<div class="cv-entry-header"><span class="cv-entry-title">' + cvEsc(e.degree) + '</span><span class="cv-entry-period">' + cvEsc(e.period) + '</span></div>' +
        '<div class="cv-entry-subtitle">' + cvEsc(e.institution) + '</div>' +
        '<div class="cv-entry-desc">' + cvEsc(e.description) + '</div>' +
      '</div>';
    }).join('');
  }

  // Skills
  if (opts.showSkills && about.chips && about.chips.length) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Skills</div>';
    html += '<div class="cv-skill-chips">' + about.chips.map(function(s) { return '<span class="cv-skill-chip">' + cvEsc(s) + '</span>'; }).join('') + '</div>';
  }

  // Projects
  if (opts.showProjects && projects.length) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Projects</div>';
    html += '<div class="cv-project-grid">' + projects.map(function(p) {
      return '<div class="cv-project-card">' +
        '<h4>' + cvEsc(p.title) + '</h4>' +
        '<p>' + cvEsc(p.description) + '</p>' +
      '</div>';
    }).join('') + '</div>';
  }

  html += '</div>';
  return html;
}

// ---- Minimal Template ----
function buildMinimalCV(data, opts) {
  var accent = opts.accent;
  var lightAccent = lightenColor(accent, 180);
  var hero = data.hero || {};
  var about = data.about || {};
  var contact = data.contact || {};
  var experience = data.experience || [];
  var education = data.education || [];
  var projects = data.projects || [];

  var html = '<div class="cv-minimal">';

  // Header
  html += '<div class="cv-header">';
  if (opts.showPhoto && about.photo) {
    html += '<img class="cv-photo" src="' + cvEsc(about.photo) + '" alt="Photo" onerror="this.style.display=\'none\'" />';
  }
  html += '<div class="cv-header-text">';
  html += '<div class="cv-name">' + cvEsc(hero.name) + '</div>';
  html += '<div class="cv-tagline">' + cvEsc(hero.tagline) + '</div>';
  var contactItems = buildContactItems(contact);
  if (contactItems.length) {
    html += '<div class="cv-contact-bar">' + contactItems.map(function(c) { return '<span>' + c + '</span>'; }).join('') + '</div>';
  }
  html += '</div></div>';

  // About
  if (about.introduction) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Profile</div>';
    html += '<div style="font-size:9pt;color:#555;line-height:1.6;margin-bottom:8px;">' + cvEsc(about.introduction) + '</div>';
  }

  // Experience
  if (experience.length) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Experience</div>';
    html += experience.map(function(e) {
      return '<div class="cv-entry">' +
        '<div class="cv-entry-period">' + cvEsc(e.period) + '</div>' +
        '<div><div class="cv-entry-title">' + cvEsc(e.role) + '</div>' +
        '<div class="cv-entry-subtitle">' + cvEsc(e.company) + '</div>' +
        '<div class="cv-entry-desc">' + cvEsc(e.description) + '</div></div>' +
      '</div>';
    }).join('');
  }

  // Education
  if (education.length) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Education</div>';
    html += education.map(function(e) {
      return '<div class="cv-entry">' +
        '<div class="cv-entry-period">' + cvEsc(e.period) + '</div>' +
        '<div><div class="cv-entry-title">' + cvEsc(e.degree) + '</div>' +
        '<div class="cv-entry-subtitle">' + cvEsc(e.institution) + '</div>' +
        '<div class="cv-entry-desc">' + cvEsc(e.description) + '</div></div>' +
      '</div>';
    }).join('');
  }

  // Skills
  if (opts.showSkills && about.chips && about.chips.length) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Skills</div>';
    html += '<div class="cv-skill-chips">' + about.chips.map(function(s) {
      return '<span class="cv-skill-chip" style="background:' + lightAccent + ';color:' + darkenColor(accent, 20) + ';">' + cvEsc(s) + '</span>';
    }).join('') + '</div>';
  }

  // Projects
  if (opts.showProjects && projects.length) {
    html += '<div class="cv-section-title" style="color:' + accent + ';">Projects</div>';
    html += '<div class="cv-project-grid">' + projects.map(function(p) {
      return '<div class="cv-project-card">' +
        '<span class="cv-proj-label"></span>' +
        '<div><h4>' + cvEsc(p.title) + '</h4></div>' +
        '<p>' + cvEsc(p.description) + '</p>' +
      '</div>';
    }).join('') + '</div>';
  }

  html += '</div>';
  return html;
}

// ---- Download CV as PDF ----
function downloadCV() {
  var preview = document.getElementById('cv-preview');
  var opts = getCVOptions();
  var data = getPortfolioData() || JSON.parse(JSON.stringify(DEFAULT_DATA));
  var name = (data.hero && data.hero.name) || 'CV';

  var printWin = window.open('', '_blank');
  if (!printWin) {
    showToast('Pop-up blocked! Please allow pop-ups for this site.', 'error');
    return;
  }

  // Inline ALL CV styles so the print window is self-contained
  var printStyles = '<style>' +
    '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap");' +
    '*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }' +
    'body { margin:0; padding:0; background:#fff; }' +
    '.cv-preview { width:210mm; min-height:297mm; margin:0 auto; box-shadow:none; border-radius:0; overflow:hidden; font-family:"Inter",-apple-system,BlinkMacSystemFont,sans-serif; font-size:10pt; line-height:1.5; color:#1a1a2e; background:#fff; }' +

    // Modern
    '.cv-modern { display:grid; grid-template-columns:220px 1fr; min-height:297mm; }' +
    '.cv-modern .cv-sidebar { padding:32px 24px; color:#fff; }' +
    '.cv-modern .cv-sidebar .cv-photo { width:120px; height:120px; border-radius:50%; object-fit:cover; border:3px solid rgba(255,255,255,0.3); margin:0 auto 20px; display:block; }' +
    '.cv-modern .cv-sidebar .cv-name { font-size:16pt; font-weight:800; margin-bottom:4px; line-height:1.2; text-align:center; }' +
    '.cv-modern .cv-sidebar .cv-tagline { font-size:8pt; opacity:0.85; text-align:center; margin-bottom:28px; font-weight:400; }' +
    '.cv-modern .cv-sidebar .cv-section-title { font-size:8pt; text-transform:uppercase; letter-spacing:1.5px; font-weight:700; opacity:0.7; margin-bottom:10px; margin-top:24px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:6px; }' +
    '.cv-modern .cv-sidebar .cv-contact-item { font-size:8.5pt; margin-bottom:6px; opacity:0.9; word-break:break-all; }' +
    '.cv-modern .cv-sidebar .cv-skill-chips { display:flex; flex-wrap:wrap; gap:5px; }' +
    '.cv-modern .cv-sidebar .cv-skill-chip { padding:3px 10px; background:rgba(255,255,255,0.15); border-radius:100px; font-size:7.5pt; font-weight:500; }' +
    '.cv-modern .cv-main { padding:32px 32px 32px 28px; }' +
    '.cv-modern .cv-main .cv-section-title { font-size:11pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:14px; margin-top:28px; padding-bottom:6px; border-bottom:2px solid; }' +
    '.cv-modern .cv-main .cv-section-title:first-child { margin-top:0; }' +
    '.cv-modern .cv-entry { margin-bottom:16px; }' +
    '.cv-modern .cv-entry-header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2px; }' +
    '.cv-modern .cv-entry-title { font-size:10.5pt; font-weight:700; }' +
    '.cv-modern .cv-entry-period { font-size:8pt; color:#888; white-space:nowrap; }' +
    '.cv-modern .cv-entry-subtitle { font-size:9pt; font-weight:500; margin-bottom:4px; }' +
    '.cv-modern .cv-entry-desc { font-size:9pt; color:#555; line-height:1.5; }' +
    '.cv-modern .cv-project-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }' +
    '.cv-modern .cv-project-card { padding:10px 12px; border:1px solid #e0e0e0; border-radius:6px; border-left:3px solid; }' +
    '.cv-modern .cv-project-card h4 { font-size:9pt; font-weight:700; margin-bottom:3px; }' +
    '.cv-modern .cv-project-card p { font-size:8pt; color:#666; line-height:1.4; }' +
    '.cv-modern .cv-project-tags { margin-top:4px; display:flex; gap:4px; flex-wrap:wrap; }' +
    '.cv-modern .cv-project-tags span { font-size:7pt; padding:1px 6px; background:#f0f0f0; border-radius:3px; color:#666; }' +

    // Classic
    '.cv-classic { padding:40px 48px; }' +
    '.cv-classic .cv-header { text-align:center; margin-bottom:8px; padding-bottom:16px; border-bottom:2px solid; }' +
    '.cv-classic .cv-header .cv-photo { width:90px; height:90px; border-radius:50%; object-fit:cover; margin:0 auto 12px; display:block; border:2px solid #ddd; }' +
    '.cv-classic .cv-header .cv-name { font-size:22pt; font-weight:800; letter-spacing:-0.5px; margin-bottom:2px; }' +
    '.cv-classic .cv-header .cv-tagline { font-size:10pt; color:#666; margin-bottom:10px; }' +
    '.cv-classic .cv-header .cv-contact-row { display:flex; justify-content:center; gap:16px; flex-wrap:wrap; font-size:8.5pt; color:#555; }' +
    '.cv-classic .cv-section-title { font-size:11pt; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-top:24px; margin-bottom:12px; padding-bottom:4px; border-bottom:1px solid #ccc; }' +
    '.cv-classic .cv-entry { margin-bottom:14px; }' +
    '.cv-classic .cv-entry-header { display:flex; justify-content:space-between; align-items:baseline; }' +
    '.cv-classic .cv-entry-title { font-size:10.5pt; font-weight:700; }' +
    '.cv-classic .cv-entry-period { font-size:8pt; color:#888; }' +
    '.cv-classic .cv-entry-subtitle { font-size:9pt; color:#555; font-style:italic; margin-bottom:3px; }' +
    '.cv-classic .cv-entry-desc { font-size:9pt; color:#444; line-height:1.55; }' +
    '.cv-classic .cv-skill-chips { display:flex; flex-wrap:wrap; gap:6px; }' +
    '.cv-classic .cv-skill-chip { padding:3px 12px; border:1px solid #ddd; border-radius:100px; font-size:8pt; font-weight:500; color:#444; }' +
    '.cv-classic .cv-project-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }' +
    '.cv-classic .cv-project-card { padding:8px 12px; border:1px solid #e0e0e0; border-radius:4px; }' +
    '.cv-classic .cv-project-card h4 { font-size:9pt; font-weight:700; margin-bottom:2px; }' +
    '.cv-classic .cv-project-card p { font-size:8pt; color:#666; line-height:1.4; }' +

    // Minimal
    '.cv-minimal { padding:48px 52px; }' +
    '.cv-minimal .cv-header { display:flex; align-items:center; gap:24px; margin-bottom:32px; }' +
    '.cv-minimal .cv-header .cv-photo { width:72px; height:72px; border-radius:50%; object-fit:cover; flex-shrink:0; }' +
    '.cv-minimal .cv-header-text .cv-name { font-size:20pt; font-weight:800; letter-spacing:-0.5px; line-height:1.1; }' +
    '.cv-minimal .cv-header-text .cv-tagline { font-size:9.5pt; color:#777; margin-top:2px; }' +
    '.cv-minimal .cv-contact-bar { display:flex; gap:16px; flex-wrap:wrap; font-size:8pt; color:#888; margin-top:6px; }' +
    '.cv-minimal .cv-section-title { font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#999; margin-top:28px; margin-bottom:12px; }' +
    '.cv-minimal .cv-entry { display:grid; grid-template-columns:120px 1fr; gap:8px 20px; margin-bottom:14px; padding-bottom:14px; border-bottom:1px solid #f0f0f0; }' +
    '.cv-minimal .cv-entry:last-child { border-bottom:none; }' +
    '.cv-minimal .cv-entry-period { font-size:8pt; color:#999; padding-top:1px; }' +
    '.cv-minimal .cv-entry-title { font-size:10pt; font-weight:700; }' +
    '.cv-minimal .cv-entry-subtitle { font-size:9pt; color:#666; margin-bottom:3px; }' +
    '.cv-minimal .cv-entry-desc { font-size:8.5pt; color:#666; line-height:1.55; }' +
    '.cv-minimal .cv-skill-chips { display:flex; flex-wrap:wrap; gap:6px; }' +
    '.cv-minimal .cv-skill-chip { padding:4px 14px; border-radius:100px; font-size:8pt; font-weight:500; }' +
    '.cv-minimal .cv-project-grid { display:grid; grid-template-columns:120px 1fr; gap:8px 20px; }' +
    '.cv-minimal .cv-project-card { grid-column:1/-1; display:grid; grid-template-columns:120px 1fr; gap:8px 20px; padding-bottom:10px; border-bottom:1px solid #f0f0f0; }' +
    '.cv-minimal .cv-project-card .cv-proj-label { font-size:8pt; color:#999; }' +
    '.cv-minimal .cv-project-card h4 { font-size:9pt; font-weight:700; }' +
    '.cv-minimal .cv-project-card p { font-size:8pt; color:#666; grid-column:2; }' +

    // Print
    '@media print { @page { size:A4; margin:0; } body { margin:0; } .cv-preview { width:100%; min-height:100vh; } }' +
    '</style>';

  printWin.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CV — ' + cvEsc(name) + '</title>' + printStyles + '</head><body>');
  printWin.document.write('<div class="cv-preview">' + preview.innerHTML + '</div>');
  printWin.document.write('</body></html>');
  printWin.document.close();

  // Wait for fonts + images to load, then print
  printWin.onload = function() {
    setTimeout(function() {
      printWin.print();
    }, 600);
  };

  showToast('PDF window opened! Use "Save as PDF" in the print dialog.', 'success');
}
