function showBox(element, text) {
  element.innerHTML = text;
  element.classList.remove("show");
  setTimeout(() => element.classList.add("show"), 50);
}

async function predict() {
  const resultBox = document.getElementById("result");
  const fertBox = document.getElementById("fertilizer");
  const waterBox = document.getElementById("water");

  const BASE_URL = "https://smart-crop-advisory-system-2.onrender.com";

  const data = {
    N: Number(document.getElementById("N").value),
    P: Number(document.getElementById("P").value),
    K: Number(document.getElementById("K").value),
    temperature: Number(document.getElementById("temp").value),
    humidity: Number(document.getElementById("humidity").value),
    ph: Number(document.getElementById("ph").value),
    rainfall: Number(document.getElementById("rainfall").value)
  };

  showBox(resultBox, "⏳ Analyzing...");
  fertBox.innerHTML = "";
  waterBox.innerHTML = "";

  try {
    // 🌱 Crop Prediction
    const res = await fetch(`${BASE_URL}/predict`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });

    const result = await res.json();
    const crop = result.recommended_crop.toLowerCase();

    showBox(resultBox, `🌱 Crop: <b>${crop}</b>`);

    // 🧪 Fertilizer
    const fertRes = await fetch(`${BASE_URL}/fertilizer`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ crop })
    });

    const fertData = await fertRes.json();
    showBox(fertBox, `🧪 ${fertData.recommended_fertilizer}`);

    // 💧 Water Advice
    const waterRes = await fetch(`${BASE_URL}/water`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ rainfall: data.rainfall })
    });

    const waterData = await waterRes.json();
    showBox(waterBox, `💧 ${waterData.water_advice}`);

  } catch (err) {
    showBox(resultBox, "❌ Server Error");
    console.error(err);
  }
}