// Checkout page functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeCheckout()
})

function initializeCheckout() {
  // Initialize payment method switching
  const paymentOptions = document.querySelectorAll('input[name="payment"]')
  paymentOptions.forEach((option) => {
    option.addEventListener("change", function () {
      togglePaymentDetails(this.id)
    })
  })

  // Initialize delivery option changes
  const deliveryOptions = document.querySelectorAll('input[name="delivery"]')
  deliveryOptions.forEach((option) => {
    option.addEventListener("change", () => {
      updateDeliveryPrice()
    })
  })
}

function togglePaymentDetails(paymentType) {
  // Hide all payment details
  const paymentDetails = document.querySelectorAll(".payment-details")
  paymentDetails.forEach((detail) => (detail.style.display = "none"))

  // Show relevant payment details
  if (paymentType === "card") {
    document.getElementById("cardDetails").style.display = "block"
  }
}

function updateDeliveryPrice() {
  const selectedDelivery = document.querySelector('input[name="delivery"]:checked')
  let deliveryPrice = 0

  if (selectedDelivery.id === "express") {
    deliveryPrice = 199
  } else if (selectedDelivery.id === "overnight") {
    deliveryPrice = 499
  }

  // Update shipping cost in summary
  const shippingElement = document.querySelector(".summary-row:nth-child(2) span:last-child")
  if (deliveryPrice === 0) {
    shippingElement.textContent = "Free"
    shippingElement.className = "text-success"
  } else {
    shippingElement.textContent = `₹${deliveryPrice}`
    shippingElement.className = ""
  }

  // Recalculate total
  updateOrderTotal()
}

function updateOrderTotal() {
  const subtotal = 174997
  const tax = 31499
  const discount = 5000
  const shippingText = document.querySelector(".summary-row:nth-child(2) span:last-child").textContent
  const shipping = shippingText === "Free" ? 0 : Number.parseInt(shippingText.replace("₹", ""))

  const total = subtotal + tax + shipping - discount
  document.querySelector(".summary-row.total span:last-child").textContent = `₹${total.toLocaleString()}`
}

function placeOrder() {
  // Validate form
  const selectedAddress = document.querySelector('input[name="address"]:checked')
  const selectedDelivery = document.querySelector('input[name="delivery"]:checked')
  const selectedPayment = document.querySelector('input[name="payment"]:checked')

  if (!selectedAddress || !selectedDelivery || !selectedPayment) {
    alert("Please select all required options before placing your order.")
    return
  }

  // Show loading state
  const placeOrderBtn = document.querySelector(".btn-primary.btn-lg")
  placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'
  placeOrderBtn.disabled = true

  // Simulate order processing
  setTimeout(() => {
    alert("Order placed successfully! You will receive a confirmation email shortly.")
    window.location.href = "account.html#orders"
  }, 2000)
}

function showToast(message, type = "info") {
  // Create and show toast notification
  const toast = document.createElement("div")
  toast.className = `toast align-items-center text-white bg-${type} border-0`
  toast.setAttribute("role", "alert")
  toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `

  document.body.appendChild(toast)
  const bsToast = window.bootstrap.Toast.getOrCreateInstance(toast)
  bsToast.show()

  // Remove toast after it's hidden
  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove()
  })
}
