document.addEventListener("DOMContentLoaded", async () => {
    const listingsContainer = document.getElementById("listings-container");
  
    try {
      const response = await fetch("http://localhost:3000/api/listings");
      const listings = await response.json();
  
      if (listings.length === 0) {
        listingsContainer.innerHTML = "<p>No listings found. Add a property to get started!</p>";
        return;
      }
  
      listings.forEach(listing => {
        const listingCard = document.createElement("div");
        listingCard.classList.add("listing-card");
  
        listingCard.innerHTML = `
          <img src="${listing.images[0] ? `/uploads/${listing.images[0]}` : './assets/img/placeholder.jpg'}" alt="${listing.title}" class="listing-image">
          <h2>${listing.title}</h2>
          <p><strong>Location:</strong> ${listing.location}</p>
          <p><strong>Price:</strong> $${listing.price}</p>
          <p><strong>Type:</strong> ${listing.type}</p>
          <p><strong>Bedrooms:</strong> ${listing.bedrooms || "N/A"}</p>
          <p><strong>Bathrooms:</strong> ${listing.bathrooms || "N/A"}</p>
          <p><strong>Contact:</strong> ${listing.contact}</p>
          <p>${listing.description}</p>
        `;
  
        listingsContainer.appendChild(listingCard);
      });
    } catch (error) {
      console.error("Error fetching listings:", error);
      listingsContainer.innerHTML = "<p>Failed to load listings. Please try again later.</p>";
    }
  });
  