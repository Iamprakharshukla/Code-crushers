window.addEventListener("load", async () => {
  const container = document.getElementById("listings-container");
  const summary = document.getElementById("listing-summary");

  summary.textContent = "Loading your listings...";

  try {
    // 👇 URL ko *exactly* apne backend ke route ke hisaab se rakho
    // Example: GET /my-listings -> current user ki properties
    const res = await fetch("/my-listings", {
      method: "GET",
      credentials: "include", // session / cookie bhejne ke liye
    });

    console.log("Listings status:", res.status);

    if (!res.ok) {
      summary.textContent = "Failed to load listings. Please try again later.";
      return;
    }

    const data = await res.json();
    console.log("Listings data:", data);

    // Expecting: { listings: [ ... ] }
    const listings = Array.isArray(data.listings) ? data.listings : [];

    if (listings.length === 0) {
      summary.textContent = "You have not added any listings yet.";
      container.innerHTML = "";
      return;
    }

    summary.textContent = `You have ${listings.length} listing(s).`;

    // Cards create karo
    container.innerHTML = "";
    listings.forEach((listing) => {
      const card = document.createElement("div");
      card.className = "listing-card";

      card.innerHTML = `
        <h3>${listing.title || "Untitled Property"}</h3>
        <div class="listing-location">
          ${listing.location || listing.city || "Location not specified"}
        </div>
        <div class="listing-price">
          ₹${listing.price || "N/A"} / month
        </div>
        <div class="listing-meta">
          ${listing.bhk ? `${listing.bhk} BHK · ` : ""}
          ${listing.area ? `${listing.area} sq.ft` : ""}
        </div>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Listings load error:", err);
    summary.textContent = "Failed to load listings. Please try again later.";
  }
});
