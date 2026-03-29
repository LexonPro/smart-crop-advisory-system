/**
 * Smart Crop Advisory System — script.js
 * Handles: form validation, API call, result rendering, Chart.js, animations
 */

/* ─────────────────────────────────────────
   NAVBAR: add shadow on scroll
───────────────────────────────────────── */
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

/* ─────────────────────────────────────────
   HAMBURGER MENU
───────────────────────────────────────── */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Close on link click
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

/* ─────────────────────────────────────────
   CHART INSTANCE (module-level reference)
───────────────────────────────────────── */
let cropChart = null;

/* ─────────────────────────────────────────
   HANDLE PREDICT BUTTON
───────────────────────────────────────── */
async function handlePredict() {
  // 1. Gather & validate inputs
  const n    = parseFloat(document.getElementById('nitrogen').value);
  const p    = parseFloat(document.getElementById('phosphorus').value);
  const k    = parseFloat(document.getElementById('potassium').value);
  const temp = parseFloat(document.getElementById('temperature').value);
  const hum  = parseFloat(document.getElementById('humidity').value);
  const ph   = parseFloat(document.getElementById('ph').value);
  const rain = parseFloat(document.getElementById('rainfall').value);

  if ([n, p, k, temp, hum, ph, rain].some(v => isNaN(v))) {
    showError('Please fill in all fields with valid numeric values.');
    return;
  }

  if (n < 0 || n > 300)    { showError('Nitrogen must be between 0 and 300 mg/kg.'); return; }
  if (p < 0 || p > 300)    { showError('Phosphorus must be between 0 and 300 mg/kg.'); return; }
  if (k < 0 || k > 300)    { showError('Potassium must be between 0 and 300 mg/kg.'); return; }
  if (temp < -10 || temp > 55) { showError('Temperature must be between -10°C and 55°C.'); return; }
  if (hum < 0 || hum > 100)   { showError('Humidity must be between 0 and 100%.'); return; }
  if (ph < 0 || ph > 14)      { showError('Soil pH must be between 0 and 14.'); return; }
  if (rain < 0 || rain > 4000) { showError('Rainfall must be between 0 and 4000 mm.'); return; }

  hideError();

  // 2. Set loading state
  setLoading(true);

  try {
    // 3. POST to API
    const response = await fetch('https://smart-crop-advisory-system-2.onrender.com/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ N: n, P: p, K: k, temperature: temp, humidity: hum, ph: ph, rainfall: rain })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errText}`);
    }

    const data = await response.json();

    // 4. Parse + normalise the predictions array
    //    API may return: { predictions: [{crop, confidence}, ...] }
    //    or just: [{label, probability}] — handle both shapes
    const predictions = normalizePredictions(data);

    if (!predictions || predictions.length === 0) {
      throw new Error('No predictions returned. Please try again.');
    }

    // 5. Render results
    renderResults(predictions.slice(0, 3));

  } catch (err) {
    console.error('Prediction error:', err);
    showError(buildErrorMessage(err));
  } finally {
    setLoading(false);
  }
}

/* ─────────────────────────────────────────
   HANDLE RESET
───────────────────────────────────────── */
function handleReset() {
  // Clear inputs
  ['nitrogen','phosphorus','potassium','temperature','humidity','ph','rainfall'].forEach(id => {
    document.getElementById(id).value = '';
  });

  // Hide results
  document.getElementById('results').style.display = 'none';

  // Destroy chart
  if (cropChart) {
    cropChart.destroy();
    cropChart = null;
  }

  // Hide error
  hideError();

  // Scroll back to form
  document.getElementById('predict').scrollIntoView({ behavior: 'smooth' });
}

/* ─────────────────────────────────────────
   NORMALISE API RESPONSE
   Handles multiple possible shapes the API might return
───────────────────────────────────────── */
function normalizePredictions(data) {
  // Shape 1: { predictions: [{crop, confidence}] }
  if (Array.isArray(data?.predictions)) {
    return data.predictions.map(item => ({
      crop:       item.crop       ?? item.label ?? item.name ?? 'Unknown',
      confidence: item.confidence ?? item.probability ?? item.score ?? 0
    }));
  }

  // Shape 2: top-level array [{crop, confidence}]
  if (Array.isArray(data)) {
    return data.map(item => ({
      crop:       item.crop       ?? item.label ?? item.name ?? 'Unknown',
      confidence: item.confidence ?? item.probability ?? item.score ?? 0
    }));
  }

  // Shape 3: { top_crops: [...] }
  if (Array.isArray(data?.top_crops)) {
    return data.top_crops.map(item => ({
      crop:       item.crop  ?? item.label ?? item.name ?? 'Unknown',
      confidence: item.confidence ?? item.probability ?? 0
    }));
  }

  return null;
}

/* ─────────────────────────────────────────
   RENDER RESULTS
───────────────────────────────────────── */
function renderResults(predictions) {
  const container = document.getElementById('results');
  container.style.display = 'block';

  // Slight scroll to results
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  renderCards(predictions);
  renderChart(predictions);
}

/* ─────────────────────────────────────────
   RENDER PREDICTION CARDS
───────────────────────────────────────── */
function renderCards(predictions) {
  const grid = document.getElementById('predictionGrid');
  grid.innerHTML = '';

  predictions.forEach((item, index) => {
    const rank       = index + 1;
    const rankClass  = `rank-${rank}`;
    const cropName   = capitalize(item.crop);
    const confidence = toPercent(item.confidence);
    const emoji      = getCropEmoji(item.crop);

    const card = document.createElement('div');
    card.className = `pred-card ${rankClass}`;
    card.innerHTML = `
      <div class="pred-rank-badge">#${rank}</div>
      <div class="pred-crop-name">${emoji} ${cropName}</div>
      <div class="pred-label">Recommended Crop</div>
      <div class="pred-confidence-val">${confidence}%</div>
      <div class="pred-bar-track">
        <div class="pred-bar-fill" data-width="${confidence}" style="width:0%"></div>
      </div>
    `;

    grid.appendChild(card);
  });

  // Animate bars after render
  requestAnimationFrame(() => {
    document.querySelectorAll('.pred-bar-fill').forEach(bar => {
      const targetWidth = bar.dataset.width;
      setTimeout(() => {
        bar.style.width = `${targetWidth}%`;
      }, 150);
    });
  });
}

/* ─────────────────────────────────────────
   RENDER CHART
───────────────────────────────────────── */
function renderChart(predictions) {
  const ctx    = document.getElementById('cropChart').getContext('2d');
  const labels = predictions.map(p => capitalize(p.crop));
  const values = predictions.map(p => toPercent(p.confidence));

  // Destroy existing chart
  if (cropChart) {
    cropChart.destroy();
    cropChart = null;
  }

  // Update legend
  const legendEl = document.getElementById('chartLegend');
  const colors   = ['#16a34a', '#6b7280', '#9ca3af'];
  legendEl.innerHTML = predictions.map((p, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span>${capitalize(p.crop)}</span>
    </div>
  `).join('');

  cropChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Confidence (%)',
        data: values,
        backgroundColor: colors.map(c => c + 'CC'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 10,
        borderSkipped: false,
        barPercentage: 0.55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#f9fafb',
          bodyColor: '#d1d5db',
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: ctx => ` Confidence: ${ctx.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'DM Sans', sans-serif", weight: '600', size: 13 },
            color: '#374151'
          },
          border: { display: false }
        },
        y: {
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(229,231,235,.7)',
            drawBorder: false
          },
          ticks: {
            callback: val => `${val}%`,
            font: { family: "'DM Sans', sans-serif", size: 12 },
            color: '#9ca3af',
            stepSize: 20
          },
          border: { display: false }
        }
      }
    }
  });
}

/* ─────────────────────────────────────────
   LOADING STATE
───────────────────────────────────────── */
function setLoading(isLoading) {
  const btn = document.getElementById('predictBtn');

  if (isLoading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

/* ─────────────────────────────────────────
   ERROR HANDLING
───────────────────────────────────────── */
function showError(message) {
  const banner = document.getElementById('errorBanner');
  const msg    = document.getElementById('errorMessage');
  msg.textContent = message;
  banner.classList.add('show');

  // Auto-hide after 7 seconds
  clearTimeout(banner._timeout);
  banner._timeout = setTimeout(hideError, 7000);
}

function hideError() {
  document.getElementById('errorBanner').classList.remove('show');
}

function buildErrorMessage(err) {
  if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
    return 'Network error — could not reach the prediction server. Please check your connection or try again later.';
  }
  if (err.message.includes('500')) {
    return 'Server error (500). The prediction service encountered an issue. Please try again.';
  }
  if (err.message.includes('404')) {
    return 'Prediction endpoint not found (404). Please check the API URL.';
  }
  return err.message || 'An unexpected error occurred. Please try again.';
}

/* ─────────────────────────────────────────
   UTILITY HELPERS
───────────────────────────────────────── */

/** Capitalise first letter of each word */
function capitalize(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Convert a confidence value to a 0–100 percentage.
 * API might return 0.94 (fraction) or 94 (already %).
 */
function toPercent(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return 0;
  // If value looks like a fraction (0–1), multiply
  if (n <= 1) return Math.round(n * 100);
  return Math.round(n);
}

/** Return a relevant emoji for common crop names */
function getCropEmoji(crop) {
  const map = {
    rice: '🌾', wheat: '🌾', maize: '🌽', corn: '🌽',
    cotton: '🌿', sugarcane: '🎋', jute: '🌱',
    coffee: '☕', tea: '🍵', rubber: '🌳',
    coconut: '🥥', papaya: '🍈', mango: '🥭', banana: '🍌',
    grapes: '🍇', watermelon: '🍉', muskmelon: '🍈',
    apple: '🍎', orange: '🍊', pomegranate: '🍎',
    lentil: '🫘', chickpea: '🫘', kidneybeans: '🫘',
    pigeonpeas: '🫘', mothbeans: '🫘', mungbean: '🫘',
    blackgram: '🫘',
    default: '🌱'
  };
  const key = String(crop).toLowerCase().replace(/\s+/g, '');
  return map[key] || map.default;
}

/* ─────────────────────────────────────────
   HERO SCROLL-LINKED PARALLAX (subtle)
───────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const scrollY = window.scrollY;
  const heroContent = hero.querySelector('.hero-content');
  const heroVisual  = hero.querySelector('.hero-visual');
  if (heroContent) heroContent.style.transform = `translateY(${scrollY * 0.12}px)`;
  if (heroVisual)  heroVisual.style.transform  = `translateY(${scrollY * 0.08}px)`;
}, { passive: true });
