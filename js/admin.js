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
    messages: { title: 'Messages', desc: 'View messages from your contact form' }
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
