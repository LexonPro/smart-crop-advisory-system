/**
 * Smart Crop Advisory System — script.js
 */

/* NAVBAR */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

/* HAMBURGER MENU */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

/* CHART */
let cropChart = null;

/* 🔥 RETRY FUNCTION (NEW) */
async function fetchWithRetry(url, options, retries = 3, delay = 4000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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

/* HANDLE PREDICT */
async function handlePredict() {
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
      'https://smart-crop-advisory-system-2.onrender.com/predict',
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
    const predictions = normalizePredictions(data);

    if (!predictions || predictions.length === 0) {
      throw new Error('No predictions returned.');
    }

    renderResults(predictions.slice(0, 3));

  } catch (err) {
    console.error(err);
    showError("Server is waking up... please try again.");
  } finally {
    setLoading(false);
  }
}

/* RESET */
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

/* NORMALIZE RESPONSE */
function normalizePredictions(data) {
  if (Array.isArray(data?.predictions)) {
    return data.predictions.map(item => ({
      crop: item.crop || item.label,
      confidence: item.confidence || item.probability
    }));
  }

  if (Array.isArray(data)) {
    return data;
  }

  return null;
}

/* RENDER RESULTS */
function renderResults(predictions) {
  document.getElementById('results').style.display = 'block';
  renderCards(predictions);
  renderChart(predictions);
}

/* CARDS */
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

/* CHART */
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

/* LOADING */
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

/* ERROR */
function showError(msg) {
  document.getElementById('errorMessage').innerText = msg;
}

function hideError() {
  document.getElementById('errorMessage').innerText = "";
}
