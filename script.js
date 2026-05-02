/**
 * Smart Crop Advisory System — script.js (IMPROVED)
 */

// =======================
// 🔗 API BASE URL
// =======================
const API_URL = "https://smart-crop-advisory-system-2.onrender.com";

// =======================
// NAVBAR
// =======================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// =======================
// HAMBURGER MENU
// =======================
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// =======================
// CHART
// =======================
let cropChart = null;

// =======================
// 🔥 FETCH WITH RETRY + TIMEOUT
// =======================
async function fetchWithRetry(url, options, retries = 6, delay = 6000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeout);

      return response;

    } catch (err) {
      console.log(`Retry ${i + 1}...`);

      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

// =======================
// 🚀 HANDLE PREDICT
// =======================
async function handlePredict() {
  const btn = document.getElementById('predictBtn');
  if (btn.disabled) return; // prevent spam click

  const n    = parseFloat(document.getElementById('nitrogen').value);
  const p    = parseFloat(document.getElementById('phosphorus').value);
  const k    = parseFloat(document.getElementById('potassium').value);
  const temp = parseFloat(document.getElementById('temperature').value);
  const hum  = parseFloat(document.getElementById('humidity').value);
  const ph   = parseFloat(document.getElementById('ph').value);
  const rain = parseFloat(document.getElementById('rainfall').value);

  if ([n, p, k, temp, hum, ph, rain].some(v => isNaN(v))) {
    showError('Please fill all fields correctly.');
    return;
  }

  hideError();
  setLoading(true);

  try {
    const response = await fetchWithRetry(
      `${API_URL}/predict`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          N: n, P: p, K: k,
          temperature: temp,
          humidity: hum,
          ph: ph,
          rainfall: rain
        })
      }
    );

    const data = await response.json();

    // 🔥 HANDLE SERVER ERRORS
    if (!response.ok) {
      throw new Error(data?.detail || "Server error");
    }

    const predictions = normalizePredictions(data);

    if (!predictions || predictions.length === 0) {
      throw new Error('No predictions returned.');
    }

    renderResults(predictions);

  } catch (err) {
    console.error(err);

    if (err.name === "AbortError") {
      showError("Server taking too long... please retry.");
    } else if (err.message.includes("Failed to fetch")) {
      showError("⏳ Server is starting... please wait (first request may take ~30s)");
    } else {
      showError(err.message || "Something went wrong.");
    }

  } finally {
    setLoading(false);
  }
}

// =======================
// RESET
// =======================
function handleReset() {
  ['nitrogen','phosphorus','potassium','temperature','humidity','ph','rainfall']
    .forEach(id => document.getElementById(id).value = '');

  document.getElementById('results').style.display = 'none';

  if (cropChart) {
    cropChart.destroy();
    cropChart = null;
  }

  hideError();
}

// =======================
// 🔄 NORMALIZE RESPONSE
// =======================
function normalizePredictions(data) {
  if (data?.recommended_crop) {
    return [{
      crop: String(data.recommended_crop).toUpperCase(),
      confidence: 1
    }];
  }
  return null;
}

// =======================
// 📊 RENDER RESULTS
// =======================
function renderResults(predictions) {
  document.getElementById('results').style.display = 'block';
  renderCards(predictions);
  renderChart(predictions);
}

// =======================
// 📦 CARDS
// =======================
function renderCards(predictions) {
  const grid = document.getElementById('predictionGrid');
  grid.innerHTML = '';

  predictions.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'pred-card';

    card.innerHTML = `
      <h3>#${index + 1} ${item.crop}</h3>
      <p>${Math.round(item.confidence * 100)}%</p>
    `;

    grid.appendChild(card);
  });
}

// =======================
// 📈 CHART
// =======================
function renderChart(predictions) {
  const ctx = document.getElementById('cropChart').getContext('2d');

  if (cropChart) cropChart.destroy();

  cropChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: predictions.map(p => p.crop),
      datasets: [{
        data: predictions.map(p => p.confidence * 100)
      }]
    }
  });
}

// =======================
// ⏳ LOADING
// =======================
function setLoading(isLoading) {
  const btn = document.getElementById('predictBtn');

  if (isLoading) {
    btn.innerText = "Waking server... ⏳";
    btn.disabled = true;
  } else {
    btn.innerText = "Predict";
    btn.disabled = false;
  }
}

// =======================
// ❌ ERROR HANDLING
// =======================
function showError(msg) {
  document.getElementById('errorMessage').innerText = msg;
}

function hideError() {
  document.getElementById('errorMessage').innerText = "";
}