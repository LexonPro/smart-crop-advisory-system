function showBox(element, text) {
  element.innerHTML = text;
  element.classList.remove("show");
  setTimeout(() => element.classList.add("show"), 50);
}

async function predict() {
  const resultBox = document.getElementById("result");
  const fertBox = document.getElementById("fertilizer");
  const waterBox = document.getElementById("water");

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
    // Crop
    const res = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });

    const result = await res.json();
    const crop = result.recommended_crop.toLowerCase();

    showBox(resultBox, `🌱 Crop: <b>${crop}</b>`);

    // Fertilizer
    const fertRes = await fetch("http://localhost:8000/fertilizer", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ crop })
    });

    const fertData = await fertRes.json();
    showBox(fertBox, `🧪 ${fertData.recommended_fertilizer}`);

    // Water
    const waterRes = await fetch("http://localhost:8000/water", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ rainfall: data.rainfall })
    });

    const waterData = await waterRes.json();
    showBox(waterBox, `💧 ${waterData.water_advice}`);

  } catch (err) {
    showBox(resultBox, "❌ Server Error");
  }
}