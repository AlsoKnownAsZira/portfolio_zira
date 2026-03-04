// ============================================
// PORTFOLIO — App Logic
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
  var data = null;

  // Try fetching from Supabase if configured
  if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/portfolio_data?id=eq.1&select=content', {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        }
      });
      if (res.ok) {
        var rows = await res.json();
        if (rows.length > 0 && rows[0].content && Object.keys(rows[0].content).length > 0) {
          data = rows[0].content;
        }
      }
    } catch (e) {
      console.warn('Supabase fetch failed:', e.message);
    }
  }

  // Fallback to data.json
  if (!data) {
    try {
      var res2 = await fetch('data.json?t=' + Date.now());
      if (res2.ok) data = await res2.json();
    } catch (e) {}
  }

  if (!data) return;

  renderHero(data.hero);
  renderAbout(data.about);
  renderProjects(data.projects);
  renderExperience(data.experience);
  renderEducation(data.education);
  renderFooter(data.hero, data.contact);
  initNavbar();
  initRevealAnimations();
  initContactForm();

  // Initialize new decorative effects
  initPhotoTilt();
  initCardSpotlight();
});

// ---- SVG Icons ----
var ICONS = {
  github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  'external-link': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  dribbble: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94"/><path d="M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32"/><path d="M8.56 2.75c4.37 6 6 9.42 8 17.72"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>'
};

function getIcon(name) {
  return ICONS[name] || ICONS['globe'];
}

function renderHero(hero) {
  var container = document.getElementById('hero-content');
  if (!container) return;
  var socialsHtml = (hero.socials || []).map(function(s) {
    return '<a href="' + s.url + '" target="_blank" rel="noopener" class="social-link" title="' + s.platform + '">' + getIcon(s.icon) + '</a>';
  }).join('');
  container.innerHTML =
    '<div class="hero-badge"><span class="dot"></span>' + (hero.description || 'Available for work') + '</div>' +
    '<h1 class="hero-name">Hi, I\'m <span class="gradient-text">' + (hero.name || 'Your Name') + '</span></h1>' +
    '<p class="hero-tagline">' + (hero.tagline || 'Developer & Designer') + '</p>' +
    '<div class="hero-actions"><a href="#projects" class="btn btn-primary">View My Work ' + getIcon('arrow') + '</a><a href="#contact" class="btn btn-ghost">Get In Touch</a></div>' +
    '<div class="hero-socials">' + socialsHtml + '</div>';
}

function renderAbout(about) {
  var container = document.getElementById('about-content');
  if (!container) return;
  var chipsHtml = (about.chips || []).map(function(c) { return '<span class="chip">' + c + '</span>'; }).join('');
  container.innerHTML =
    '<div class="about-grid"><div class="about-photo-wrapper"><img src="' + about.photo + '" alt="Profile" class="about-photo" onerror="this.src=\'https://via.placeholder.com/400?text=Photo\'"/></div>' +
    '<div><p class="about-intro">' + about.introduction + '</p><div class="chips-container">' + chipsHtml + '</div></div></div>';
}

function renderProjects(projects) {
  var container = document.getElementById('projects-grid');
  if (!container) return;
  var VISIBLE_COUNT = 4;
  var allProjects = projects || [];

  container.innerHTML = allProjects.map(function(p, index) {
    var tagsHtml = (p.tags || []).map(function(t) { return '<span class="project-tag">' + t + '</span>'; }).join('');
    var overlayHtml = '';
    if (p.liveUrl) overlayHtml += '<a href="' + p.liveUrl + '" target="_blank" class="btn btn-primary">Live Demo ' + getIcon('external-link') + '</a>';
    if (p.repoUrl) overlayHtml += '<a href="' + p.repoUrl + '" target="_blank" class="btn btn-ghost">Source ' + getIcon('code') + '</a>';
    var hiddenClass = index >= VISIBLE_COUNT ? ' project-card-hidden' : '';
    return '<div class="project-card' + hiddenClass + '"><div class="project-image-wrapper"><img src="' + p.image + '" alt="' + p.title + '" class="project-image" onerror="this.src=\'https://via.placeholder.com/600x400?text=Project\'"/><div class="project-overlay">' + overlayHtml + '</div></div><div class="project-body"><h3 class="project-title">' + p.title + '</h3><p class="project-desc">' + p.description + '</p><div class="project-tags">' + tagsHtml + '</div></div></div>';
  }).join('');

  // Add "Show More" button if there are more than VISIBLE_COUNT projects
  if (allProjects.length > VISIBLE_COUNT) {
    var wrapper = container.parentElement;
    var btnContainer = document.createElement('div');
    btnContainer.className = 'projects-toggle-wrapper';
    btnContainer.innerHTML = '<button class="btn btn-ghost projects-toggle-btn" id="projects-toggle">' +
      '<span class="toggle-text">Show More</span>' +
      '<span class="toggle-count">(' + (allProjects.length - VISIBLE_COUNT) + ' more)</span>' +
      '<svg class="toggle-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</button>';
    wrapper.appendChild(btnContainer);

    var expanded = false;
    var toggleBtn = document.getElementById('projects-toggle');
    toggleBtn.addEventListener('click', function() {
      expanded = !expanded;
      var hiddenCards = container.querySelectorAll('.project-card-hidden');
      hiddenCards.forEach(function(card) {
        if (expanded) {
          card.classList.add('project-card-visible');
        } else {
          card.classList.remove('project-card-visible');
        }
      });
      toggleBtn.querySelector('.toggle-text').textContent = expanded ? 'Show Less' : 'Show More';
      toggleBtn.querySelector('.toggle-count').textContent = expanded ? '' : '(' + (allProjects.length - VISIBLE_COUNT) + ' more)';
      toggleBtn.classList.toggle('expanded', expanded);

      // Scroll back to projects section when collapsing
      if (!expanded) {
        document.getElementById('projects').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

function renderExperience(experience) {
  var container = document.getElementById('experience-timeline');
  if (!container) return;
  container.innerHTML = (experience || []).map(function(e) {
    return '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-card"><p class="timeline-period">' + e.period + '</p><h4 class="timeline-role">' + e.role + '</h4><p class="timeline-company">' + e.company + '</p><p class="timeline-desc">' + e.description + '</p></div></div>';
  }).join('');
}

function renderEducation(education) {
  var container = document.getElementById('education-timeline');
  if (!container) return;
  container.innerHTML = (education || []).map(function(e) {
    return '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-card"><p class="timeline-period">' + e.period + '</p><h4 class="timeline-role">' + e.degree + '</h4><p class="timeline-company">' + e.institution + '</p><p class="timeline-desc">' + e.description + '</p></div></div>';
  }).join('');
}

function renderFooter(hero, contact) {
  var footerInfo = document.getElementById('footer-info');
  var footerSocials = document.getElementById('footer-socials');
  if (footerInfo && contact) {
    footerInfo.innerHTML = '<h3>' + (hero.name || 'Portfolio') + '</h3><p>' + (contact.availability || '') + '</p><p>' + (contact.email || '') + '</p><p>' + (contact.location || '') + '</p>';
  }
  if (footerSocials && hero.socials) {
    footerSocials.innerHTML = hero.socials.map(function(s) {
      return '<a href="' + s.url + '" target="_blank" rel="noopener" title="' + s.platform + '">' + s.platform + '</a>';
    }).join('');
  }
  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  var nameEl = document.getElementById('footer-name');
  if (nameEl) nameEl.textContent = hero.name || 'Portfolio';
}

function initNavbar() {
  var navbar = document.querySelector('.navbar');
  var hamburger = document.querySelector('.nav-hamburger');
  var navLinks = document.querySelector('.nav-links');
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  });
  if (hamburger) {
    hamburger.addEventListener('click', function() {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  // Theme toggle
  var saved = localStorage.getItem('portfolio_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('portfolio_theme', next);
    });
  }
}

function initRevealAnimations() {
  var reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  reveals.forEach(function(el) { observer.observe(el); });
}

// ---- Contact Form ----
function initContactForm() {
  var form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = document.getElementById('cf-submit');
    var name = document.getElementById('cf-name').value.trim();
    var email = document.getElementById('cf-email').value.trim();
    var message = document.getElementById('cf-message').value.trim();

    if (!name || !email || !message) return;

    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) throw new Error('Not configured');

      var res = await fetch(SUPABASE_URL + '/rest/v1/contact_messages', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message
        })
      });

      if (!res.ok) throw new Error('Failed to send');

      form.reset();
      pageToast('Message sent! I\'ll get back to you soon.', 'success');

      // Send Discord notification (fire-and-forget)
      sendDiscordNotification(name, email, message);
    } catch (err) {
      pageToast('Failed to send message. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  });
}

function pageToast(msg, type) {
  var container = document.getElementById('page-toast');
  if (!container) return;
  var el = document.createElement('div');
  el.className = 'page-toast ' + (type || 'success');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function() { el.remove(); }, 4000);
}

function sendDiscordNotification(name, email, message) {
  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) return;

  // Fetch webhook URL from Supabase site_settings
  fetch(SUPABASE_URL + '/rest/v1/site_settings?key=eq.discord_webhook&select=value', {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    }
  })
  .then(function(res) { return res.json(); })
  .then(function(rows) {
    if (!rows || !rows.length || !rows[0].value) return;
    var webhookUrl = rows[0].value;

    return fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '📬 New Contact Message',
          color: 3447003,
          fields: [
            { name: '👤 Name', value: name, inline: true },
            { name: '📧 Email', value: email, inline: true },
            { name: '💬 Message', value: message }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Portfolio Contact Form' }
        }]
      })
    });
  })
  .catch(function() {});
}

// ---- Elegant Decorations ----

function initPhotoTilt() {
  var wrapper = document.querySelector('.about-photo-wrapper');
  if (!wrapper) return;
  wrapper.addEventListener('mousemove', function(e) {
    var rect = wrapper.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    var tiltX = (cy - y) / 15;
    var tiltY = (x - cx) / 15;
    wrapper.style.setProperty('--tiltX', tiltX + 'deg');
    wrapper.style.setProperty('--tiltY', tiltY + 'deg');
    wrapper.style.setProperty('--mouseX', x + 'px');
    wrapper.style.setProperty('--mouseY', y + 'px');
  });
  wrapper.addEventListener('mouseleave', function() {
    wrapper.style.setProperty('--tiltX', '0deg');
    wrapper.style.setProperty('--tiltY', '0deg');
    wrapper.style.setProperty('--mouseX', '50%');
    wrapper.style.setProperty('--mouseY', '50%');
    wrapper.classList.remove('active');
  });
  wrapper.addEventListener('mouseenter', function() {
    wrapper.classList.add('active');
  });
}

function initCardSpotlight() {
  var grid = document.getElementById('projects-grid');
  if (!grid) return;
  
  grid.addEventListener('mousemove', function(e) {
    var cards = document.querySelectorAll('.project-card');
    cards.forEach(function(card) {
      if (!card.classList.contains('project-card-hidden') || card.classList.contains('project-card-visible')) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', x + 'px');
        card.style.setProperty('--mouse-y', y + 'px');
      }
    });
  });
}
