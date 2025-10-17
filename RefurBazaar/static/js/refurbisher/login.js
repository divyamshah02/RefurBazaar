// Login Page State
let otp_url = null
let csrf_token = null
let currentOtpId = null
let resendTimerInterval = null
let currentMobile = null

// Initialize Login Page
async function initLogin(otp_url_param, csrf_token_param) {
  otp_url = otp_url_param
  csrf_token = csrf_token_param

  setupPhoneForm()
  setupOtpForm()
  setupOtpInputs()
  setupBackButton()
  setupResendOtp()
}

// Setup Phone Form
function setupPhoneForm() {
  const phoneForm = document.getElementById("phoneForm")
  const mobileInput = document.getElementById("mobileNumber")

  // Only allow numbers in mobile input
  mobileInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "")
  })

  phoneForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    await sendOtp()
  })
}

// Setup OTP Form
function setupOtpForm() {
  const otpForm = document.getElementById("otpForm")

  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    await verifyOtp()
  })
}

// Setup OTP Inputs with auto-focus and navigation
function setupOtpInputs() {
  const otpInputs = document.querySelectorAll(".otp-input")

  otpInputs.forEach((input, index) => {
    // Only allow numbers
    input.addEventListener("input", (e) => {
      const value = e.target.value.replace(/[^0-9]/g, "")
      e.target.value = value

      if (value.length === 1) {
        e.target.classList.add("filled")
        // Move to next input
        if (index < otpInputs.length - 1) {
          otpInputs[index + 1].focus()
        }
      } else {
        e.target.classList.remove("filled")
      }
    })

    // Handle backspace
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        otpInputs[index - 1].focus()
        otpInputs[index - 1].value = ""
        otpInputs[index - 1].classList.remove("filled")
      }
    })

    // Handle paste
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

// Setup Back Button
function setupBackButton() {
  const backButton = document.getElementById("backToPhone")

  backButton.addEventListener("click", (e) => {
    e.preventDefault()
    showPhoneSection()
    clearOtpInputs()
    hideError()
    hideSuccess()
  })
}

// Setup Resend OTP
function setupResendOtp() {
  const resendLink = document.getElementById("resendOtpLink")

  resendLink.addEventListener("click", async (e) => {
    e.preventDefault()
    if (!resendLink.classList.contains("disabled")) {
      await sendOtp(true)
    }
  })
}

// Send OTP
async function sendOtp(isResend = false) {
  let mobile
  if (isResend && currentMobile) {
    mobile = currentMobile
  } else {
    const mobileInput = document.getElementById("mobileNumber")
    mobile = mobileInput.value.trim()
  }

  if (!mobile || mobile.length !== 10) {
    showError("Please enter a valid 10-digit mobile number")
    return
  }

  currentMobile = mobile

  const sendOtpBtn = document.getElementById("sendOtpBtn")
  setButtonLoading(sendOtpBtn, true)
  hideError()
  hideSuccess()

  const requestData = {
    mobile: `${mobile}`,
  }

  const [success, response] = await callApi("POST", otp_url, requestData, csrf_token)

  setButtonLoading(sendOtpBtn, false)

  if (success && response.success) {
    currentOtpId = response.data.otp_id

    if (isResend) {
      showSuccess("OTP resent successfully!")
    } else {
      showSuccess("OTP sent successfully!")
    }

    // Auto-fill OTP for testing if provided
    if (response.data.otp) {
      fillOtpForTesting(response.data.otp)
    }

    showOtpSection(mobile)
    startResendTimer()
  } else {
    showError(response.error || "Failed to send OTP. Please try again.")
  }
}

// Verify OTP
async function verifyOtp() {
  const otpInputs = document.querySelectorAll(".otp-input")
  const otp = Array.from(otpInputs)
    .map((input) => input.value)
    .join("")

  if (otp.length !== 6) {
    showError("Please enter the complete 6-digit OTP")
    return
  }

  if (!currentOtpId) {
    showError("Invalid session. Please request a new OTP.")
    return
  }

  const verifyOtpBtn = document.getElementById("verifyOtpBtn")
  setButtonLoading(verifyOtpBtn, true)
  hideError()
  hideSuccess()

  const requestData = {
    otp: otp,
    role: "refurbisher",
  }

  const [success, response] = await callApi("PUT", `${otp_url}${currentOtpId}/`, requestData, csrf_token)

  setButtonLoading(verifyOtpBtn, false)

  if (success && response.success) {
    const data = response.data

    if (data.otp_verified) {
      showSuccess("OTP verified successfully! Redirecting...")

      setTimeout(() => {
        const user_id = data.user_id
        // Redirect to dashboard or profile page
        window.location.href = `/refurbisher-profile/`
      }, 1500)
    } else {
      showError(data.message || "OTP verification failed")
      clearOtpInputs()
      document.querySelector(".otp-input").focus()
    }
  } else {
    showError(response.error || "Failed to verify OTP. Please try again.")
    clearOtpInputs()
    document.querySelector(".otp-input").focus()
  }
}

// UI Helper Functions
function showPhoneSection() {
  document.getElementById("phoneSection").style.display = "block"
  document.getElementById("otpSection").classList.remove("active")
  stopResendTimer()
}

function showOtpSection(mobile) {
  document.getElementById("phoneSection").style.display = "none"
  document.getElementById("otpSection").classList.add("active")
  const formattedMobile = `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`
  document.getElementById("displayMobile").textContent = formattedMobile

  setTimeout(() => {
    document.querySelector(".otp-input").focus()
  }, 300)
}

function clearOtpInputs() {
  const otpInputs = document.querySelectorAll(".otp-input")
  otpInputs.forEach((input) => {
    input.value = ""
    input.classList.remove("filled")
  })
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

function showError(message) {
  const errorDiv = document.getElementById("errorMessage")
  const errorText = document.getElementById("errorText")
  errorText.textContent = message
  errorDiv.classList.add("show")

  setTimeout(() => {
    hideError()
  }, 5000)
}

function hideError() {
  const errorDiv = document.getElementById("errorMessage")
  errorDiv.classList.remove("show")
}

function showSuccess(message) {
  const successDiv = document.getElementById("successMessage")
  const successText = document.getElementById("successText")
  successText.textContent = message
  successDiv.classList.add("show")

  setTimeout(() => {
    hideSuccess()
  }, 3000)
}

function hideSuccess() {
  const successDiv = document.getElementById("successMessage")
  successDiv.classList.remove("show")
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

function fillOtpForTesting(otp) {
  if (otp && otp.length === 6) {
    setTimeout(() => {
      const otpInputs = document.querySelectorAll(".otp-input")
      otpInputs.forEach((input, index) => {
        input.value = otp[index]
        input.classList.add("filled")
      })
      console.log("Auto-filled OTP for testing:", otp)
    }, 500)
  }
}
