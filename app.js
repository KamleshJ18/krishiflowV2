const $ = (id) => document.getElementById(id);

// -----------------------------
// Animated rain
// -----------------------------
const rainLayer = $("rainLayer");

for (let i = 0; i < 28; i++) {
  const rain = document.createElement("i");

  rain.className = "rain";
  rain.style.left = `${Math.random() * 100}%`;
  rain.style.animationDelay = `${Math.random() * 2}s`;
  rain.style.animationDuration = `${1 + Math.random()}s`;

  rainLayer.appendChild(rain);
}

// -----------------------------
// Floating leaves / particles
// -----------------------------
const particleLayer = $("particleLayer");

for (let i = 0; i < 10; i++) {
  const particle = document.createElement("span");

  particle.className = "particle";
  particle.style.left = `${Math.random() * 80 + 10}%`;
  particle.style.top = `${Math.random() * 70 + 10}%`;
  particle.style.animationDelay = `${Math.random() * -8}s`;
  particle.style.animationDuration = `${7 + Math.random() * 5}s`;

  particleLayer.appendChild(particle);
}

// -----------------------------
// CONNECT FRONTEND TO PYTHON
// -----------------------------
$("produceForm").addEventListener("submit", async (event) => {

  // Stop the browser from refreshing the page
  event.preventDefault();

  // Get values from the form
  const payload = {
    crop: $("crop").value,
    quantity: Number($("qty").value),
    quality: $("quality").value,
    expected_price: Number($("expectedPrice").value),
    location: $("location").value.trim()
  };

  console.log("Sending to Python:", payload);

  try {

    // Send the form data to Flask
    const response = await fetch("/api/analyze", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(payload)
    });

    // Receive Python's response
    const result = await response.json();

    console.log("Python response:", result);

    if (!response.ok) {
      throw new Error(result.error || "Backend error");
    }

    // -----------------------------
    // Update Produce section
    // -----------------------------
    $("profileCrop").textContent = result.crop;

    $("profileQty").textContent =
      `${result.quantity} kg`;

    $("profileQuality").textContent =
      result.quality;

    $("profilePrice").textContent =
      `₹${result.expected_price}/kg`;


    // -----------------------------
    // Update Weather section
    // -----------------------------
    $("humidBig").textContent =
      `${result.humidity}%`;

    $("tempBig").textContent =
      `${result.temperature}°C`;

    $("rainBig").textContent =
      result.rain_risk;
    
    const rainCard = document.querySelector(
      ".metric:nth-child(3) small"
    );

    if (rainCard) {
      rainCard.textContent =
        `Rain probability: ${result.rain_probability}%`;
    }


    // -----------------------------
    // Update Market section
    // -----------------------------
    $("targetPrice").textContent =
      `₹${result.expected_price}/kg`;

    $("refPrice").textContent =
      `₹${result.reference_price}/kg`;

    $("marketPrice").textContent =
      result.reference_price;

    $("priceGap").textContent =
      `₹${Math.max(0, result.price_gap)}/kg`;


    // -----------------------------
    // Update Decision section
    // -----------------------------
    $("decisionCrop").textContent =
      result.crop;

    $("decisionHumidity").textContent =
      `${result.humidity}%`;

    $("decisionGap").textContent =
      `₹${Math.max(0, result.price_gap)}/kg`;

    $("decisionAction").textContent =
      result.action;

    $("decisionReason").textContent =
      result.reason;
    // -----------------------------
// UPDATE STORAGE FROM BACKEND
// -----------------------------

const storageCards =
  document.querySelectorAll(".storage-card");

if (result.storage_options) {

  result.storage_options
    .slice(0, 2)
    .forEach((storage, index) => {

      if (!storageCards[index]) {
        return;
      }

      const card = storageCards[index];

      // Remove an old label if one exists
      const oldLabel = card.querySelector(".best-match-label");

      if (oldLabel) {
        oldLabel.remove();
      }

      // Add BEST MATCH to the closest storage
      if (index === 0) {
        const label = document.createElement("div");

        label.className = "best-match-label";
        label.textContent = "⭐ BEST MATCH";

        card.prepend(label);
      }

      card.querySelector("h3").textContent =
        storage.name;

      card.querySelector("p").textContent =
        storage.description;

      card.querySelector(".storage-meta").innerHTML = `
        <span>📍 ${storage.distance_km} km</span>
        <span>₹${storage.price_per_kg_day}/kg/day</span>
      `;

    });
}

const storageSection =
  document.querySelector(".scene-storage");

if (storageSection) {
  if (result.action === "STORE") {
    storageSection.style.display = "block";
    const bestLabel =
      document.getElementById("bestStorageLabel");

    if (bestLabel) {
      bestLabel.style.display = "block";
    }
  } else {
    storageSection.style.display = "none";
    const bestLabel =
      document.getElementById("bestStorageLabel");

    if (bestLabel) {
      bestLabel.style.display = "none";
    }
  }
}

    // -----------------------------
    // Update hero weather card
    // -----------------------------
    $("heroHumidity").textContent =
      `${result.humidity}%`;

    $("weatherCity").textContent =
      result.city;

    $("suggestedTime").textContent =
      result.suggested_time;

    $("heroTemp").textContent =
      `${result.temperature}°C`;

    $("weatherCity").textContent =
      result.city;

    $("suggestedTime").textContent =
      result.suggested_time;

    if (result.rain_risk === "High") {

      $("heroWeatherTitle").textContent =
        "Rain Risk";

      $("heroWeatherIcon").textContent =
        "🌧️";

      $("heroRisk").textContent =
        "High Risk";

    } else if (result.rain_risk === "Moderate") {

      $("heroWeatherTitle").textContent =
        "Light Rain";

      $("heroWeatherIcon").textContent =
        "🌦️";

      $("heroRisk").textContent =
        "Moderate Risk";

    } else {

      $("heroWeatherTitle").textContent =
        "Clear Window";

      $("heroWeatherIcon").textContent =
        "☀️";

      $("heroRisk").textContent =
        "Lower Risk";
    }


    // -----------------------------
    // Update risk message
    // -----------------------------
    if (result.humidity >= 80 || result.rain_risk === "High") {

      $("riskTitle").textContent =
        "High post-harvest risk";

      $("riskBody").textContent =
        "Humidity and weather conditions may increase post-harvest risk. Compare market price with safe storage options.";

    } else {

      $("riskTitle").textContent =
        "Moderate humidity risk";

      $("riskBody").textContent =
        "Weather conditions should be considered together with market price before deciding whether to sell or store.";
    }


    // -----------------------------
    // Move to weather section
    // -----------------------------
    document
      .querySelector("#weather")
      .scrollIntoView({
        behavior: "smooth"
      });

  } catch (error) {

    console.error("Connection error:", error);

    alert(
      "KrishiFlow could not connect to the Python backend.\n\n" +
      error.message
    );
  }
});


// -----------------------------
// Manual decision buttons
// -----------------------------
document
  .querySelectorAll(".decision-options button")
  .forEach((button) => {

    button.addEventListener("click", () => {

      const action = button.dataset.action;

      if (action === "SELL") {

        $("decisionAction").textContent = "SELL";
        $("decisionIcon").textContent = "↗";
        $("decisionReason").textContent =
          "Farmer chooses to move toward selling now.";

      }

      if (action === "STORE") {

        $("decisionAction").textContent = "STORE";
        $("decisionIcon").textContent = "⌂";
        $("decisionReason").textContent =
          "Farmer chooses to explore suitable storage options.";

      }

      if (action === "PROCESS") {

        $("decisionAction").textContent = "PROCESS";
        $("decisionIcon").textContent = "✦";
        $("decisionReason").textContent =
          "Farmer chooses to consider processing instead of immediate sale.";

      }

      if (action === "ATTENTION") {

        $("decisionAction").textContent = "ATTENTION";
        $("decisionIcon").textContent = "!";
        $("decisionReason").textContent =
          "Farmer chooses to inspect or handle the produce before deciding.";

      }

    });

  });


// -----------------------------
// Scroll progress bar
// -----------------------------
function updateProgress() {

  const scrollTop = window.scrollY;

  const total =
    document.documentElement.scrollHeight -
    window.innerHeight;

  const percentage =
    total > 0
      ? (scrollTop / total) * 100
      : 0;

  $("progress").style.width =
    `${percentage}%`;
}

window.addEventListener(
  "scroll",
  updateProgress,
  { passive: true }
);

updateProgress();

// ---------------------------------
// BUYER NEGOTIATION
// ---------------------------------

const acceptOfferButton =
  document.getElementById("acceptOffer");

const counterOfferButton =
  document.getElementById("counterOffer");

const counterBox =
  document.getElementById("counterBox");

const sendCounterButton =
  document.getElementById("sendCounter");

const offerMessage =
  document.getElementById("offerMessage");


// Get buyer offer from Python
async function loadBuyerOffer() {

  const crop =
    $("crop").value;

  const quantity =
    Number($("qty").value);

  const expectedPrice =
    Number($("expectedPrice").value);

  try {

    // Ask Python for the current buyer offer.
    // This creates the offer only when we actually need one.
    const response = await fetch(
      "/api/offer",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          crop: crop,
          quantity: quantity,
          expected_price: expectedPrice
        })
      }
    );

    const result =
      await response.json();

    const statusElement =
      document.getElementById("offerStatus");

    if (statusElement && result.status) {
      statusElement.textContent =
        result.status;
    }

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Could not get buyer offer."
      );
    }

    $("buyerExpected").textContent =
      `₹${result.expected_price}/kg`;

    $("buyerOffer").textContent =
      `₹${result.buyer_offer}/kg`;

    $("buyerDifference").textContent =
      `₹${Math.max(0, result.difference)}/kg`;

    return result;

  } catch (error) {

    console.error(error);

    offerMessage.textContent =
      "Could not connect to the buyer service.";

    return null;
  }
}


// Accept offer
if (acceptOfferButton) {

  acceptOfferButton.addEventListener(
    "click",
    async () => {

      const offer =
        await loadBuyerOffer();

      if (!offer) {
        return;
      }

      try {

        const response = await fetch(
          "/api/offer/status",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              crop: $("crop").value,
              status: "ACCEPTED"
            })
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Could not accept offer."
          );
        }

        offerMessage.textContent =
          "✅ Offer accepted successfully.";

        await loadOfferHistory();

      } catch (error) {

        console.error(error);

        offerMessage.textContent =
          "Could not update the offer.";
      }
    }
  );
}


// Show counter offer box
if (counterOfferButton) {

  counterOfferButton.addEventListener(
    "click",
    async () => {

      await loadBuyerOffer();

      counterBox.style.display =
        "block";

      offerMessage.textContent =
        "Enter the price you would like to offer back.";

    }
  );

}


// Send counter offer
if (sendCounterButton) {

  sendCounterButton.addEventListener(
    "click",
    async () => {

      const counterPrice =
        Number(
          $("counterPrice").value
        );

      if (!counterPrice || counterPrice <= 0) {

        offerMessage.textContent =
          "Please enter a valid counter price.";

        return;
      }

      try {

        const response = await fetch(
          "/api/offer/status",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              crop: $("crop").value,
              status: "COUNTERED",
              counter_price: counterPrice
            })
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Could not save counter offer."
          );
        }

        offerMessage.textContent =
          `📨 Counter offer of ₹${counterPrice}/kg recorded.`;

        await loadOfferHistory();

      } catch (error) {

        console.error(error);

        offerMessage.textContent =
          "Could not save the counter offer.";
      }
    }
  );
}

// ---------------------------------
// LOAD NEGOTIATION HISTORY
// ---------------------------------

async function loadOfferHistory() {

  try {

    const response =
      await fetch("/api/offers");

    const offers =
      await response.json();

    const history =
      document.getElementById("offerHistory");

    if (!history) return;

    if (!offers.length) {

      history.textContent =
        "No negotiation activity yet.";

      return;
    }

    history.innerHTML = "";

    offers.slice(0, 5).forEach((offer) => {

      const item =
        document.createElement("div");

      item.className =
        "history-item";

      item.innerHTML = `
        <span>
          Buyer: ₹${offer.buyer_offer}/kg
          ${
            offer.counter_price
              ? `<br>Your counter: ₹${offer.counter_price}/kg`
              : ""
          }
        </span>

        <span class="history-status">
          ${offer.status}
        </span>
      `;

      history.appendChild(item);

    });

  } catch (error) {

    console.error(
      "Could not load offer history:",
      error
    );

  }
}

loadOfferHistory();

// ---------------------------------
// LOAD PRODUCE HISTORY
// ---------------------------------

async function loadProduceHistory() {

  const history =
    document.getElementById("produceHistory");

  if (!history) {
    console.log("produceHistory element not found");
    return;
  }

  try {

    const response =
      await fetch("/api/produce");

    const produce =
      await response.json();

    console.log("Produce records:", produce);

    if (!Array.isArray(produce) || produce.length === 0) {

      history.innerHTML = `
        <p class="empty-history">
          No produce analyzed yet.
        </p>
      `;

      return;
    }

    history.innerHTML = "";

    produce.slice(0, 8).forEach((item) => {

      const row =
        document.createElement("div");

      row.className =
        "produce-history-item";

      row.innerHTML = `
        <div>
          <strong>🌾 ${item.crop || "Unknown crop"}</strong>
          <br>
          <span>
            ${item.location || "Location not saved"}
          </span>
        </div>

        <div>
          <span>Quantity</span>
          <br>
          <strong>${item.quantity || 0} kg</strong>
        </div>

        <div>
          <span>Target price</span>
          <br>
          <strong>₹${item.expected_price || 0}/kg</strong>
        </div>

        <div>
          <span>Quality</span>
          <br>
          <strong>${item.quality || "Unknown"}</strong>
        </div>
      `;

      history.appendChild(row);
    });

  } catch (error) {

    console.error(
      "Could not load produce history:",
      error
    );

    history.innerHTML = `
      <p class="empty-history">
        Could not load produce history.
      </p>
    `;
  }
}

loadProduceHistory();