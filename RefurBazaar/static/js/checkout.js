let csrfToken = null
let cartListUrl = null
let createOrderUrl = null
let verifyPaymentUrl = null
let addressesUrl = null
let otpUrl = null
let cartData = null
let userAddresses = []
let isUserLoggedIn = false
let currentOtpId = null
let resendTimerInterval = null

function init(csrf, cartUrl, orderUrl, verifyUrl, addrUrl, otpEndpoint) {
  csrfToken = csrf
  cartListUrl = cartUrl
  createOrderUrl = orderUrl
  verifyPaymentUrl = verifyUrl
  addressesUrl = addrUrl
  otpUrl = otpEndpoint

  checkUserAuth()
  loadCart()
  setupEventListeners()
  setupOtpModal()
}

async function checkUserAuth() {
  try {
    const [success, response] = await callApi("GET", addressesUrl, null, csrfToken)

    if (response.success && !response.user_not_logged_in) {
      isUserLoggedIn = true
      loadAddresses()
    } else {
      isUserLoggedIn = false
    }
  } catch (error) {
    console.log("[v0] User not logged in")
    isUserLoggedIn = false
  }
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
    console.error("[v0] Error loading cart:", error)
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
  const shipping = 0
  const total_before_tax = Math.round((subtotal * 100) / 118)
  const tax = Math.round(subtotal - total_before_tax)
  const total = total_before_tax + shipping + tax

  // Update summary display
  document.getElementById("summarySubtotal").textContent = `₹${total_before_tax.toLocaleString("en-IN")}`
  document.getElementById("summaryShipping").textContent = `₹${shipping.toLocaleString("en-IN")}`
  document.getElementById("summaryTax").textContent = `₹${tax.toLocaleString("en-IN")}`
  document.getElementById("summaryTotal").textContent = `₹${total.toLocaleString("en-IN")}`

  // Update breakdown display
  document.getElementById("breakdownSubtotal").textContent = `₹${total_before_tax.toLocaleString("en-IN")}`
  document.getElementById("breakdownShipping").textContent = `₹${shipping.toLocaleString("en-IN")}`
  document.getElementById("breakdownTax").textContent = `₹${tax.toLocaleString("en-IN")}`
  document.getElementById("breakdownTotal").textContent = `₹${total.toLocaleString("en-IN")}`
}

// Setup breakdown toggle functionality
document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleBreakdown')
  const breakdownDetails = document.getElementById('breakdownDetails')

  if (toggleBtn && breakdownDetails) {
    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault()
      if (breakdownDetails.style.display === 'none') {
        breakdownDetails.style.display = 'block'
        toggleBtn.classList.add('active')
      } else {
        breakdownDetails.style.display = 'none'
        toggleBtn.classList.remove('active')
      }
    })
  }
})

function updateCartBadge(data) {
  const cartBadge = document.getElementById("cartCount")
  if (cartBadge && data.items) {
    cartBadge.textContent = data.items.length
  }
}

async function loadAddresses() {
  if (!isUserLoggedIn) return

  try {
    const [success, response] = await callApi("GET", addressesUrl, null, csrfToken)

    if (response.success && response.data && response.data.addresses) {
      userAddresses = response.data.addresses
      renderSavedAddresses()
    }
  } catch (error) {
    console.error("[v0] Error loading addresses:", error)
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
  document.querySelectorAll(".address-card").forEach((card) => card.classList.remove("border-primary"))
  event.currentTarget.classList.add("border-primary")

  fillAddressFields(userAddresses[index])

  document.getElementById(`address${index}`).checked = true
}

function selectNewAddress() {
  document.querySelectorAll(".address-card").forEach((card) => card.classList.remove("border-primary"))
  event.currentTarget.classList.add("border-primary")

  document.getElementById("address").value = ""
  document.getElementById("city").value = ""
  document.getElementById("state").value = ""
  document.getElementById("pincode").value = ""

  document.getElementById("addressNew").checked = true
}

function fillAddressFields(address) {
  document.getElementById("address").value = address.address_line || ""
  document.getElementById("city").value = address.city || ""
  document.getElementById("state").value = address.state || ""
  document.getElementById("pincode").value = address.pincode || ""
}

function setupEventListeners() {
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

  if (!isUserLoggedIn) {
    const phone = document.getElementById("phone").value.trim()
    if (!phone || phone.length !== 10) {
      showToast("Please enter a valid 10-digit phone number", "error")
      return
    }
    await sendOtpForCheckout(phone)
    return
  }

  await proceedWithOrder()
}

async function sendOtpForCheckout(mobile) {
  try {
    const requestData = { mobile: mobile }
    const [success, response] = await callApi("POST", otpUrl, requestData, csrfToken)

    if (success && response.success) {
      currentOtpId = response.data.otp_id

      if (response.data.otp) {
        console.log("[v0] OTP for testing:", response.data.otp)
        setTimeout(() => {
          fillOtpForTesting(response.data.otp)
        }, 500)
      }

      showOtpModal(mobile)
      startResendTimer()
      showToast("OTP sent successfully!", "success")
    } else {
      showToast(response.error || "Failed to send OTP. Please try again.", "error")
    }
  } catch (error) {
    console.error("[v0] Error sending OTP:", error)
    showToast("Failed to send OTP. Please try again.", "error")
  }
}

function getCSRFToken() {
  const name = "csrftoken"
  const cookies = document.cookie.split(";")

  for (let cookie of cookies) {
    cookie = cookie.trim()
    if (cookie.startsWith(name + "=")) {
      return decodeURIComponent(cookie.substring(name.length + 1))
    }
  }
  return null
}

async function verifyOtpAndPlaceOrder() {
  const otpInputs = document.querySelectorAll(".otp-input")
  const otp = Array.from(otpInputs)
    .map((input) => input.value)
    .join("")

  if (otp.length !== 6) {
    showOtpError("Please enter the complete 6-digit OTP")
    return
  }

  if (!currentOtpId) {
    showOtpError("Invalid session. Please request a new OTP.")
    return
  }

  const verifyBtn = document.getElementById("verifyOtpBtn")
  setButtonLoading(verifyBtn, true)
  hideOtpError()
  hideOtpSuccess()

  const requestData = {
    otp: otp,
    role: "customer",
  }

  try {
    const [success, response] = await callApi("PUT", `${otpUrl}${currentOtpId}/`, requestData, csrfToken)

    setButtonLoading(verifyBtn, false)

    if (success && response.success && response.data.otp_verified) {
      isUserLoggedIn = true
      showOtpSuccess("OTP verified successfully!")
      csrfToken = getCSRFToken()
      setTimeout(async () => {
        hideOtpModal()
        await proceedWithOrder()
      }, 1000)
    } else {
      showOtpError(response.data?.message || "Invalid OTP. Please try again.")
      clearOtpInputs()
      document.querySelector(".otp-input").focus()
    }
  } catch (error) {
    setButtonLoading(verifyBtn, false)
    console.error("[v0] Error verifying OTP:", error)
    showOtpError("Failed to verify OTP. Please try again.")
    clearOtpInputs()
    document.querySelector(".otp-input").focus()
  }
}

async function proceedWithOrder() {
  csrfToken = getCSRFToken()
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
        initiateRazorpayPayment(order)
      } else {
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
    console.error("[v0] Error placing order:", error)
    showToast("Failed to place order. Please try again.", "error")
    hideLoading()
  }
}

function setupOtpModal() {
  setupOtpInputs()
  setupOtpForm()
  setupResendOtp()
}

function setupOtpInputs() {
  const otpInputs = document.querySelectorAll(".otp-input")

  otpInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      const value = e.target.value.replace(/[^0-9]/g, "")
      e.target.value = value

      if (value.length === 1) {
        e.target.classList.add("filled")
        if (index < otpInputs.length - 1) {
          otpInputs[index + 1].focus()
        }
      } else {
        e.target.classList.remove("filled")
      }
    })

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        otpInputs[index - 1].focus()
        otpInputs[index - 1].value = ""
        otpInputs[index - 1].classList.remove("filled")
      }
    })

    input.addEventListener("paste", (e) => {
      e.preventDefault()
      const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "")

      if (pastedData.length === 6) {
        otpInputs.forEach((inp, idx) => {
          inp.value = pastedData[idx] || ""
          if (pastedData[idx]) {
            inp.classList.add("filled")
          }
        })
        otpInputs[5].focus()
      }
    })
  })
}

function setupOtpForm() {
  const otpForm = document.getElementById("otpVerificationForm")
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    await verifyOtpAndPlaceOrder()
  })
}

function setupResendOtp() {
  const resendLink = document.getElementById("resendOtpLink")
  resendLink.addEventListener("click", async (e) => {
    e.preventDefault()
    if (!resendLink.classList.contains("disabled")) {
      const phone = document.getElementById("phone").value.trim()
      await sendOtpForCheckout(phone)
    }
  })
}

function showOtpModal(mobile) {
  const formattedMobile = `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`
  document.getElementById("otpPhoneDisplay").textContent = formattedMobile

  document.getElementById("otpModalBackdrop").classList.add("active")
  document.getElementById("otpModal").classList.add("active")

  clearOtpInputs()
  setTimeout(() => {
    document.querySelector(".otp-input").focus()
  }, 300)
}

function hideOtpModal() {
  document.getElementById("otpModalBackdrop").classList.remove("active")
  document.getElementById("otpModal").classList.remove("active")
  clearOtpInputs()
  stopResendTimer()
}

function clearOtpInputs() {
  const otpInputs = document.querySelectorAll(".otp-input")
  otpInputs.forEach((input) => {
    input.value = ""
    input.classList.remove("filled")
  })
}

function fillOtpForTesting(otp) {
  if (otp && otp.length === 6) {
    const otpInputs = document.querySelectorAll(".otp-input")
    otpInputs.forEach((input, index) => {
      input.value = otp[index]
      input.classList.add("filled")
    })
  }
}

function startResendTimer() {
  const resendLink = document.getElementById("resendOtpLink")
  const resendTimer = document.getElementById("resendTimer")
  const timerCount = document.getElementById("timerCount")

  let timeLeft = 30

  resendLink.classList.add("disabled")
  resendTimer.style.display = "inline"

  stopResendTimer()

  resendTimerInterval = setInterval(() => {
    timeLeft--
    timerCount.textContent = timeLeft

    if (timeLeft <= 0) {
      stopResendTimer()
      resendLink.classList.remove("disabled")
      resendTimer.style.display = "none"
    }
  }, 1000)
}

function stopResendTimer() {
  if (resendTimerInterval) {
    clearInterval(resendTimerInterval)
    resendTimerInterval = null
  }
}

function showOtpError(message) {
  const errorDiv = document.getElementById("otpErrorMessage")
  errorDiv.textContent = message
  errorDiv.classList.remove("d-none")

  setTimeout(() => {
    hideOtpError()
  }, 5000)
}

function hideOtpError() {
  const errorDiv = document.getElementById("otpErrorMessage")
  errorDiv.classList.add("d-none")
}

function showOtpSuccess(message) {
  const successDiv = document.getElementById("otpSuccessMessage")
  successDiv.textContent = message
  successDiv.classList.remove("d-none")
}

function hideOtpSuccess() {
  const successDiv = document.getElementById("otpSuccessMessage")
  successDiv.classList.add("d-none")
}

function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add("btn-loading")
    button.disabled = true
    const loader = document.createElement("span")
    loader.className = "loader"
    button.appendChild(loader)
  } else {
    button.classList.remove("btn-loading")
    button.disabled = false
    const loader = button.querySelector(".loader")
    if (loader) {
      loader.remove()
    }
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
    console.error("[v0] Error verifying payment:", error)
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
