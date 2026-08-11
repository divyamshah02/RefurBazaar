// Cart page functionality
let csrfToken = null
let cartListUrl = null
let cartClearUrl = null
let cartData = null

const PROCESSING_FEE_ORIGINAL = 449
const PROCESSING_FEE_DISCOUNTED = 199
const DELIVERY_ORIGINAL = 100

// Extended warranty price per product category — mirrors Product/utils.py
// WARRANTY_PRICES on the backend. This is display-only: the actual price
// charged is always (re)computed server-side from the listing's category.
const WARRANTY_PRICES = {
  mobile: 1499,
  laptop: 2999,
  tablet: 1999,
  accessory: 799,
}
const DEFAULT_WARRANTY_PRICE = 999

function getWarrantyPriceForUnit(unit) {
  const cat = (unit.category || "").toLowerCase()
  const key = Object.keys(WARRANTY_PRICES).find((k) => cat.includes(k))
  return key ? WARRANTY_PRICES[key] : DEFAULT_WARRANTY_PRICE
}

function init(csrf, listUrl, clearUrl) {
  csrfToken = csrf
  cartListUrl = listUrl
  cartClearUrl = clearUrl
  loadCart()
}

async function loadCart() {
  try {
    const [success, response] = await window.callApi("GET", cartListUrl, null, csrfToken)
    if (response.success && response.data) {
      cartData = response.data
      renderCart(cartData)
      updateCartSummary(cartData)
    } else {
      showEmptyCart()
    }
  } catch (error) {
    showEmptyCart()
  }
}

function renderCart(data) {
  const container = document.getElementById("cartItemsContainer")
  const cartTableWrapper = document.getElementById("cartTableWrapper")
  const cartSummary = document.getElementById("cartSummary")
  const emptyCartMessage = document.getElementById("emptyCartMessage")

  if (!data.items || data.items.length === 0) {
    showEmptyCart()
    return
  }

  cartTableWrapper.style.display = "block"
  cartSummary.style.display = "block"
  emptyCartMessage.style.display = "none"

  document.getElementById("cartItemCount").textContent =
    `${data.items.length} item${data.items.length !== 1 ? "s" : ""} in your cart`

  container.innerHTML = data.items
    .map((item) => {
      const unit = item.listing_unit

      // Only show main-section attributes (primary specs only)
      const primaryAttrs = (unit.attributes || [])
        .filter(attr => attr.section === 'main' || !attr.section)
        .slice(0, 4)
        .map(attr => attr.value)
      const condition = unit.condition
        ? unit.condition.charAt(0).toUpperCase() + unit.condition.slice(1)
        : ''
      const specsStr = [...primaryAttrs, condition].filter(Boolean).join(' • ')

      const imageUrl = unit.image || "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=120&h=120&fit=crop"
      const productUrl = unit.model_id ? `/product/${unit.model_id}/` : '#'
      const price = parseFloat(unit.price)
      const formattedPrice = price.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

      const hasWarranty = !!item.has_extended_warranty
      const warrantyPrice = hasWarranty
        ? parseFloat(item.warranty_price)
        : getWarrantyPriceForUnit(unit)
      const itemTotal = price + (hasWarranty ? parseFloat(item.warranty_price) : 0)
      const formattedItemTotal = itemTotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      const formattedWarrantyPrice = warrantyPrice.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

      return `
        <tr class="cart-item-row" data-item-id="${item.id}" data-unit-id="${unit.id}">
          <td class="product-cell">
            <div class="product-info">
              <a href="${productUrl}" class="product-image-link">
                <img src="${imageUrl}" alt="${unit.model_name}" class="product-image">
              </a>
              <div class="product-details">
                <a href="${productUrl}" class="product-name-link">
                  <h6 class="product-name">${unit.brand_name} ${unit.model_name}</h6>
                </a>
                <p class="product-specs">${specsStr}</p>
                <a href="${productUrl}" class="view-product-link">
                  <i class="fas fa-external-link-alt me-1"></i>View Product
                </a>
              </div>
            </div>
          </td>
          <td class="price-cell">
            <span class="item-price">₹${formattedPrice}</span>
          </td>
          <td class="quantity-cell">
            <div class="quantity-controls">
              <button class="qty-btn" disabled>
                <i class="fas fa-minus"></i>
              </button>
              <span class="quantity">1</span>
              <button class="qty-btn" onclick="increaseQuantity(${item.id}, ${unit.id}, '${unit.model_name}', '${unit.condition}', ${JSON.stringify(unit.attributes).replace(/"/g, "&quot;")}, '${unit.refurbisher_name}')">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </td>
          <td class="total-cell">
            <span class="item-total">₹${formattedItemTotal}</span>
          </td>
          <td class="remove-cell">
            <button class="remove-btn" onclick="removeFromCart(${item.id})" title="Remove item">
              <i class="fas fa-times"></i>
            </button>
          </td>
        </tr>
        <tr class="cart-item-warranty-row" data-item-id="${item.id}">
          <td colspan="5" class="warranty-addon-cell">
            <div class="item-warranty-toggle">
              <div class="d-flex align-items-center gap-2">
                <div class="icon-circle icon-circle-sm">
                  <i class="fas fa-shield-alt"></i>
                </div>
                <div>
                  <span class="fw-semibold" style="font-size: 0.85rem;">Extended Warranty</span>
                  <span class="text-muted ms-1" style="font-size: 0.78rem;">— +24 months coverage</span>
                </div>
              </div>
              <div class="d-flex align-items-center gap-3">
                <span class="fw-bold" style="color: #2A8C3C; font-size: 0.85rem;">+ ₹${formattedWarrantyPrice}</span>
                <label class="theme-switch mb-0">
                  <input
                    type="checkbox"
                    class="item-warranty-checkbox"
                    ${hasWarranty ? "checked" : ""}
                    onchange="toggleItemWarranty(${item.id}, this.checked)"
                  >
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          </td>
        </tr>
      `
    })
    .join("")
}

function showEmptyCart() {
  const cartTableWrapper = document.getElementById("cartTableWrapper")
  const cartSummary = document.getElementById("cartSummary")
  const emptyCartMessage = document.getElementById("emptyCartMessage")

  cartTableWrapper.style.display = "none"
  cartSummary.style.display = "none"
  emptyCartMessage.style.display = "block"

  document.getElementById("cartItemCount").textContent = "0 items in your cart"

  const cartBadge = document.getElementById("cartCount")
  if (cartBadge) cartBadge.textContent = 0
}

// =========================================
// PRICE SUMMARY BREAKDOWN
// =========================================

function updateCartSummary(data) {
  if (!data.items || data.items.length === 0) return

  // --- Price breakdown ---
  const itemCount = data.items.length
  const baseTotal = data.items.reduce((sum, item) => sum + parseFloat(item.listing_unit.price), 0)
  const warrantyTotal = data.items.reduce(
    (sum, item) => sum + (item.has_extended_warranty ? parseFloat(item.warranty_price) : 0),
    0
  )
  const warrantyItemCount = data.items.filter((item) => item.has_extended_warranty).length

  // Synthetic MRP: assume ~18% avg discount on refurbished goods for display
  const mrpTotal = Math.round(baseTotal * 1.18)
  const discount = mrpTotal - baseTotal

  renderPriceSummary(itemCount, mrpTotal, discount, baseTotal, warrantyTotal, warrantyItemCount)

  // --- E-waste ---
  const eWasteByCategory = {
    mobile: 0.5,
    smartphone: 0.5,
    laptop: 2.5,
    tablet: 0.6,
    accessory: 0.15,
    audio: 0.12,
    other: 0.3,
  }

  let totalEWaste = 0
  data.items.forEach(item => {
    const unit = item.listing_unit
    const cat = (unit.category || 'other').toLowerCase()
    // Match category string to a key
    const key = Object.keys(eWasteByCategory).find(k => cat.includes(k)) || 'other'
    totalEWaste += eWasteByCategory[key]
  })

  const eWasteSavedEl = document.getElementById('eWasteSaved')
  const eWasteBar = document.getElementById('eWasteBar')
  const eWasteCo2El = document.getElementById('eWasteCo2')
  if (eWasteSavedEl) {
    eWasteSavedEl.textContent = `${totalEWaste.toFixed(2)} kg`
  }
  if (eWasteBar) {
    // Scale: 5kg = 100%. Start bar at a minimum of 15% so it's always visible
    const progressWidth = Math.max(Math.min((totalEWaste / 5) * 100, 100), 25)
    eWasteBar.style.width = progressWidth + '%'
  }
  if (eWasteCo2El) {
    // Rough: 1 kg e-waste ~ 2.1 kg CO₂ saved
    const co2 = (totalEWaste * 2.1).toFixed(1)
    eWasteCo2El.textContent = `${co2} kg CO₂`
  }

  // Update cart badge
  const cartBadge = document.getElementById("cartCount")
  if (cartBadge) cartBadge.textContent = data.items.length
}

function calculateGST(mrpTotal) {
    const baseAmount = mrpTotal / 1.18;
    const gstAmount = mrpTotal - baseAmount;

    return {
        baseAmount: Number(baseAmount.toFixed(2)),
        gstAmount: Number(gstAmount.toFixed(2)),
        total: Number(mrpTotal.toFixed(2))
    };
}

function renderPriceSummary(itemCount, mrpTotal, discount, baseTotal, warrantyTotal = 0, warrantyItemCount = 0) {
  const warrantyChecked = warrantyTotal > 0

  const totalAmount = baseTotal + warrantyTotal + PROCESSING_FEE_DISCOUNTED
  // Delivery is free
  const totalSaved = discount + (DELIVERY_ORIGINAL) + (PROCESSING_FEE_ORIGINAL - PROCESSING_FEE_DISCOUNTED)

  const fmt = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const el = document.getElementById("priceSummaryBody")
  if (!el) return


  el.innerHTML = `
    <div class="price-row total-row">
      <span class="price-label">Total Amount</span>
      <span class="price-value total-value">₹${fmt(totalAmount)}</span>
    </div>

    <div class="text-end mt-2">
      <a href="javascript:void(0)" class="show-price-details text-decoration-none small">
        Show Details <i class="fa-solid fa-chevron-down ms-1"></i>
      </a>
    </div>

    <div class="price-details mt-3" style="display:none;">
      <div class="price-row">
        <span class="price-label">Price</span>
        <span class="price-value">₹${fmt(mrpTotal)}</span>
      </div>

      <div class="price-row discount-row">
        <span class="price-label">Discount</span>
        <span class="price-value discount-value">-₹${fmt(discount)}</span>
      </div>

      <div class="price-row">
        <span class="price-label">6 Month Warranty</span>
        <span class="price-value">
          <span class="free-tag">Free</span>
          <span class="old-price ms-1">₹1,000</span>
        </span>
      </div>

      ${warrantyChecked ? `
      <div class="price-row">
        <span class="price-label">
          Extended Warranty
          <span class="label-badge">${warrantyItemCount} item${warrantyItemCount !== 1 ? 's' : ''}</span>
        </span>
        <span class="price-value">₹${fmt(warrantyTotal)}</span>
      </div>` : ''}
     
      <div class="price-row">
        <span class="price-label">Delivery Charges</span>
        <span class="price-value">
          <span class="free-tag">Free</span>
          <span class="old-price ms-1">₹${fmt(DELIVERY_ORIGINAL)}</span>
        </span>
      </div>
      
      <div class="price-row">
        <span class="price-label">Tax</span>
        <span class="price-value">₹${fmt(calculateGST(totalAmount).gstAmount)}</span>
      </div>

      <div class="price-divider"></div>      
    </div>
    <div class="text-center">
    <div class="savings-pill w-100">
      You&apos;ve saved ₹${fmt(totalSaved)}
    </div>
    </div>  
  `;

  const btn = el.querySelector(".show-price-details");
  const details = el.querySelector(".price-details");

  btn.addEventListener("click", () => {
      const isHidden = details.style.display === "none";

      details.style.display = isHidden ? "block" : "none";
      btn.innerHTML = isHidden
          ? 'Hide Details <i class="fa-solid fa-chevron-up ms-1"></i>'
          : 'Show Details <i class="fa-solid fa-chevron-down ms-1"></i>';
  });
}

// =========================================
// CART ACTIONS
// =========================================

async function toggleItemWarranty(cartItemId, checked) {
  // Optimistically reflect the toggle immediately, then confirm with the server
  const checkbox = document.querySelector(
    `.cart-item-warranty-row[data-item-id="${cartItemId}"] .item-warranty-checkbox`
  )

  try {
    const [success, response] = await window.callApi(
      "PATCH",
      `${cartListUrl}${cartItemId}/warranty/`,
      { has_extended_warranty: checked },
      csrfToken
    )

    if (success && response.success) {
      showToast(
        checked ? "Extended warranty added" : "Extended warranty removed",
        checked ? "success" : "info"
      )
      loadCart()
    } else {
      if (checkbox) checkbox.checked = !checked
      showToast(response.error || "Failed to update warranty", "error")
    }
  } catch (error) {
    if (checkbox) checkbox.checked = !checked
    showToast("Failed to update warranty", "error")
  }
}

async function removeFromCart(cartItemId) {
  if (!confirm("Are you sure you want to remove this item from your cart?")) return

  try {
    const [success, response] = await window.callApi("DELETE", `${cartListUrl}${cartItemId}/`, null, csrfToken)
    if (response.success) {
      showToast("Item removed from cart!", "info")
      loadCart()
    } else {
      showToast(response.error || "Failed to remove item", "error")
    }
  } catch (error) {
    showToast("Failed to remove item from cart", "error")
  }
}

async function clearCart() {
  if (!confirm("Are you sure you want to clear your entire cart?")) return

  try {
    const [success, response] = await window.callApi("POST", cartClearUrl, { cart_id: cartData.cart_id }, csrfToken)
    if (response.success) {
      showToast("Cart cleared!", "info")
      showEmptyCart()
    } else {
      showToast(response.error || "Failed to clear cart", "error")
    }
  } catch (error) {
    showToast("Failed to clear cart", "error")
  }
}

async function increaseQuantity(cartItemId, unitId, modelName, condition, attributes, refurbisherName) {
  const cartItem = cartData.items.find((item) => item.id === cartItemId)
  if (!cartItem) return

  const unit = cartItem.listing_unit

  try {
    showToast("Checking for similar units...", "info")
    await showSimilarUnitsModal(unit, condition, attributes)
  } catch (error) {
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
}

function showToast(message, type = "info") {
  const toastContainer = document.querySelector(".toast-container") || createToastContainer()
  const toast = document.createElement("div")
  toast.className = `toast align-items-center border-0 mb-2`
  toast.setAttribute("role", "alert")

  let bgClass = "bg-primary"
  let icon = "fas fa-info-circle"
  if (type === "success") { bgClass = "bg-success"; icon = "fas fa-check-circle" }
  if (type === "error")   { bgClass = "bg-danger";  icon = "fas fa-exclamation-circle" }
  if (type === "info")    { bgClass = "bg-info";    icon = "fas fa-info-circle" }

  toast.classList.add(bgClass)
  toast.innerHTML = `
    <div class="d-flex text-white">
      <div class="toast-body d-flex align-items-center">
        <i class="${icon} me-2"></i>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `
  toastContainer.appendChild(toast)
  const bsToast = new window.bootstrap.Toast(toast, { delay: 3000 })
  bsToast.show()
  toast.addEventListener("hidden.bs.toast", () => toast.remove())
}

function createToastContainer() {
  const container = document.createElement("div")
  container.className = "toast-container position-fixed top-0 end-0 p-3"
  container.style.zIndex = "9999"
  container.style.marginTop = "100px"
  document.body.appendChild(container)
  return container
}
