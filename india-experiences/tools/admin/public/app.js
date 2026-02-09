// Indiaesque Admin - Frontend Application

const API_BASE = '/api';

// Utility functions
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

function getStatusBadge(status) {
  const labels = {
    'not-started': 'Not Started',
    'researching': 'Researching',
    'in-progress': 'In Progress',
    'generated': 'Generated',
    'validated': 'Validated',
    'published': 'Published',
    'error': 'Error'
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

function getTierBadge(tier) {
  return `<span class="tier tier-${tier}">${tier}</span>`;
}

// Dashboard page
async function loadDashboard() {
  try {
    const data = await fetchJSON(`${API_BASE}/status`);

    // Update stats
    document.getElementById('stat-cities').textContent = data.summary.totalCities;
    document.getElementById('stat-started').textContent = data.summary.citiesStarted;
    document.getElementById('stat-pages').textContent = data.summary.totalPages;
    document.getElementById('stat-generated').textContent = data.summary.totalGenerated;

    // Render cities table
    const tbody = document.getElementById('cities-table');
    if (data.cities.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No cities found</td></tr>`;
      return;
    }

    tbody.innerHTML = data.cities.map(city => `
      <tr>
        <td><strong>${city.name}</strong></td>
        <td>${getTierBadge(city.tier)}</td>
        <td>${getStatusBadge(city.status)}</td>
        <td>${city.contentBankPages || 0}</td>
        <td>${city.generatedPages || 0}</td>
        <td>${city.validatedPages || 0}</td>
        <td class="actions">
          <a href="/city?city=${city.slug}" class="btn btn-sm btn-primary">Manage</a>
        </td>
      </tr>
    `).join('');

    // Render categories table
    const catTbody = document.getElementById('categories-table');
    if (data.categories.length === 0) {
      catTbody.innerHTML = `<tr><td colspan="3" class="empty-state">No categories found</td></tr>`;
      return;
    }

    catTbody.innerHTML = data.categories.map(cat => `
      <tr>
        <td>${cat.name}</td>
        <td><code>${cat.slug}</code></td>
        <td><code>${cat.crossCitySlug}</code></td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Failed to load dashboard:', err);
    document.getElementById('cities-table').innerHTML = `
      <tr><td colspan="7" class="empty-state" style="color: var(--error)">
        Error: ${err.message}
      </td></tr>
    `;
  }
}

// City page state
let currentCity = null;
let contentBank = null;
let currentTab = 'content-bank';

// City page initialization
async function loadCityPage() {
  const params = new URLSearchParams(window.location.search);
  currentCity = params.get('city');

  if (!currentCity) {
    window.location.href = '/';
    return;
  }

  // Update header
  document.getElementById('city-name').textContent = currentCity.charAt(0).toUpperCase() + currentCity.slice(1);

  // Setup tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Load data
  await loadContentBank();
  await loadFiles();
}

function switchTab(tabName) {
  currentTab = tabName;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

async function loadContentBank() {
  try {
    contentBank = await fetchJSON(`${API_BASE}/content-bank/${currentCity}`);
    renderContentBank();
    renderGenerationTab();
  } catch (err) {
    if (err.message.includes('not found')) {
      contentBank = null;
      renderEmptyContentBank();
      renderGenerationTab();
    } else {
      console.error('Failed to load content bank:', err);
    }
  }
}

function renderGenerationTab() {
  const container = document.getElementById('generate-pages');

  if (!contentBank || !contentBank.pages || contentBank.pages.length === 0) {
    container.innerHTML = '<p>No pages in content bank. Add pages first.</p>';
    return;
  }

  // Group pages by type for better organization
  const hubPages = contentBank.pages.filter(p => p.type === 'hub');
  const categoryPages = contentBank.pages.filter(p => p.type === 'category');
  const paaPages = contentBank.pages.filter(p => p.type === 'paa');

  const renderPageCheckboxes = (pages, label) => {
    if (pages.length === 0) return '';
    return `
      <div style="margin-bottom: 1rem;">
        <h4 style="margin-bottom: 0.5rem;">${label}</h4>
        ${pages.map(page => `
          <label style="display: block; margin-bottom: 0.25rem; cursor: pointer;">
            <input type="checkbox" value="${page.id}" ${page.status === 'not-started' ? 'checked' : ''}>
            ${escapeHtml(page.title)}
            ${getStatusBadge(page.status)}
          </label>
        `).join('')}
      </div>
    `;
  };

  container.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <button class="btn btn-sm btn-secondary" onclick="selectAllPages()">Select All Not Started</button>
      <button class="btn btn-sm btn-secondary" onclick="deselectAllPages()">Deselect All</button>
    </div>
    ${renderPageCheckboxes(hubPages, 'Hub Pages')}
    ${renderPageCheckboxes(categoryPages, 'Category Pages')}
    ${renderPageCheckboxes(paaPages, 'PAA Pages')}
  `;
}

function selectAllPages() {
  document.querySelectorAll('#generate-pages input[type="checkbox"]').forEach(cb => {
    const page = contentBank.pages.find(p => p.id === cb.value);
    if (page && page.status === 'not-started') {
      cb.checked = true;
    }
  });
}

function deselectAllPages() {
  document.querySelectorAll('#generate-pages input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
}

function renderEmptyContentBank() {
  document.getElementById('content-bank-pages').innerHTML = `
    <div class="empty-state">
      <h3>No Content Bank</h3>
      <p>Create a content bank to start planning pages for this city.</p>
      <button class="btn btn-primary" onclick="initContentBank()">Create Content Bank</button>
    </div>
  `;
}

async function initContentBank() {
  try {
    await fetchJSON(`${API_BASE}/content-bank/${currentCity}/page`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'hub',
        category: 'general',
        title: `Things To Do In ${currentCity.charAt(0).toUpperCase() + currentCity.slice(1)} - 2026 Guide`,
        slug: '_index',
        contentDirection: 'Comprehensive hub linking to all categories below'
      })
    });
    await loadContentBank();
  } catch (err) {
    alert('Failed to create content bank: ' + err.message);
  }
}

function renderContentBank() {
  if (!contentBank || !contentBank.pages) {
    renderEmptyContentBank();
    return;
  }

  const container = document.getElementById('content-bank-pages');

  // Filters
  const filters = `
    <div class="filters">
      <select id="filter-type" onchange="filterPages()">
        <option value="">All Types</option>
        <option value="hub">Hub</option>
        <option value="category">Category</option>
        <option value="paa">PAA</option>
      </select>
      <select id="filter-category" onchange="filterPages()">
        <option value="">All Categories</option>
        ${[...new Set(contentBank.pages.map(p => p.category))].map(c =>
          `<option value="${c}">${c}</option>`
        ).join('')}
      </select>
      <select id="filter-status" onchange="filterPages()">
        <option value="">All Statuses</option>
        <option value="not-started">Not Started</option>
        <option value="generated">Generated</option>
        <option value="validated">Validated</option>
      </select>
      <button class="btn btn-primary" onclick="showAddPageModal()">Add Page</button>
    </div>
  `;

  // Table
  const table = `
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Type</th>
          <th>Category</th>
          <th>Status</th>
          <th>Words</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="pages-tbody">
        ${renderPagesRows(contentBank.pages)}
      </tbody>
    </table>
  `;

  container.innerHTML = filters + table;
}

function renderPagesRows(pages) {
  if (pages.length === 0) {
    return `<tr><td colspan="6" class="empty-state">No pages</td></tr>`;
  }

  return pages.map(page => `
    <tr data-page-id="${page.id}" data-type="${page.type}" data-category="${page.category}" data-status="${page.status}">
      <td>
        <strong>${escapeHtml(page.title)}</strong><br>
        <small style="color: var(--text-muted)">${page.slug || '-'}</small>
      </td>
      <td>${page.type}</td>
      <td>${page.category}</td>
      <td>${getStatusBadge(page.status)}</td>
      <td>${page.wordCount || '-'}</td>
      <td class="actions">
        <button class="btn btn-sm btn-secondary" onclick="editPage('${page.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deletePage('${page.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function filterPages() {
  const typeFilter = document.getElementById('filter-type').value;
  const categoryFilter = document.getElementById('filter-category').value;
  const statusFilter = document.getElementById('filter-status').value;

  document.querySelectorAll('#pages-tbody tr').forEach(row => {
    const matchType = !typeFilter || row.dataset.type === typeFilter;
    const matchCategory = !categoryFilter || row.dataset.category === categoryFilter;
    const matchStatus = !statusFilter || row.dataset.status === statusFilter;

    row.style.display = (matchType && matchCategory && matchStatus) ? '' : 'none';
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function editPage(pageId) {
  const page = contentBank.pages.find(p => p.id === pageId);
  if (!page) return;

  const newTitle = prompt('Title:', page.title);
  if (newTitle === null) return;

  const newSlug = prompt('Slug:', page.slug);
  if (newSlug === null) return;

  const newDirection = prompt('Content Direction:', page.contentDirection);
  if (newDirection === null) return;

  try {
    await fetchJSON(`${API_BASE}/content-bank/${currentCity}/page/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: newTitle,
        slug: newSlug,
        contentDirection: newDirection
      })
    });
    await loadContentBank();
  } catch (err) {
    alert('Failed to update page: ' + err.message);
  }
}

async function deletePage(pageId) {
  if (!confirm('Delete this page?')) return;

  try {
    await fetchJSON(`${API_BASE}/content-bank/${currentCity}/page/${pageId}`, {
      method: 'DELETE'
    });
    await loadContentBank();
  } catch (err) {
    alert('Failed to delete page: ' + err.message);
  }
}

function showAddPageModal() {
  const type = prompt('Type (hub/category/paa):', 'paa');
  if (!type) return;

  const category = prompt('Category:', 'general');
  if (category === null) return;

  const title = prompt('Title:');
  if (!title) return;

  const slug = prompt('Slug:');
  if (slug === null) return;

  addPage({ type, category, title, slug });
}

async function addPage(data) {
  try {
    await fetchJSON(`${API_BASE}/content-bank/${currentCity}/page`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await loadContentBank();
  } catch (err) {
    alert('Failed to add page: ' + err.message);
  }
}

// Files tab
async function loadFiles() {
  try {
    const files = await fetchJSON(`${API_BASE}/files/${currentCity}`);
    renderFiles(files);
  } catch (err) {
    console.error('Failed to load files:', err);
    document.getElementById('files-list').innerHTML = `
      <div class="empty-state">No files found</div>
    `;
  }
}

function renderFiles(files) {
  const container = document.getElementById('files-list');

  if (files.length === 0) {
    container.innerHTML = `<div class="empty-state">No content files yet</div>`;
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Type</th>
          <th>Status</th>
          <th>Words</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${files.map(file => `
          <tr>
            <td>
              <strong>${escapeHtml(file.title || file.slug)}</strong><br>
              <small style="color: var(--text-muted)">${file.slug}.md</small>
            </td>
            <td>${file.type || '-'}</td>
            <td>${getStatusBadge(file.status || 'generated')}</td>
            <td>${file.wordCount || '-'}</td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary" onclick="viewFile('${file.slug}')">View</button>
              <button class="btn btn-sm btn-danger" onclick="deleteFile('${file.slug}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function viewFile(slug) {
  try {
    const file = await fetchJSON(`${API_BASE}/files/${currentCity}/${slug}`);
    alert(`Title: ${file.frontmatter.title}\n\nContent (first 500 chars):\n${file.content.substring(0, 500)}...`);
  } catch (err) {
    alert('Failed to load file: ' + err.message);
  }
}

async function deleteFile(slug) {
  if (!confirm(`Delete ${slug}.md?`)) return;

  try {
    await fetchJSON(`${API_BASE}/files/${currentCity}/${slug}`, {
      method: 'DELETE'
    });
    await loadFiles();
  } catch (err) {
    alert('Failed to delete file: ' + err.message);
  }
}

// Research tab
async function runResearch() {
  const logOutput = document.getElementById('research-log');
  const btn = document.getElementById('btn-research');

  btn.disabled = true;
  logOutput.innerHTML = '';

  try {
    const response = await fetch(`${API_BASE}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: currentCity })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.done) {
            logOutput.innerHTML += '\n<span class="success">Research complete!</span>\n';
            await loadContentBank();
          } else if (data.log) {
            const cls = data.type || 'info';
            logOutput.innerHTML += `<span class="${cls}">${escapeHtml(data.log)}</span>\n`;
          }
          logOutput.scrollTop = logOutput.scrollHeight;
        }
      }
    }
  } catch (err) {
    logOutput.innerHTML += `\n<span class="error">Error: ${err.message}</span>\n`;
  } finally {
    btn.disabled = false;
  }
}

// Generate tab
async function runGeneration() {
  const logOutput = document.getElementById('generate-log');
  const btn = document.getElementById('btn-generate');
  const pageIds = Array.from(document.querySelectorAll('#generate-pages input:checked')).map(cb => cb.value);

  if (pageIds.length === 0) {
    alert('Select at least one page to generate');
    return;
  }

  btn.disabled = true;
  logOutput.innerHTML = '';

  try {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: currentCity, pageIds })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.done) {
            logOutput.innerHTML += '\n<span class="success">Generation complete!</span>\n';
            await loadContentBank();
            await loadFiles();
          } else if (data.log) {
            const cls = data.type || 'info';
            logOutput.innerHTML += `<span class="${cls}">${escapeHtml(data.log)}</span>\n`;
          }
          logOutput.scrollTop = logOutput.scrollHeight;
        }
      }
    }
  } catch (err) {
    logOutput.innerHTML += `\n<span class="error">Error: ${err.message}</span>\n`;
  } finally {
    btn.disabled = false;
  }
}

// Validate tab
async function runValidation() {
  const resultsContainer = document.getElementById('validation-results');
  const btn = document.getElementById('btn-validate');

  btn.disabled = true;
  resultsContainer.innerHTML = '<p>Validating...</p>';

  try {
    const results = await fetchJSON(`${API_BASE}/validate`, {
      method: 'POST',
      body: JSON.stringify({ city: currentCity })
    });

    if (results.errors.length === 0) {
      resultsContainer.innerHTML = '<div class="empty-state" style="color: var(--success)">All validations passed!</div>';
    } else {
      resultsContainer.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Error</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${results.errors.map(err => `
              <tr>
                <td>${err.file}</td>
                <td><span class="badge badge-error">${err.type}</span></td>
                <td>${escapeHtml(err.message)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    resultsContainer.innerHTML = `<div class="empty-state" style="color: var(--error)">Error: ${err.message}</div>`;
  } finally {
    btn.disabled = false;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cities-table')) {
    loadDashboard();
  } else if (document.getElementById('city-name')) {
    loadCityPage();
  }
});
