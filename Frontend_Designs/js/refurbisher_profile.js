// Profile management functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeProfile()
  setupFormValidation()
  setupFileUploads()
})

function initializeProfile() {
  calculateProfileCompletion()
  setupAddressSync()
}

function calculateProfileCompletion() {
  // Calculate profile completion percentage
  let completedSections = 0
  const totalSections = 3

  // Check personal information
  const personalFields = ['input[type="text"]', 'input[type="email"]', 'input[type="tel"]']
  let personalComplete = true
  personalFields.forEach((selector) => {
    const fields = document.querySelectorAll(selector)
    fields.forEach((field) => {
      if (!field.value.trim()) {
        personalComplete = false
      }
    })
  })

  if (personalComplete) completedSections++

  // Check business details
  const businessSelect = document.querySelector("select[required]")
  const gstInput = document.querySelector('input[placeholder*="GST"]')
  if (businessSelect && businessSelect.value && gstInput && gstInput.value) {
    completedSections++
  }

  // Check document uploads
  const fileInputs = document.querySelectorAll('input[type="file"]')
  let documentsUploaded = 0
  fileInputs.forEach((input) => {
    if (input.files && input.files.length > 0) {
      documentsUploaded++
    }
  })

  if (documentsUploaded >= 2) {
    // At least 2 required documents
    completedSections++
  }

  const completionPercentage = Math.round((completedSections / totalSections) * 100)

  // Update progress bar
  const progressFill = document.querySelector(".progress-fill")
  if (progressFill) {
    progressFill.style.width = completionPercentage + "%"
  }

  // Update completion text
  const completionText = document.querySelector(".card-header .text-muted")
  if (completionText) {
    completionText.textContent = completionPercentage + "% Complete"
  }

  // Update completion items
  updateCompletionItems(personalComplete, completedSections >= 2, completedSections >= 3)
}

function updateCompletionItems(personal, business, documents) {
  const items = document.querySelectorAll(".completion-item")

  if (items[0]) {
    const icon = items[0].querySelector("i")
    if (personal) {
      icon.className = "fas fa-check-circle text-success me-2"
    } else {
      icon.className = "fas fa-exclamation-circle text-warning me-2"
    }
  }

  if (items[1]) {
    const icon = items[1].querySelector("i")
    if (business) {
      icon.className = "fas fa-check-circle text-success me-2"
    } else {
      icon.className = "fas fa-exclamation-circle text-warning me-2"
    }
  }

  if (items[2]) {
    const icon = items[2].querySelector("i")
    if (documents) {
      icon.className = "fas fa-check-circle text-success me-2"
    } else {
      icon.className = "fas fa-times-circle text-danger me-2"
    }
  }
}

function setupFormValidation() {
  const forms = document.querySelectorAll("form")

  forms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      e.preventDefault()

      if (validateForm(this)) {
        submitForm(this)
      }
    })
  })
}

function validateForm(form) {
  const requiredFields = form.querySelectorAll("[required]")
  let isValid = true

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      field.classList.add("is-invalid")
      isValid = false
    } else {
      field.classList.remove("is-invalid")
    }
  })

  // Email validation
  const emailFields = form.querySelectorAll('input[type="email"]')
  emailFields.forEach((field) => {
    if (field.value && !isValidEmail(field.value)) {
      field.classList.add("is-invalid")
      isValid = false
    }
  })

  // Phone validation
  const phoneFields = form.querySelectorAll('input[type="tel"]')
  phoneFields.forEach((field) => {
    if (field.value && !isValidPhone(field.value)) {
      field.classList.add("is-invalid")
      isValid = false
    }
  })

  return isValid
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPhone(phone) {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ""))
}

function submitForm(form) {
  const formData = new FormData(form)
  const formType = getFormType(form)

  console.log(`Submitting ${formType} form:`, Object.fromEntries(formData))

  // Simulate API call
  setTimeout(() => {
    showNotification(`${formType} updated successfully`, "success")
    calculateProfileCompletion()
  }, 1000)
}

function getFormType(form) {
  if (form.querySelector('input[type="email"]')) {
    return "Personal Information"
  } else if (form.querySelector("select")) {
    return "Business Details"
  } else {
    return "Address Information"
  }
}

function setupAddressSync() {
  const sameAsWarehouseCheckbox = document.getElementById("sameAsWarehouse")

  if (sameAsWarehouseCheckbox) {
    sameAsWarehouseCheckbox.addEventListener("change", function () {
      const warehouseInputs = document.querySelectorAll('input[placeholder*="Street"], input[placeholder*="Apartment"]')
      const returnInputs = document.querySelectorAll(
        'input[placeholder*="Street"]:not([placeholder*="Return"]), input[placeholder*="Apartment"]:not([placeholder*="Return"])',
      )

      if (this.checked) {
        // Copy warehouse address to return address
        warehouseInputs.forEach((input, index) => {
          if (returnInputs[index]) {
            returnInputs[index].value = input.value
            returnInputs[index].disabled = true
          }
        })
      } else {
        // Enable return address fields
        returnInputs.forEach((input) => {
          input.disabled = false
        })
      }
    })
  }
}

function setupFileUploads() {
  const fileInputs = document.querySelectorAll('input[type="file"]')

  fileInputs.forEach((input) => {
    input.addEventListener("change", function () {
      handleFileUpload(this)
    })
  })
}

function handleFileUpload(input) {
  const file = input.files[0]
  if (!file) return

  // Validate file type
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"]
  if (!allowedTypes.includes(file.type)) {
    alert("Please upload only PDF, JPG, or PNG files")
    input.value = ""
    return
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("File size should not exceed 5MB")
    input.value = ""
    return
  }

  // Show upload progress
  const uploadCard = input.closest(".upload-card")
  if (uploadCard) {
    const badge = uploadCard.querySelector(".badge")
    if (badge) {
      badge.className = "badge bg-success"
      badge.textContent = "Uploaded"
    }
  }

  console.log("File uploaded:", file.name)
  calculateProfileCompletion()
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
  notification.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
  notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

  document.body.appendChild(notification)

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 5000)
}
