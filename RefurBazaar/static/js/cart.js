// Cart page functionality
let csrfToken = null
let cartListUrl = null
let cartClearUrl = null
let cartData = null

function init(csrf, listUrl, clearUrl) {
  csrfToken = csrf
  cartListUrl = listUrl
  cartClearUrl = clearUrl
  loadCart()
}

async function loadCart() {
  try {
    const response = await window.callApi("GET", cartListUrl, null, csrfToken)
    console.log("Cart Load Response:", response)
    if (response.success && response.data) {
      cartData = response.data
      renderCart(cartData)
      updateCartSummary(cartData)
    } else {
      showEmptyCart()
    }
  } catch (error) {
    console.error("[v0] Error loading cart:", error)
    showEmptyCart()
  }
}

function renderCart(data) {
  const container = document.getElementById("cartItemsContainer")
  const cartActions = document.getElementById("cartActions")
  const cartSummary = document.getElementById("cartSummary")
  const trustBadges = document.getElementById("trustBadges")

  if (!data.items || data.items.length === 0) {
    showEmptyCart()
    return
  }

  // Show cart actions and summary
  cartActions.style.display = "block"
  cartSummary.style.display = "block"
  trustBadges.style.display = "block"

  // Update cart item count in header
  document.getElementById("cartItemCount").textContent =
    `${data.items.length} item${data.items.length !== 1 ? "s" : ""} in your cart`

  // Render each cart item
  container.innerHTML = data.items
    .map((item, index) => {
      const unit = item.listing_unit
      const attributes = unit.attributes.map((attr) => `${attr.value}`).join(" • ")
      const imageUrl = unit.image || "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=120&h=120&fit=crop"

      return `
            <div class="cart-item-wrapper mb-4" data-item-id="${item.id}" data-unit-id="${unit.id}">
                <div class="cart-item">
                    <div class="item-image-container">
                        <img src="${imageUrl}" alt="${unit.model_name}" class="item-image">
                    </div>
                    <div class="item-details">
                        <h5 class="item-title">${unit.brand_name} ${unit.model_name} - ${attributes}</h5>
                        <p class="item-condition">${unit.condition.charAt(0).toUpperCase() + unit.condition.slice(1)} Condition • ${unit.refurbisher_name}</p>
                        <div class="item-features">
                            <span class="feature-badge">1 Year Warranty</span>
                            <span class="feature-badge">Free Shipping</span>
                        </div>
                        <div class="item-actions">
                            <button class="btn btn-link text-danger p-0" onclick="removeFromCart(${item.id})">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                    <div class="item-quantity">
                        <div class="quantity-controls">
                            <button class="btn btn-outline-secondary btn-sm" disabled>-</button>
                            <span class="quantity">1</span>
                            <button class="btn btn-outline-secondary btn-sm" onclick="increaseQuantity(${item.id}, ${unit.id}, '${unit.model_name}', '${unit.condition}', ${JSON.stringify(unit.attributes).replace(/"/g, "&quot;")}, '${unit.refurbisher_name}')">+</button>
                        </div>
                    </div>
                    <div class="item-price">
                        <div class="current-price">₹${Number.parseFloat(unit.price).toLocaleString("en-IN")}</div>
                    </div>
                </div>
            </div>
        `
    })
    .join("")
}

function showEmptyCart() {
  const container = document.getElementById("cartItemsContainer")
  const cartActions = document.getElementById("cartActions")
  const cartSummary = document.getElementById("cartSummary")
  const trustBadges = document.getElementById("trustBadges")

  cartActions.style.display = "none"
  cartSummary.style.display = "none"
  trustBadges.style.display = "none"

  document.getElementById("cartItemCount").textContent = "0 items in your cart"

  container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
            <h5 class="text-muted">Your cart is empty</h5>
            <p class="text-muted mb-4">Looks like you haven't added any items to your cart yet.</p>
            <a href="/shop" class="btn btn-primary">Continue Shopping</a>
        </div>
    `
}

function updateCartSummary(data) {
  if (!data.items || data.items.length === 0) return

  const subtotal = Number.parseFloat(data.total_price)
  const tax = Math.round(subtotal * 0.18)
  const total = subtotal + tax

  document.getElementById("summaryItemCount").textContent = data.items.length
  document.getElementById("summarySubtotal").textContent = `₹${subtotal.toLocaleString("en-IN")}`
  document.getElementById("summaryTax").textContent = `₹${tax.toLocaleString("en-IN")}`
  document.getElementById("summaryTotal").textContent = `₹${total.toLocaleString("en-IN")}`

  // Update cart badge in navbar
  const cartBadge = document.getElementById("cartCount")
  if (cartBadge) {
    cartBadge.textContent = data.items.length
  }
}

async function removeFromCart(cartItemId) {
  if (!confirm("Are you sure you want to remove this item from your cart?")) {
    return
  }

  try {
    const response = await window.callApi("DELETE", `${cartListUrl}${cartItemId}/`, null, csrfToken)

    if (response.success) {
      showToast("Item removed from cart!", "info")
      loadCart() // Reload cart
    } else {
      showToast(response.error || "Failed to remove item", "error")
    }
  } catch (error) {
    console.error("[v0] Error removing item:", error)
    showToast("Failed to remove item from cart", "error")
  }
}

async function clearCart() {
  if (!confirm("Are you sure you want to clear your entire cart?")) {
    return
  }

  try {
    const response = await window.callApi("POST", cartClearUrl, { cart_id: cartData.cart_id }, csrfToken)

    if (response.success) {
      showToast("Cart cleared!", "info")
      showEmptyCart()
    } else {
      showToast(response.error || "Failed to clear cart", "error")
    }
  } catch (error) {
    console.error("[v0] Error clearing cart:", error)
    showToast("Failed to clear cart", "error")
  }
}

async function increaseQuantity(cartItemId, unitId, modelName, condition, attributes, refurbisherName) {
  // Since each ListingUnit is unique, we need to find similar units
  // Get the product model ID from the current unit
  const cartItem = cartData.items.find((item) => item.id === cartItemId)
  if (!cartItem) return

  const unit = cartItem.listing_unit

  // Build query params for similar units
  const params = new URLSearchParams()
  params.append("condition", condition)

  // Add attribute filters
  attributes.forEach((attr) => {
    // Find attribute ID from the attribute name
    const attrId = attr.attribute_id || attr.id
    if (attrId) {
      params.append(`attribute_${attrId}`, attr.value)
    }
  })

  try {
    // Get product model ID by parsing from the listing
    // We need to fetch product detail to get the model ID
    // For now, we'll show a modal with available similar units

    showToast("Checking for similar units...", "info")

    // Show modal with similar units
    await showSimilarUnitsModal(unit, condition, attributes)
  } catch (error) {
    console.error("[v0] Error finding similar units:", error)
    showToast("No similar units available from this seller", "error")
  }
}

async function showSimilarUnitsModal(currentUnit, condition, attributes) {
  const modal = window.bootstrap.Modal.getOrCreateInstance(document.getElementById("similarUnitsModal"))
  const modalBody = document.getElementById("similarUnitsBody")

  modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Searching for similar units...</p>
        </div>
    `

  modal.show()

  try {
    // We need to get the product model ID first
    // Since we don't have it directly, we'll need to search or use a different approach
    // For now, show a message that quantity increase is not available for unique items

    modalBody.innerHTML = `
            <div class="alert alert-info">
                <h6 class="alert-heading">Unique Item</h6>
                <p>Each device in our marketplace is unique. To add more items, please browse our shop and add similar products to your cart.</p>
                <hr>
                <p class="mb-0">Looking for: <strong>${currentUnit.brand_name} ${currentUnit.model_name}</strong> in <strong>${condition}</strong> condition</p>
            </div>
            <div class="text-center">
                <a href="/shop?category=${currentUnit.category}" class="btn btn-primary">Browse Similar Products</a>
            </div>
        `
  } catch (error) {
    console.error("[v0] Error loading similar units:", error)
    modalBody.innerHTML = `
            <div class="alert alert-danger">
                <p class="mb-0">Failed to load similar units. Please try again later.</p>
            </div>
        `
  }
}

function applyPromoCode() {
  const promoInput = document.getElementById("promoCodeInput")
  const promoCode = promoInput.value.trim().toUpperCase()

  const validCodes = {
    SAVE10: 0.1,
    WELCOME20: 0.2,
    FIRST15: 0.15,
    REFUR25: 0.25,
  }

  if (validCodes[promoCode]) {
    const discount = validCodes[promoCode]
    showToast(`Promo code applied! ${Math.round(discount * 100)}% discount`, "success")
    promoInput.value = ""
    // TODO: Update cart with promo code discount
  } else if (promoCode) {
    showToast("Invalid promo code. Please try again.", "error")
  } else {
    showToast("Please enter a promo code.", "info")
  }
}

function showToast(message, type = "info") {
  const toastContainer = document.querySelector(".toast-container") || createToastContainer()

  const toast = document.createElement("div")
  toast.className = `toast align-items-center border-0 mb-2`
  toast.setAttribute("role", "alert")

  let bgClass = "bg-primary"
  let icon = "fas fa-info-circle"

  switch (type) {
    case "success":
      bgClass = "bg-success"
      icon = "fas fa-check-circle"
      break
    case "error":
      bgClass = "bg-danger"
      icon = "fas fa-exclamation-circle"
      break
    case "info":
      bgClass = "bg-info"
      icon = "fas fa-info-circle"
      break
  }

  toast.classList.add(bgClass)
  toast.innerHTML = `
        <div class="d-flex text-white">
            <div class="toast-body d-flex align-items-center">
                <i class="${icon} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `

  toastContainer.appendChild(toast)
  const bsToast = new window.bootstrap.Toast(toast, { delay: 3000 })
  bsToast.show()

  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove()
  })
}

function createToastContainer() {
  const container = document.createElement("div")
  container.className = "toast-container position-fixed top-0 end-0 p-3"
  container.style.zIndex = "9999"
  container.style.marginTop = "100px"
  document.body.appendChild(container)
  return container
}
