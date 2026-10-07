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
let userUrl = null
let emailVerified = false
let pendingPlaceOrder = false
let orderInFlight = false
let selectedAddressId = null

function init(csrf, cartUrl, orderUrl, verifyUrl, addrUrl, otpEndpoint, userDetailUrl) {
  csrfToken = csrf
  cartListUrl = cartUrl
  createOrderUrl = orderUrl
  verifyPaymentUrl = verifyUrl
  addressesUrl = addrUrl
  otpUrl = otpEndpoint
  userUrl = userDetailUrl

  setupEmailVerification()
  checkUserAuth()
  loadCart()
  setupEventListeners()
  setupOtpModal()
}

const GUEST_LOCKED_FIELDS = ["firstName", "lastName", "phone", "address", "city", "state", "pincode"]

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function setGuestFieldsLocked(locked) {
  GUEST_LOCKED_FIELDS.forEach((id) => {
    const field = document.getElementById(id)
    if (field) field.disabled = locked
  })
  const hint = document.getElementById("verifyEmailHint")
  if (hint) hint.style.display = locked ? "block" : "none"
}

function updateVerifyButton() {
  const emailInput = document.getElementById("email")
  const btn = document.getElementById("verifyEmailBtn")
  const badge = document.getElementById("emailVerifiedBadge")
  if (!emailInput || !btn) return

  btn.style.display = emailVerified ? "none" : "inline-block"
  if (badge) badge.style.display = emailVerified ? "inline-flex" : "none"
  btn.disabled = !isValidEmail(emailInput.value.trim())
}

function setupEmailVerification() {
  const emailInput = document.getElementById("email")
  const btn = document.getElementById("verifyEmailBtn")
  if (!emailInput || !btn) return

  setGuestFieldsLocked(true)
  updateVerifyButton()

  emailInput.addEventListener("input", () => {
    emailInput.classList.remove("is-invalid")
    updateVerifyButton()
  })
  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (!btn.disabled && !emailVerified) btn.click()
    }
  })
  btn.addEventListener("click", async () => {
    pendingPlaceOrder = false
    await sendOtpForCheckout(emailInput.value.trim())
  })

  const backdrop = document.getElementById("otpModalBackdrop")
  if (backdrop) {
    backdrop.addEventListener("click", () => {
      pendingPlaceOrder = false
      hideOtpModal()
    })
  }
}

// Marks the session as verified and fills the form from the account.
async function applyVerifiedUser(user) {
  isUserLoggedIn = true
  emailVerified = true

  const emailInput = document.getElementById("email")
  if (emailInput) {
    if (user && user.email) emailInput.value = user.email
    emailInput.readOnly = true
  }
  updateVerifyButton()

  const fill = (id, value) => {
    const field = document.getElementById(id)
    if (field && value) field.value = value
  }
  if (user) {
    fill("firstName", user.first_name)
    fill("lastName", user.last_name)
    fill("phone", user.contact_number)
  }

  setGuestFieldsLocked(false)
  await loadAddresses()
}

async function fetchCurrentUser() {
  if (!userUrl) return null
  try {
    const [success, response] = await callApi("GET", userUrl, null, csrfToken)
    if (success && response && response.success && !response.user_not_logged_in && response.data) {
      return response.data.user || null
    }
  } catch (error) {
    console.log("User not logged in")
  }
  return null
}

async function checkUserAuth() {
  const user = await fetchCurrentUser()
  if (user) {
    await applyVerifiedUser(user)
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

      // const attributes = unit.attributes.map((attr) => `${attr.value}`).join(" • ")


      const primaryAttrs = (unit.attributes || [])
        .filter(attr => attr.section === 'main' || !attr.section)
        .slice(0, 4)
        .map(attr => attr.value)
      const condition = unit.condition
        ? unit.condition.charAt(0).toUpperCase() + unit.condition.slice(1)
        : ''
      const attributes = [...primaryAttrs, condition].filter(Boolean).join(' • ')


      const imageUrl = unit.image || "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=60&h=60&fit=crop"

      const hasWarranty = !!item.has_extended_warranty
      const warrantyBadge = hasWarranty
        ? `<div class="mt-1"><span class="badge-warranty-included"><i class="fas fa-shield-alt me-1"></i>Extended Warranty · ₹${Number.parseFloat(item.warranty_price).toLocaleString("en-IN")}</span></div>`
        : ""

      return `
        <div class="order-item mb-3">
          <img src="${imageUrl}" alt="${unit.model_name}" class="img-fluid rounded me-3" style="width: 60px; height: 60px; object-fit: cover;">
          <div class="flex-grow-1">
            <h6 class="mb-1">${unit.brand_name} ${unit.model_name}</h6>
            <small class="text-muted">${attributes} • ${unit.condition}</small>
            ${warrantyBadge}
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

  // Extended warranty is opted-in per item back in the cart. Checkout only
  // reads and displays the total that resulted from those selections.
  const warrantyTotal = Number.parseFloat(data.total_warranty || 0)
  const warrantyItemCount = data.items.filter((item) => item.has_extended_warranty).length

  let subtotal = Number.parseFloat(data.total_price) + warrantyTotal
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

  // Read-only warranty summary note (reflects cart selections; edited from the cart page)
  const warrantyNote = document.getElementById("warrantySummaryNote")
  const warrantyText = document.getElementById("warrantySummaryText")
  if (warrantyNote && warrantyText) {
    if (warrantyItemCount > 0) {
      warrantyNote.style.display = "flex"
      warrantyText.textContent = `${warrantyItemCount} item${warrantyItemCount !== 1 ? "s" : ""} covered · +₹${warrantyTotal.toLocaleString("en-IN")}`
    } else {
      warrantyNote.style.display = "none"
    }
  }
}

// Setup breakdown toggle functionality
document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.getElementById('toggleBreakdown')
  const breakdownDetails = document.getElementById('breakdownDetails')

  if (toggleBtn && breakdownDetails) {
    toggleBtn.addEventListener('click', function (e) {
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
    window.setCartBadge ? window.setCartBadge(data.items.length) : (cartBadge.textContent = data.items.length)
  }
}

async function loadAddresses() {
  if (!isUserLoggedIn) return

  try {
    const [success, response] = await callApi("GET", addressesUrl, null, csrfToken)

    if (success && response && response.success && response.data) {
      const list = Array.isArray(response.data) ? response.data : response.data.addresses || []
      // Default address first, then newest.
      userAddresses = [...list].sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default))
      renderSavedAddresses()
    }
  } catch (error) {
    console.error("Error loading addresses:", error)
  }
}

function renderSavedAddresses() {
  const container = document.getElementById("savedAddressesContainer")
  const primaryCheckbox = document.getElementById("setasprimaryaddress")

  if (!userAddresses || userAddresses.length === 0) {
    container.innerHTML = ""
    selectedAddressId = null
    if (primaryCheckbox) primaryCheckbox.checked = true
    return
  }
  // A returning customer only changes the primary address on purpose.
  if (primaryCheckbox) primaryCheckbox.checked = false

  container.innerHTML = `
    <div class="checkout-section">
      <h4>Saved Addresses</h4>
      <div class="saved-address-grid" role="radiogroup" aria-label="Saved addresses">
        ${userAddresses
          .map(
            (address, index) => `
          <label class="saved-address ${index === 0 ? "is-selected" : ""}" data-address-index="${index}" for="address${index}">
            <input class="saved-address-input" type="radio" name="savedAddress" id="address${index}" value="${index}" ${index === 0 ? "checked" : ""}>
            <span class="saved-address-radio" aria-hidden="true"></span>
            <span class="saved-address-body">
              <span class="saved-address-top">
                <span class="saved-address-name">${escapeHtml(address.address_name || "Address " + (index + 1))}</span>
                ${address.is_default ? '<span class="saved-address-badge">Primary</span>' : ""}
              </span>
              <span class="saved-address-line">${escapeHtml(address.address_line)}</span>
              <span class="saved-address-line">${escapeHtml(address.city)}, ${escapeHtml(address.state)} - ${escapeHtml(address.pincode)}</span>
            </span>
          </label>
        `,
          )
          .join("")}
        <label class="saved-address saved-address-new" data-address-index="new" for="addressNew">
          <input class="saved-address-input" type="radio" name="savedAddress" id="addressNew" value="new">
          <span class="saved-address-radio" aria-hidden="true"></span>
          <span class="saved-address-body saved-address-body-center">
            <i class="fas fa-plus-circle"></i>
            <span class="saved-address-name">Add a new address</span>
          </span>
        </label>
      </div>
    </div>
  `

  container.querySelectorAll(".saved-address-input").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return
      if (radio.value === "new") selectNewAddress()
      else selectAddress(Number(radio.value))
    })
  })

  fillAddressFields(userAddresses[0])
  selectedAddressId = userAddresses[0].id
}

function markSelectedAddressCard(target) {
  document.querySelectorAll(".saved-address").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.addressIndex === String(target))
  })
}

function selectAddress(index) {
  markSelectedAddressCard(index)

  fillAddressFields(userAddresses[index])
  selectedAddressId = userAddresses[index].id

  const radio = document.getElementById(`address${index}`)
  if (radio) radio.checked = true
}

function selectNewAddress() {
  markSelectedAddressCard("new")

  ;["address", "city", "state", "pincode"].forEach((id) => {
    document.getElementById(id).value = ""
  })
  selectedAddressId = null
  const primaryCheckbox = document.getElementById("setasprimaryaddress")
  if (primaryCheckbox) primaryCheckbox.checked = false

  document.getElementById("addressNew").checked = true
  document.getElementById("address").focus()
}

function fillAddressFields(address) {
  document.getElementById("address").value = address.address_line || ""
  document.getElementById("city").value = address.city || ""
  document.getElementById("state").value = address.state || ""
  document.getElementById("pincode").value = address.pincode || ""
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])
}

function formatApiError(error, fallback) {
  if (!error) return fallback
  if (typeof error === "string") return error
  if (typeof error === "object") {
    const parts = Object.values(error).flat().map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
    if (parts.length) return parts.join(" ")
  }
  return fallback
}

// The shipping fields still equal the saved address the customer picked.
function selectedAddressUnchanged() {
  const saved = userAddresses.find((a) => a.id === selectedAddressId)
  if (!saved) return false
  const same = (id, value) => document.getElementById(id).value.trim() === String(value || "").trim()
  return (
    same("address", saved.address_line) && same("city", saved.city) && same("state", saved.state) && same("pincode", saved.pincode)
  )
}

function setupEventListeners() {
  const billingSameCheckbox = document.getElementById("billingSameAsShipping")
  if (billingSameCheckbox) {
    billingSameCheckbox.addEventListener("change", function () {
      const billingSection = document.getElementById("billingAddressSection")
      billingSection.style.display = this.checked ? "none" : "block"
    })
  }

  const gstToggle = document.getElementById("gstToggle")
  if (gstToggle) {
    gstToggle.addEventListener("change", function () {

      if (gstToggle && gstToggle.checked) {
        document.getElementById("enterGST").style.display = '';
      }
      else {
        document.getElementById("enterGST").style.display = 'none';
      }
    })
  }
}

async function placeOrder() {
  if (orderInFlight) return

  if (!isUserLoggedIn || !emailVerified) {
    const emailInput = document.getElementById("email")
    const email = emailInput.value.trim()
    if (!isValidEmail(email)) {
      emailInput.classList.add("is-invalid")
      showToast("Please enter your email and verify it to place your order", "error")
      emailInput.focus()
      return
    }
    pendingPlaceOrder = true
    showToast("Please verify your email to continue", "info")
    await sendOtpForCheckout(email)
    return
  }

  if (!validateForm()) {
    return
  }

  await proceedWithOrder()
}

async function sendOtpForCheckout(email) {
  const verifyBtn = document.getElementById("verifyEmailBtn")
  if (verifyBtn) verifyBtn.disabled = true
  try {
    const requestData = { email: email, role: "customer" }
    const [success, response] = await callApi("POST", otpUrl, requestData, csrfToken)

    if (success && response && response.success) {
      currentOtpId = response.data.otp_id

      showOtpModal(email)
      startResendTimer()
      showToast("Verification code sent to your email", "success")
    } else {
      pendingPlaceOrder = false
      showToast(formatApiError(response && response.error, "Failed to send OTP. Please try again."), "error")
    }
  } catch (error) {
    console.error("Error sending OTP:", error)
    pendingPlaceOrder = false
    showToast("Failed to send OTP. Please try again.", "error")
  } finally {
    updateVerifyButton()
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

  try {
    const [success, response] = await callApi("PUT", `${otpUrl}${currentOtpId}/`, { otp: otp, role: "customer" }, csrfToken)

    setButtonLoading(verifyBtn, false)

    if (success && response && response.success && response.data && response.data.otp_verified) {
      showOtpSuccess("Email verified!")
      // Django rotates the CSRF token when the session logs in.
      csrfToken = getCSRFToken() || csrfToken

      const continueOrder = pendingPlaceOrder
      pendingPlaceOrder = false

      setTimeout(async () => {
        hideOtpModal()

        const user = await fetchCurrentUser()
        await applyVerifiedUser(user || { email: document.getElementById("email").value.trim() })

        if (!continueOrder) {
          showToast(
            userAddresses.length || (user && user.first_name)
              ? "Email verified. We filled in your saved details."
              : "Email verified. Please add your delivery details.",
            "success",
          )
          return
        }
        if (validateForm()) {
          await proceedWithOrder()
        } else {
          showToast("Email verified. Please complete the highlighted details and place your order.", "info")
        }
      }, 700)
    } else {
      showOtpError((response && response.data && response.data.message) || formatApiError(response && response.error, "Invalid OTP. Please try again."))
      clearOtpInputs()
      document.querySelector(".otp-input").focus()
    }
  } catch (error) {
    setButtonLoading(verifyBtn, false)
    console.error("Error verifying OTP:", error)
    showOtpError("Failed to verify OTP. Please try again.")
    clearOtpInputs()
    document.querySelector(".otp-input").focus()
  }
}

async function proceedWithOrder() {
  if (orderInFlight) return
  csrfToken = getCSRFToken() || csrfToken
  const billingSame = document.getElementById("billingSameAsShipping").checked
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value
  const value = (id) => document.getElementById(id).value.trim()

  const orderData = {
    cart_id: cartData.cart_id,
    first_name: value("firstName"),
    last_name: value("lastName"),
    email: value("email"),
    phone: value("phone"),
    shipping_address: value("address"),
    shipping_city: value("city"),
    shipping_state: value("state"),
    shipping_pincode: value("pincode"),
    shipping_address_id: selectedAddressUnchanged() ? selectedAddressId : null,
    different_billing_address: !billingSame,
    billing_address: billingSame ? "" : value("billingAddress"),
    billing_city: billingSame ? "" : value("billingCity"),
    billing_state: billingSame ? "" : value("billingState"),
    billing_pincode: billingSame ? "" : value("billingPincode"),
    payment_method: paymentMethod,
    order_note: value("orderNotes"),
    save_address: true,
    set_as_primary: document.getElementById("setasprimaryaddress").checked,
    // Extended warranty is derived server-side from each cart item's
    // has_extended_warranty flag — nothing to send here.
  }

  orderInFlight = true
  showLoading()

  try {
    const [success, response] = await callApi("POST", createOrderUrl, orderData, csrfToken)

    if (response && response.user_not_logged_in) {
      // Session expired mid-checkout: verify again, then continue.
      isUserLoggedIn = false
      emailVerified = false
      document.getElementById("email").readOnly = false
      pendingPlaceOrder = true
      orderInFlight = false
      hideLoading()
      showToast("Your session expired. Please verify your email again.", "info")
      await sendOtpForCheckout(orderData.email)
      return
    }

    if (response && response.success && response.data) {
      const order = response.data
      // The server has emptied the cart; reflect that in the navbar straight away.
      document.querySelectorAll("#cartCount, .cart-count").forEach((badge) => {
        badge.textContent = "0"
        badge.style.display = "none"
      })

      if (paymentMethod === "razorpay" && order.razorpay_order) {
        initiateRazorpayPayment(order)
      } else {
        showToast("Order placed successfully!", "success")
        setTimeout(() => {
          window.location.href = `/order-success/?order_id=${order.order_id}`
        }, 1500)
      }
    } else {
      showToast(formatApiError(response && response.error, "Failed to create order"), "error")
      orderInFlight = false
      hideLoading()
      // Items may have been sold in the meantime: refresh the cart view.
      if (response && response.error && /no longer available|empty/i.test(String(response.error))) {
        loadCart()
      }
    }
  } catch (error) {
    console.error("Error placing order:", error)
    showToast("Failed to place order. Please try again.", "error")
    orderInFlight = false
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
      const email = document.getElementById("email").value.trim()
      await sendOtpForCheckout(email)
    }
  })
}

function showOtpModal(email) {
  document.getElementById("otpPhoneDisplay").textContent = email

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
  const orderDetailUrl = `/order-detail/?order_id=${orderData.order_id}`

  const razorpayOptions = {
    key: orderData.razorpay_order.key_id,
    amount: orderData.razorpay_order.amount,
    currency: orderData.razorpay_order.currency,
    order_id: orderData.razorpay_order.id,
    name: "Recarvit",
    description: `Order ${orderData.order_number}`,
    // Redirect mode: the whole page goes to the bank / UPI step and then back to our
    // server, which verifies the signature. No popup window and no JS handler to lose.
    callback_url: `${window.location.origin}/order-api/payment-callback/?order_id=${encodeURIComponent(orderData.order_id)}`,
    redirect: true,
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
        orderInFlight = false
        hideLoading()
        showToast("Payment not completed. Your order is saved - you can pay from your order page.", "info")
        setTimeout(() => {
          window.location.href = orderDetailUrl
        }, 2500)
      },
    },
  }

  if (typeof window.Razorpay !== "function") {
    showToast("Payment gateway failed to load. Opening your order so you can pay from there.", "error")
    orderInFlight = false
    hideLoading()
    setTimeout(() => {
      window.location.href = orderDetailUrl
    }, 2500)
    return
  }

  const rzp = new window.Razorpay(razorpayOptions)
  rzp.on("payment.failed", (failure) => {
    const reason = failure && failure.error && failure.error.description
    console.error("Razorpay payment failed:", failure && failure.error)
    showToast(reason || "Payment failed. You can retry in the payment window.", "error")
  })
  rzp.open()
}

function validateForm() {
  const requiredFields = ["firstName", "lastName", "email", "phone", "address", "city", "state", "pincode"]

  let isValid = true
  let message = "Please fill in all required fields"

  requiredFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId)
    if (!field || !field.value.trim()) {
      if (field) field.classList.add("is-invalid")
      isValid = false
    } else {
      if (field) field.classList.remove("is-invalid")
    }
  })

  const markInvalid = (id, text) => {
    const field = document.getElementById(id)
    if (field && field.value.trim()) {
      field.classList.add("is-invalid")
      isValid = false
      message = text
    }
  }

  const digits = document.getElementById("phone").value.replace(/\D/g, "")
  if (digits && !/^(91)?[6-9]\d{9}$/.test(digits.replace(/^0+/, ""))) {
    markInvalid("phone", "Please enter a valid 10-digit phone number")
  }
  if (!/^\d{6}$/.test(document.getElementById("pincode").value.trim())) {
    markInvalid("pincode", "Please enter a valid 6-digit pincode")
  }

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
    if (!/^\d{6}$/.test(document.getElementById("billingPincode").value.trim())) {
      markInvalid("billingPincode", "Please enter a valid 6-digit billing pincode")
    }
  }

  if (!isValid) {
    showToast(message, "error")
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
