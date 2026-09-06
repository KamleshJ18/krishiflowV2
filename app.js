const $ = (id) => document.getElementById(id);

const rainLayer = $("rainLayer");
for (let i = 0; i < 28; i++) {
  const d = document.createElement("i");
  d.className = "rain";
  d.style.left = `${Math.random() * 100}%`;
  d.style.animationDelay = `${Math.random() * 1.8}s`;
  d.style.animationDuration = `${1.0 + Math.random() * 0.9}s`;
  rainLayer.appendChild(d);
}

const particleLayer = $("particleLayer");
for (let i = 0; i < 10; i++) {
  const p = document.createElement("span");
  p.className = "particle";
  p.style.left = `${Math.random() * 80 + 10}%`;
  p.style.top = `${Math.random() * 75 + 10}%`;
  p.style.animationDelay = `${Math.random() * -8}s`;
  p.style.animationDuration = `${7 + Math.random() * 5}s`;
  particleLayer.appendChild(p);
}

const state = {
  crop: "Wheat",
  qty: 500,
  quality: "Good",
  expectedPrice: 30,
  referencePrice: 24,
  humidity: 78,
  temperature: 23,
  rainRisk: "Moderate"
};

function syncProfile() {
  $("profileCrop").textContent = state.crop;
  $("profileQty").textContent = `${state.qty} kg`;
  $("profileQuality").textContent = state.quality;
  $("profilePrice").textContent = `₹${state.expectedPrice}/kg`;
  $("targetPrice").textContent = `₹${state.expectedPrice}/kg`;
  $("refPrice").textContent = `₹${state.referencePrice}/kg`;
  $("priceGap").textContent = `₹${Math.max(0, state.expectedPrice - state.referencePrice)}/kg`;
  $("decisionCrop").textContent = state.crop;
  $("decisionHumidity").textContent = `${state.humidity}%`;
  $("decisionGap").textContent = `₹${Math.max(0, state.expectedPrice - state.referencePrice)}/kg`;
  $("humidBig").textContent = `${state.humidity}%`;
  $("tempBig").textContent = `${state.temperature}°C`;
  $("rainBig").textContent = state.rainRisk;
}

function calculateDecision() {
  const gap = state.expectedPrice - state.referencePrice;
  if (state.quality === "Needs Attention") {
    return {
      action: "ATTENTION",
      icon: "!",
      reason: "The produce is marked as needing attention. Inspect quality and handling before choosing a sale or storage path."
    };
  }
  if (gap <= 1 && state.humidity < 70) {
    return {
      action: "SELL",
      icon: "↗",
      reason: "The market reference is close to the target and humidity risk is lower in this demo scenario."
    };
  }
  if (gap > 1 && state.humidity >= 75) {
    return {
      action: "STORE",
      icon: "⌂",
      reason: "The reference price is below the target while humidity is elevated. Compare safe storage options before waiting for a better price."
    };
  }
  if (gap > 1 && state.humidity < 75) {
    return {
      action: "STORE",
      icon: "⌂",
      reason: "The price is below the target and current demo weather risk is not severe. Storage can be considered if the produce is suitable."
    };
  }
  return {
    action: "SELL SOON",
    icon: "↗",
    reason: "The market signal is reasonably close to the target. Re-check weather and price before holding for longer."
  };
}

function renderDecision() {
  const d = calculateDecision();
  $("decisionAction").textContent = d.action;
  $("decisionIcon").textContent = d.icon;
  $("decisionReason").textContent = d.reason;

  const heroIsHigh = state.humidity >= 80;
  $("heroRisk").textContent = heroIsHigh ? "High Risk" : state.humidity >= 75 ? "Moderate Risk" : "Lower Risk";
  $("heroWeatherTitle").textContent = state.rainRisk === "High" ? "Rain Risk" : state.rainRisk === "Moderate" ? "Light Rain" : "Clear Window";
  $("heroHumidity").textContent = `${state.humidity}%`;
  $("heroTemp").textContent = `${state.temperature}°C`;
  $("heroWeatherIcon").textContent = state.rainRisk === "High" ? "🌧️" : state.rainRisk === "Moderate" ? "🌦️" : "☀️";

  const high = heroIsHigh || state.rainRisk === "High";
  $("riskTitle").textContent = high ? "High post-harvest risk" : "Moderate humidity risk";
  $("riskBody").textContent = high
    ? "Conditions may become less suitable for holding moisture-sensitive produce. Compare price versus safe storage before waiting."
    : "Humidity is elevated enough to matter for some produce. Use the market signal together with the weather before choosing to wait.";
}

$("produceForm").addEventListener("submit", (e) => {
  e.preventDefault();
  state.crop = $("crop").value;
  state.qty = Math.max(1, Number($("qty").value) || 1);
  state.quality = $("quality").value;
  state.expectedPrice = Math.max(0, Number($("expectedPrice").value) || 0);

  // Demo-only values: deliberately visible as prototype signals.
  const demo = {
    Wheat: { referencePrice: 24, humidity: 78, temperature: 23, rainRisk: "Moderate" },
    Tomato: { referencePrice: 26, humidity: 83, temperature: 24, rainRisk: "High" },
    Onion: { referencePrice: 22, humidity: 81, temperature: 22, rainRisk: "High" },
    Potato: { referencePrice: 23, humidity: 73, temperature: 21, rainRisk: "Moderate" }
  };
  Object.assign(state, demo[state.crop]);

  syncProfile();
  renderDecision();
  document.querySelector("#weather").scrollIntoView({behavior:"smooth"});
});

document.querySelectorAll(".decision-options button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const map = {
      SELL: ["SELL", "↗", "Farmer chooses to move toward selling now."],
      STORE: ["STORE", "⌂", "Farmer chooses to explore suitable storage options."],
      PROCESS: ["PROCESS", "✦", "Farmer chooses to consider processing instead of immediate sale."],
      ATTENTION: ["ATTENTION", "!", "Farmer chooses to inspect or handle the produce before deciding."]
    };
    const [action, icon, reason] = map[btn.dataset.action];
    $("decisionAction").textContent = action;
    $("decisionIcon").textContent = icon;
    $("decisionReason").textContent = reason;
  });
});

function updateProgress() {
  const scrollTop = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  $("progress").style.width = `${total ? (scrollTop / total) * 100 : 0}%`;
}
window.addEventListener("scroll", updateProgress, {passive:true});

syncProfile();
renderDecision();
updateProgress();
