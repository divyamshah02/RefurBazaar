let csrfToken = null
let cartListUrl = null
let createOrderUrl = null
let verifyPaymentUrl = null
let addressesUrl = null
let cartData = null
let userAddresses = []

function init(csrf, cartUrl, orderUrl, verifyUrl, addrUrl) {
  csrfToken = csrf
  cartListUrl = cartUrl
  createOrderUrl = orderUrl
  verifyPaymentUrl = verifyUrl
  addressesUrl = addrUrl

  loadCart()
  loadAddresses()
  setupEventListeners()
}

async function loadCart() {
  try {
    const [success, response] = await callApi("GET", cartListUrl, null, csrfToken)

    if (response.success && response.data) {
      cartData = response.data
      renderOrderItems(cartData)
      updateOrderSummary(cartData)
      updateCartBadge(cartData)
    } else {
      showEmptyCart()
    }
  } catch (error) {
    console.error("Error loading cart:", error)
    showEmptyCart()
  }
}

function renderOrderItems(data) {
  const container = document.getElementById("orderItemsContainer")

  if (!data.items || data.items.length === 0) {
    showEmptyCart()
    return
  }

  container.innerHTML = data.items
    .map((item) => {
      const unit = item.listing_unit
      const attributes = unit.attributes.map((attr) => `${attr.value}`).join(" • ")
      const imageUrl = unit.image || "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=60&h=60&fit=crop"

      return `
        <div class="order-item mb-3">
          <img src="${imageUrl}" alt="${unit.model_name}" class="img-fluid rounded me-3" style="width: 60px; height: 60px; object-fit: cover;">
          <div class="flex-grow-1">
            <h6 class="mb-1">${unit.brand_name} ${unit.model_name}</h6>
            <small class="text-muted">${attributes} • ${unit.condition}</small>
          </div>
          <div class="text-end">
            <strong>₹${Number.parseFloat(unit.price).toLocaleString("en-IN")}</strong>
          </div>
        </div>
      `
    })
    .join("")
}

function updateOrderSummary(data) {
  if (!data.items || data.items.length === 0) return

  const subtotal = Number.parseFloat(data.total_price)
  const shipping = 50.0
  const tax = Math.round(subtotal * 0.18)
  const total = subtotal + shipping + tax

  document.getElementById("summarySubtotal").textContent = `₹${subtotal.toLocaleString("en-IN")}`
  document.getElementById("summaryShipping").textContent = `₹${shipping.toLocaleString("en-IN")}`
  document.getElementById("summaryTax").textContent = `₹${tax.toLocaleString("en-IN")}`
  document.getElementById("summaryTotal").textContent = `₹${total.toLocaleString("en-IN")}`
}

function updateCartBadge(data) {
  const cartBadge = document.getElementById("cartCount")
  if (cartBadge && data.items) {
    cartBadge.textContent = data.items.length
  }
}

async function loadAddresses() {
  try {
    const [success, response] = await callApi("GET", addressesUrl, null, csrfToken)

    if (response.success && response.data && response.data.addresses) {
      userAddresses = response.data.addresses
      renderSavedAddresses()
    }
  } catch (error) {
    console.error("Error loading addresses:", error)
  }
}

function renderSavedAddresses() {
  if (!userAddresses || userAddresses.length === 0) return

  const container = document.getElementById("savedAddressesContainer")

  container.innerHTML = `
    <div class="checkout-section">
      <h4>Saved Addresses</h4>
      <div class="row g-3">
        ${userAddresses
          .map(
            (address, index) => `
          <div class="col-md-6">
            <div class="card h-100 address-card ${index === 0 ? "border-primary" : ""}" onclick="selectAddress(${index})">
              <div class="card-body">
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="savedAddress" id="address${index}" value="${index}" ${index === 0 ? "checked" : ""}>
                  <label class="form-check-label" for="address${index}">
                    <strong>${address.address_name || "Address " + (index + 1)}</strong>
                  </label>
                </div>
                <p class="mb-1 mt-2">${address.address_line}</p>
                <p class="mb-0">${address.city}, ${address.state} - ${address.pincode}</p>
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
        <div class="col-md-6">
          <div class="card h-100 address-card border-dashed" onclick="selectNewAddress()">
            <div class="card-body d-flex flex-column align-items-center justify-content-center text-center">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="savedAddress" id="addressNew" value="new">
                <label class="form-check-label" for="addressNew">
                  <i class="fas fa-plus-circle me-2"></i>Add New Address
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  // Pre-fill first address
  if (userAddresses.length > 0) {
    fillAddressFields(userAddresses[0])
  }
}

function selectAddress(index) {
  // Update border
  document.querySelectorAll(".address-card").forEach((card) => card.classList.remove("border-primary"))
  event.currentTarget.classList.add("border-primary")

  // Fill form
  fillAddressFields(userAddresses[index])

  // Check radio
  document.getElementById(`address${index}`).checked = true
}

function selectNewAddress() {
  // Update border
  document.querySelectorAll(".address-card").forEach((card) => card.classList.remove("border-primary"))
  event.currentTarget.classList.add("border-primary")

  // Clear form
  document.getElementById("address").value = ""
  document.getElementById("city").value = ""
  document.getElementById("state").value = ""
  document.getElementById("pincode").value = ""

  // Check radio
  document.getElementById("addressNew").checked = true
}

function fillAddressFields(address) {
  document.getElementById("address").value = address.address_line || ""
  document.getElementById("city").value = address.city || ""
  document.getElementById("state").value = address.state || ""
  document.getElementById("pincode").value = address.pincode || ""
}

function setupEventListeners() {
  // Billing address toggle
  const billingSameCheckbox = document.getElementById("billingSameAsShipping")
  if (billingSameCheckbox) {
    billingSameCheckbox.addEventListener("change", function () {
      const billingSection = document.getElementById("billingAddressSection")
      billingSection.style.display = this.checked ? "none" : "block"
    })
  }
}

async function placeOrder() {
  if (!validateForm()) {
    return
  }

  const billingSame = document.getElementById("billingSameAsShipping").checked
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value

  const orderData = {
    cart_id: cartData.cart_id,
    first_name: document.getElementById("firstName").value.trim(),
    last_name: document.getElementById("lastName").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    shipping_address: document.getElementById("address").value.trim(),
    shipping_city: document.getElementById("city").value.trim(),
    shipping_state: document.getElementById("state").value.trim(),
    shipping_pincode: document.getElementById("pincode").value.trim(),
    billing_same_as_shipping: billingSame,
    billing_address: billingSame ? "" : document.getElementById("billingAddress").value.trim(),
    billing_city: billingSame ? "" : document.getElementById("billingCity").value.trim(),
    billing_state: billingSame ? "" : document.getElementById("billingState").value.trim(),
    billing_pincode: billingSame ? "" : document.getElementById("billingPincode").value.trim(),
    payment_method: paymentMethod,
    order_notes: document.getElementById("orderNotes").value.trim(),
  }

  try {
    showLoading()

    const [success, response] = await callApi("POST", createOrderUrl, orderData, csrfToken)

    if (response.success && response.data) {
      const order = response.data

      if (paymentMethod === "razorpay" && order.razorpay_order) {
        // Initiate Razorpay payment
        initiateRazorpayPayment(order)
      } else {
        // COD success
        showToast("Order placed successfully!", "success")
        setTimeout(() => {
          window.location.href = `/order-success?order_id=${order.order_id}`
        }, 1500)
      }
    } else {
      showToast(response.error || "Failed to create order", "error")
      hideLoading()
    }
  } catch (error) {
    console.error("Error placing order:", error)
    showToast("Failed to place order. Please try again.", "error")
    hideLoading()
  }
}

function initiateRazorpayPayment(orderData) {
  const razorpayOptions = {
    key: orderData.razorpay_order.key_id,
    amount: orderData.razorpay_order.amount,
    currency: orderData.razorpay_order.currency,
    order_id: orderData.razorpay_order.id,
    name: "RefurBazar",
    description: `Order ${orderData.order_number}`,
    handler: async (response) => {
      await verifyPayment({
        order_id: orderData.order_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      })
    },
    prefill: {
      name: `${orderData.first_name} ${orderData.last_name}`,
      email: orderData.email,
      contact: orderData.phone,
    },
    theme: {
      color: "#0d6efd",
    },
    modal: {
      ondismiss: () => {
        hideLoading()
        showToast("Payment cancelled. You can complete payment later from your orders.", "info")
      },
    },
  }

  const rzp = new window.Razorpay(razorpayOptions)
  rzp.open()
}

async function verifyPayment(paymentData) {
  try {
    const [success, response] = await callApi("POST", verifyPaymentUrl, paymentData, csrfToken)

    if (response.success) {
      showToast("Payment successful!", "success")
      setTimeout(() => {
        window.location.href = `/order-success?order_id=${paymentData.order_id}`
      }, 1500)
    } else {
      showToast(response.error || "Payment verification failed", "error")
      hideLoading()
    }
  } catch (error) {
    console.error("Error verifying payment:", error)
    showToast("Payment verification failed. Please contact support.", "error")
    hideLoading()
  }
}

function validateForm() {
  const requiredFields = ["firstName", "lastName", "email", "phone", "address", "city", "state", "pincode"]

  let isValid = true

  requiredFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId)
    if (!field || !field.value.trim()) {
      if (field) field.classList.add("is-invalid")
      isValid = false
    } else {
      if (field) field.classList.remove("is-invalid")
    }
  })

  // Validate billing if not same as shipping
  const billingSame = document.getElementById("billingSameAsShipping").checked
  if (!billingSame) {
    const billingFields = ["billingAddress", "billingCity", "billingState", "billingPincode"]
    billingFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId)
      if (!field || !field.value.trim()) {
        if (field) field.classList.add("is-invalid")
        isValid = false
      } else {
        if (field) field.classList.remove("is-invalid")
      }
    })
  }

  if (!isValid) {
    showToast("Please fill in all required fields", "error")
  }

  return isValid
}

function showEmptyCart() {
  showToast("Your cart is empty. Redirecting...", "info")
  setTimeout(() => {
    window.location.href = "/cart"
  }, 2000)
}

function showLoading() {
  const btn = document.querySelector('button[onclick="placeOrder()"]')
  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...'
  }
}

function hideLoading() {
  const btn = document.querySelector('button[onclick="placeOrder()"]')
  if (btn) {
    btn.disabled = false
    btn.innerHTML = '<i class="fas fa-lock me-2"></i>Place Order'
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
