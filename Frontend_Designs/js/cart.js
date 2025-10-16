// Cart page functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeCart()
  updateCartSummary()
  initializePromoCode()
  initializeBoughtTogether() // Initialize bought together functionality
})

function initializeCart() {
  // Initialize cart functionality
  console.log("Cart initialized")

  const cartItems = document.querySelectorAll(".cart-item")
  cartItems.forEach((item, index) => {
    item.setAttribute("data-item", index + 1)
  })
}

function updateQuantity(itemId, change) {
  const quantityElement = document.querySelector(`[data-item="${itemId}"] .quantity`)
  if (!quantityElement) return

  const currentQuantity = Number.parseInt(quantityElement.textContent)
  let newQuantity = currentQuantity + change

  if (newQuantity < 1) newQuantity = 1
  if (newQuantity > 10) newQuantity = 10

  quantityElement.textContent = newQuantity
  updateCartSummary()
  showToast("Quantity updated!", "success")
}

function removeFromCart(itemId) {
  if (confirm("Are you sure you want to remove this item from your cart?")) {
    const cartItem = document.querySelector(`[data-item="${itemId}"]`)
    if (cartItem) {
      cartItem.remove()
      updateCartSummary()
      showToast("Item removed from cart!", "info")

      const remainingItems = document.querySelectorAll(".cart-item")
      if (remainingItems.length === 0) {
        showEmptyCart()
      }
    }
  }
}

function moveToWishlist(itemId) {
  // Move item to wishlist
  removeFromCart(itemId)
  showToast("Item moved to wishlist!", "success")
}

function clearCart() {
  if (confirm("Are you sure you want to clear your entire cart?")) {
    showEmptyCart()
    updateCartSummary()
    showToast("Cart cleared!", "info")
  }
}

function showEmptyCart() {
  const cartItems = document.querySelector(".cart-items")
  cartItems.innerHTML = `
    <div class="text-center py-5">
      <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
      <h5 class="text-muted">Your cart is empty</h5>
      <p class="text-muted mb-4">Looks like you haven't added any items to your cart yet.</p>
      <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
    </div>
  `
}

function updateCartSummary() {
  // Recalculate cart totals
  const cartItems = document.querySelectorAll(".cart-item")
  let subtotal = 0
  let itemCount = 0

  cartItems.forEach((item) => {
    const priceText = item.querySelector(".current-price").textContent
    const price = Number.parseFloat(priceText.replace("₹", "").replace(/,/g, ""))
    const quantity = Number.parseInt(item.querySelector(".quantity").textContent)
    subtotal += price * quantity
    itemCount += quantity
  })

  const tax = Math.round(subtotal * 0.18) // 18% GST
  const discount = 5000 // Fixed discount
  const total = subtotal + tax - discount

  // Update summary display
  const summaryRows = document.querySelectorAll(".summary-row")
  if (summaryRows.length >= 4) {
    summaryRows[0].querySelector("span:last-child").textContent = `₹${subtotal.toLocaleString()}`
    summaryRows[2].querySelector("span:last-child").textContent = `₹${tax.toLocaleString()}`
    document.querySelector(".summary-row.total span:last-child").textContent = `₹${total.toLocaleString()}`
  }

  // Update cart badge
  const cartBadge = document.querySelector(".badge")
  if (cartBadge) cartBadge.textContent = itemCount

  const cartHeader = document.querySelector(".cart-header p")
  if (cartHeader) {
    cartHeader.textContent = `${itemCount} item${itemCount !== 1 ? "s" : ""} in your cart`
  }
}

function initializePromoCode() {
  const promoButton = document.querySelector(".promo-code .btn")
  const promoInput = document.querySelector(".promo-code .form-control")

  if (promoButton && promoInput) {
    promoButton.addEventListener("click", applyPromoCode)
    promoInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        applyPromoCode()
      }
    })
  }
}

function applyPromoCode() {
  const promoInput = document.querySelector(".promo-code .form-control")
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
    // Update discount in summary
    updatePromoDiscount(discount)
  } else if (promoCode) {
    showToast("Invalid promo code. Please try again.", "error")
  } else {
    showToast("Please enter a promo code.", "info")
  }
}

function updatePromoDiscount(discountPercent) {
  const subtotalText = document.querySelector(".summary-row:first-child span:last-child").textContent
  const subtotal = Number.parseFloat(subtotalText.replace("₹", "").replace(/,/g, ""))
  const promoDiscount = Math.round(subtotal * discountPercent)

  // Update discount row
  const discountRow = document.querySelector(".summary-row.discount span:last-child")
  if (discountRow) {
    const currentDiscount = Number.parseFloat(
      discountRow.textContent.replace("₹", "").replace(/,/g, "").replace("-", ""),
    )
    const newDiscount = currentDiscount + promoDiscount
    discountRow.textContent = `-₹${newDiscount.toLocaleString()}`
  }

  updateCartSummary()
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
  const bsToast = window.bootstrap.Toast(toast, { delay: 3000 })
  bsToast.show()

  // Remove toast after it's hidden
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

function addTogetherItem(itemName, price) {
  showToast(`${itemName} added to cart!`, "success")
  // Update cart count
  const cartBadge = document.querySelector("#cartCount")
  if (cartBadge) {
    const currentCount = Number.parseInt(cartBadge.textContent)
    cartBadge.textContent = currentCount + 1
  }
  updateCartSummary()
}

function initializeBoughtTogether() {
  const addButtons = document.querySelectorAll(".together-item .btn")
  addButtons.forEach((button, index) => {
    button.addEventListener("click", function () {
      const item = this.closest(".together-item")
      const itemName = item.querySelector("h6").textContent
      const itemPrice = item.querySelector(".together-price").textContent
      addTogetherItem(itemName, itemPrice)

      // Disable button and show added state
      this.textContent = "Added"
      this.classList.remove("btn-outline-primary")
      this.classList.add("btn-success")
      this.disabled = true
    })
  })
}
