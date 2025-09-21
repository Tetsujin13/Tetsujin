const dashboardEl = document.getElementById('dashboard');
const detailEl = document.getElementById('detail');
const formEl = document.getElementById('view-form');
const subjectInput = document.getElementById('subject');
const slugInput = document.getElementById('slug');
const descriptionInput = document.getElementById('description');
const stanceInput = document.getElementById('stance');
const handleInput = document.getElementById('handle');
const confidenceInput = document.getElementById('confidence');
const confidenceValue = document.getElementById('confidence-value');
const subjectOptions = document.getElementById('subject-options');
const formMessage = document.getElementById('form-message');

const state = {
  subjects: [],
  selectedSlug: null
};

const stanceColors = ['#ff6f61', '#42f5ad', '#6b9bff', '#f2c94c', '#bb6bd9'];

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }
  return response.json();
}

function renderDashboard() {
  if (!state.subjects.length) {
    dashboardEl.innerHTML = '<p class="empty">No subjects yet. Add one below to ignite the debate.</p>';
    return;
  }

  dashboardEl.innerHTML = '';

  state.subjects.forEach((subject, index) => {
    const tile = document.createElement('article');
    tile.className = 'tile';
    tile.tabIndex = 0;
    tile.setAttribute('role', 'listitem');
    tile.dataset.slug = subject.slug;

    const title = document.createElement('h3');
    title.className = 'tile__title';
    title.textContent = subject.title;
    tile.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'tile__meta';
    meta.innerHTML = `<span>${subject.totalViews} voice${subject.totalViews === 1 ? '' : 's'}</span>`;
    if (subject.consensus) {
      const consensusSpan = document.createElement('span');
      consensusSpan.className = 'tile__consensus';
      consensusSpan.textContent = `${subject.consensus} • ${subject.consensusPercent}%`;
      meta.appendChild(consensusSpan);
    }
    tile.appendChild(meta);

    const stanceWrap = document.createElement('div');
    stanceWrap.className = 'tile__stances';
    subject.stances.forEach((stance, stanceIndex) => {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.style.color = stanceColors[stanceIndex % stanceColors.length];
      badge.innerHTML = `<span class="badge__dot"></span>${stance.stance} (${stance.count})`;
      stanceWrap.appendChild(badge);
    });
    tile.appendChild(stanceWrap);

    tile.addEventListener('click', () => showDetail(subject.slug));
    tile.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showDetail(subject.slug);
      }
    });

    dashboardEl.appendChild(tile);

    if (!state.selectedSlug && index === 0) {
      showDetail(subject.slug);
    }
  });
}

function renderSubjectOptions() {
  subjectOptions.innerHTML = '';
  state.subjects.forEach((subject) => {
    const option = document.createElement('option');
    option.value = subject.title;
    option.dataset.slug = subject.slug;
    option.label = subject.title;
    subjectOptions.appendChild(option);
  });
}

function renderDetail(detail) {
  if (!detail) {
    detailEl.innerHTML = `<div class="detail__placeholder">
        <p>Select a topic tile to see what the pride thinks.</p>
      </div>`;
    return;
  }

  state.selectedSlug = detail.slug;

  const breakdownList = detail.breakdown
    .map(
      (item) => `
        <li>
          <strong>${item.stance}</strong>
          <span>${item.count} voice${item.count === 1 ? '' : 's'}</span>
          <span>${item.avgConfidence || 0}% avg confidence</span>
        </li>
      `
    )
    .join('');

  const recent = detail.recent
    .map(
      (entry) => `
        <div class="detail__recent-entry">
          <strong>${entry.userHandle}</strong>
          <span>${entry.stance}</span>
          <span>Confidence: ${entry.confidence}% • ${new Date(entry.createdAt).toLocaleString()}</span>
        </div>
      `
    )
    .join('');

  detailEl.innerHTML = `
    <div class="detail__intro">
      <h3>${detail.title}</h3>
      <p>${detail.description || 'No description yet. Add one when you log a view.'}</p>
    </div>
    <div class="detail__summary">
      <p><strong>${detail.totalViews}</strong> total voice${detail.totalViews === 1 ? '' : 's'} logged.</p>
      ${detail.consensus ? `<p>Consensus: <strong>${detail.consensus}</strong> (${detail.consensusPercent}% of views)</p>` : '<p>No consensus yet.</p>'}
    </div>
    <div class="detail__breakdown">
      <h4>View spectrum</h4>
      <ul>${breakdownList || '<li>No positions logged yet.</li>'}</ul>
    </div>
    <div class="detail__recent">
      <h4>Latest contributions</h4>
      ${recent || '<p>No contributions yet. Be the first mover.</p>'}
    </div>
  `;
}

async function showDetail(slug) {
  try {
    const detail = await fetchJSON(`/api/subjects/${encodeURIComponent(slug)}`);
    renderDetail(detail);
  } catch (error) {
    detailEl.innerHTML = `<p class="error">Unable to load detail. ${error.message}</p>`;
  }
}

async function loadSubjects() {
  try {
    const data = await fetchJSON('/api/subjects');
    state.subjects = data.subjects || [];
    renderDashboard();
    renderSubjectOptions();
  } catch (error) {
    dashboardEl.innerHTML = `<p class="error">Failed to load dashboard data. ${error.message}</p>`;
  }
}

async function submitView(event) {
  event.preventDefault();
  formMessage.textContent = 'Sending your perspective to the hub...';

  const subjectTitle = subjectInput.value.trim();
  const subjectSlug = slugInput.value.trim().toLowerCase();
  const subjectDescription = descriptionInput.value.trim();
  const stance = stanceInput.value.trim();
  const userHandle = handleInput.value.trim();
  const confidence = Number(confidenceInput.value);

  if (!subjectTitle || !subjectSlug || !stance || !userHandle) {
    formMessage.textContent = 'Please fill in the required fields.';
    return;
  }

  try {
    const detail = await fetchJSON('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectSlug,
        subjectTitle,
        subjectDescription,
        stance,
        userHandle,
        confidence
      })
    });

    formMessage.textContent = 'Your view is live. Top Gato salutes you!';
    formEl.reset();
    confidenceInput.value = 50;
    confidenceValue.textContent = '50';

    await loadSubjects();
    renderDetail(detail);
  } catch (error) {
    formMessage.textContent = `Something went wrong: ${error.message}`;
  }
}

function handleSubjectInput() {
  const title = subjectInput.value;
  if (!title) {
    return;
  }
  const existing = Array.from(subjectOptions.options).find((option) => option.value === title);
  if (existing) {
    slugInput.value = existing.dataset.slug || slugify(title);
  } else {
    slugInput.value = slugify(title);
  }
}

confidenceInput.addEventListener('input', () => {
  confidenceValue.textContent = confidenceInput.value;
});

subjectInput.addEventListener('input', handleSubjectInput);
formEl.addEventListener('submit', submitView);

document.addEventListener('DOMContentLoaded', () => {
  handleSubjectInput();
  loadSubjects();
});
