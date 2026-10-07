// Shared navbar cart badge. Shows the real number of items in the cart and
// stays hidden when the cart is empty.
(function () {
  const BADGE_SELECTOR = "#cartCount, .cart-count"

  function setCartBadge(count) {
    const total = Number.parseInt(count, 10) || 0
    document.querySelectorAll(BADGE_SELECTOR).forEach((badge) => {
      badge.textContent = total
      badge.style.display = total > 0 ? "inline-block" : "none"
    })
  }

  async function refreshCartBadge() {
    try {
      const response = await fetch("/cart-api/cart/", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      })
      if (!response.ok) return
      const payload = await response.json()
      const items = payload && payload.data && payload.data.items
      setCartBadge(Array.isArray(items) ? items.length : 0)
    } catch (error) {
      setCartBadge(0)
    }
  }

  window.setCartBadge = setCartBadge
  window.refreshCartBadge = refreshCartBadge

  document.addEventListener("DOMContentLoaded", refreshCartBadge)
  // Back/forward navigation restores the page from cache with a stale badge.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) refreshCartBadge()
  })
})()
