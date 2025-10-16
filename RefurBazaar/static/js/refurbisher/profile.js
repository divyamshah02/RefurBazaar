// Global variables
let profileData = null
let companyProfileData = null
let profile_url = null
let csrf_token = null


// Initialize Refurbisher Profile Page
async function initRefurbisherProfile(profile_url_param, csrf_token_param) {
  profile_url = profile_url_param
  csrf_token = csrf_token_param

  await loadProfileData()
  setupFormHandlers()
  setupAddressSync()
  setupFileUploads()
}

// Load Profile Data from API
async function loadProfileData() {
  const [success, response] = await callApi("GET", profile_url, null, csrf_token)

  if (success && response.success) {
    profileData = response.data.user
    companyProfileData = response.data.company_profile || null

    renderProfileData()
    populateForms()
    calculateProfileCompletion()
  } else {
    showErrorMessage(response.error || "Failed to load profile data")
  }
}

// Render Profile Data in UI
function renderProfileData() {
  if (!profileData) return

  // Get user's full name
  const fullName = getFullName()
  const initials = getInitials(fullName)

  // Update navbar
  const navUserName = document.getElementById("navUserName")
  if (navUserName) {
    navUserName.textContent = fullName
  }

  // Update sidebar avatar and name
  const sidebarAvatar = document.getElementById("sidebarAvatar")
  if (sidebarAvatar) {
    sidebarAvatar.innerHTML = `
      <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" 
           style="width: 80px; height: 80px; font-size: 2rem; font-weight: bold; margin: 0 auto;">
        ${initials}
      </div>
    `
  }

  const sidebarUserName = document.getElementById("sidebarUserName")
  if (sidebarUserName) {
    sidebarUserName.textContent = fullName
  }

  // Update verification badge
  updateVerificationBadge()
}

// Populate all forms with existing data
function populateForms() {
  // Personal Information
  document.getElementById("firstName").value = companyProfileData?.first_name || ""
  document.getElementById("lastName").value = companyProfileData?.last_name || ""
  document.getElementById("email").value = companyProfileData?.email || profileData.email || ""
  document.getElementById("contactNumber").value = profileData.contact_number || ""

  // Business Details
  if (companyProfileData) {
    document.getElementById("businessType").value = companyProfileData.business_type || ""
    document.getElementById("companyName").value = companyProfileData.company_name || ""
    document.getElementById("gstNumber").value = companyProfileData.gst_registration_no || ""
    document.getElementById("businessLicense").value = companyProfileData.business_license || ""

    // Address Information
    document.getElementById("addressLine1").value = companyProfileData.address_line_1 || ""
    document.getElementById("addressLine2").value = companyProfileData.address_line_2 || ""
    document.getElementById("pincode").value = companyProfileData.pincode || ""
    document.getElementById("city").value = companyProfileData.city || ""
    document.getElementById("state").value = companyProfileData.state || ""
    document.getElementById("country").value = companyProfileData.country || "India"

    // Return Address
    document.getElementById("returnAddressLine1").value = companyProfileData.return_address_line_1 || ""
    document.getElementById("returnAddressLine2").value = companyProfileData.return_address_line_2 || ""
    document.getElementById("alternateContact").value = companyProfileData.alternate_contact_number || ""

    // Update document upload badges if files exist
    updateDocumentBadges()
  }
}

// Setup Form Handlers
function setupFormHandlers() {
  // Personal Information Form
  document.getElementById("personalInfoForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await savePersonalInfo()
  })

  // Business Details Form
  document.getElementById("businessDetailsForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await saveBusinessDetails()
  })

  // Address Form
  document.getElementById("addressForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await saveAddress()
  })

  // Document Form
  document.getElementById("documentForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    await saveDocuments()
  })
}

// Save Personal Information
async function savePersonalInfo() {
  const formData = {
    first_name: document.getElementById("firstName").value.trim(),
    last_name: document.getElementById("lastName").value.trim(),
    email: document.getElementById("email").value.trim(),
  }

  // Validate
  if (!formData.first_name || !formData.last_name || !formData.email) {
    showErrorMessage("All fields are required")
    return
  }

  if (!isValidEmail(formData.email)) {
    showErrorMessage("Please enter a valid email address")
    return
  }

  // Update user profile
  const [success, response] = await callApi("PUT", `${profile_url}${profileData.id}/`, formData, csrf_token)

  if (success && response.success) {
    showSuccessMessage("Personal information updated successfully!")
    await loadProfileData()
  } else {
    showErrorMessage(response.error || "Failed to update personal information")
  }
}

// Save Business Details
async function saveBusinessDetails() {
  const formData = {
    first_name: document.getElementById("firstName").value.trim(),
    last_name: document.getElementById("lastName").value.trim(),
    email: document.getElementById("email").value.trim(),
    contact_number: profileData.contact_number,
    business_type: document.getElementById("businessType").value,
    company_name: document.getElementById("companyName").value.trim(),
    gst_registration_no: document.getElementById("gstNumber").value.trim(),
    business_license: document.getElementById("businessLicense").value.trim(),
  }

  // Validate
  if (!formData.business_type || !formData.company_name || !formData.gst_registration_no) {
    showErrorMessage("Business Type, Company Name, and GST Number are required")
    return
  }

  const [success, response] = await callApi("PUT", `${profile_url}${profileData.id}/`, formData, csrf_token)

  if (success && response.success) {
    showSuccessMessage("Business details updated successfully!")
    await loadProfileData()
  } else {
    showErrorMessage(response.error || "Failed to update business details")
  }
}

// Save Address Information
async function saveAddress() {
  const formData = {
    first_name: document.getElementById("firstName").value.trim(),
    last_name: document.getElementById("lastName").value.trim(),
    email: document.getElementById("email").value.trim(),
    contact_number: profileData.contact_number,
    business_type: document.getElementById("businessType").value,
    company_name: document.getElementById("companyName").value.trim(),
    gst_registration_no: document.getElementById("gstNumber").value.trim(),
    business_license: document.getElementById("businessLicense").value.trim(),
    address_line_1: document.getElementById("addressLine1").value.trim(),
    address_line_2: document.getElementById("addressLine2").value.trim(),
    pincode: document.getElementById("pincode").value.trim(),
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value.trim(),
    country: document.getElementById("country").value.trim(),
    return_address_line_1: document.getElementById("returnAddressLine1").value.trim(),
    return_address_line_2: document.getElementById("returnAddressLine2").value.trim(),
    alternate_contact_number: document.getElementById("alternateContact").value.trim(),
  }

  // Validate
  if (!formData.address_line_1 || !formData.pincode || !formData.city || !formData.state) {
    showErrorMessage("Address Line 1, Pincode, City, and State are required")
    return
  }

  if (!/^\d{6}$/.test(formData.pincode)) {
    showErrorMessage("Pincode must be 6 digits")
    return
  }

  if (!formData.return_address_line_1) {
    showErrorMessage("Return Address Line 1 is required")
    return
  }

  const [success, response] = await callApi("PUT", `${profile_url}${profileData.id}/`, formData, csrf_token)

  if (success && response.success) {
    showSuccessMessage("Address information updated successfully!")
    await loadProfileData()
  } else {
    showErrorMessage(response.error || "Failed to update address information")
  }
}

// Save Documents
async function saveDocuments() {
  const formData = new FormData()

  // Add all required user and company fields
  formData.append("first_name", document.getElementById("firstName").value.trim())
  formData.append("last_name", document.getElementById("lastName").value.trim())
  formData.append("email", document.getElementById("email").value.trim())
  formData.append("contact_number", profileData.contact_number)
  formData.append("business_type", document.getElementById("businessType").value)
  formData.append("company_name", document.getElementById("companyName").value.trim())
  formData.append("gst_registration_no", document.getElementById("gstNumber").value.trim())
  formData.append("business_license", document.getElementById("businessLicense").value.trim())
  formData.append("address_line_1", document.getElementById("addressLine1").value.trim())
  formData.append("address_line_2", document.getElementById("addressLine2").value.trim())
  formData.append("pincode", document.getElementById("pincode").value.trim())
  formData.append("city", document.getElementById("city").value.trim())
  formData.append("state", document.getElementById("state").value.trim())
  formData.append("country", document.getElementById("country").value.trim())
  formData.append("return_address_line_1", document.getElementById("returnAddressLine1").value.trim())
  formData.append("return_address_line_2", document.getElementById("returnAddressLine2").value.trim())

  // Add files if selected
  const gstCertificate = document.getElementById("gstCertificate").files[0]
  const businessLicenseFile = document.getElementById("businessLicenseFile").files[0]
  const identityProof = document.getElementById("identityProof").files[0]
  const addressProof = document.getElementById("addressProof").files[0]

  if (gstCertificate) formData.append("gst_certificate", gstCertificate)
  if (businessLicenseFile) formData.append("business_license_file", businessLicenseFile)
  if (identityProof) formData.append("identity_proof", identityProof)
  if (addressProof) formData.append("address_proof", addressProof)

  // Validate at least one document is uploaded
  if (!gstCertificate && !businessLicenseFile && !identityProof && !addressProof) {
    showErrorMessage("Please upload at least one document")
    return
  }

  const [success, response] = await callApi(
    "PUT",
    `${profile_url}${profileData.id}/`,
    formData,
    csrf_token,
    true, // multipart form data
  )

  if (success && response.success) {
    showSuccessMessage("Documents uploaded successfully!")
    await loadProfileData()
  } else {
    showErrorMessage(response.error || "Failed to upload documents")
  }
}

// Setup Address Sync
function setupAddressSync() {
  const sameAsWarehouseCheckbox = document.getElementById("sameAsWarehouse")

  if (sameAsWarehouseCheckbox) {
    sameAsWarehouseCheckbox.addEventListener("change", function () {
      if (this.checked) {
        // Copy warehouse address to return address
        document.getElementById("returnAddressLine1").value = document.getElementById("addressLine1").value
        document.getElementById("returnAddressLine2").value = document.getElementById("addressLine2").value
        document.getElementById("returnAddressLine1").disabled = true
        document.getElementById("returnAddressLine2").disabled = true
      } else {
        // Enable return address fields
        document.getElementById("returnAddressLine1").disabled = false
        document.getElementById("returnAddressLine2").disabled = false
      }
    })
  }
}

// Setup File Uploads
function setupFileUploads() {
  const fileInputs = document.querySelectorAll('input[type="file"]')

  fileInputs.forEach((input) => {
    input.addEventListener("change", function () {
      handleFileUpload(this)
    })
  })
}

// Handle File Upload
function handleFileUpload(input) {
  const file = input.files[0]
  if (!file) return

  // Validate file type
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"]
  if (!allowedTypes.includes(file.type)) {
    showErrorMessage("Please upload only PDF, JPG, or PNG files")
    input.value = ""
    return
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showErrorMessage("File size should not exceed 5MB")
    input.value = ""
    return
  }

  // Update badge to show file selected
  const uploadCard = input.closest(".upload-card")
  if (uploadCard) {
    const badge = uploadCard.querySelector(".badge")
    if (badge) {
      badge.className = "badge bg-info"
      badge.textContent = "File Selected"
    }
  }

  showSuccessMessage(`File "${file.name}" selected successfully`)
}

// Calculate Profile Completion
function calculateProfileCompletion() {
  let completedSections = 0
  const totalSections = 3

  // Check personal information
  const personalComplete = checkPersonalInfoComplete()
  if (personalComplete) completedSections++

  // Check business details
  const businessComplete = checkBusinessDetailsComplete()
  if (businessComplete) completedSections++

  // Check documents
  const documentsComplete = checkDocumentsComplete()
  if (documentsComplete) completedSections++

  const completionPercentage = Math.round((completedSections / totalSections) * 100)

  // Update progress bar
  const progressBar = document.getElementById("completionProgressBar")
  if (progressBar) {
    progressBar.style.width = completionPercentage + "%"
  }

  // Update completion text
  const completionText = document.getElementById("completionPercentageText")
  if (completionText) {
    completionText.textContent = completionPercentage + "% Complete"
  }

  // Update completion items
  updateCompletionItems(personalComplete, businessComplete, documentsComplete)
}

// Check if personal info is complete
function checkPersonalInfoComplete() {
  if (!companyProfileData) return false
  return !!(
    companyProfileData.first_name &&
    companyProfileData.last_name &&
    companyProfileData.email &&
    profileData.contact_number
  )
}

// Check if business details are complete
function checkBusinessDetailsComplete() {
  if (!companyProfileData) return false
  return !!(
    companyProfileData.business_type &&
    companyProfileData.company_name &&
    companyProfileData.gst_registration_no &&
    companyProfileData.address_line_1 &&
    companyProfileData.city &&
    companyProfileData.state &&
    companyProfileData.pincode
  )
}

// Check if documents are complete
function checkDocumentsComplete() {
  if (!companyProfileData) return false
  return !!(companyProfileData.gst_certificate && companyProfileData.identity_proof && companyProfileData.address_proof)
}

// Update completion items UI
function updateCompletionItems(personal, business, documents) {
  const personalItem = document.getElementById("completionPersonal")
  const businessItem = document.getElementById("completionBusiness")
  const documentsItem = document.getElementById("completionDocuments")

  if (personalItem) {
    const icon = personalItem.querySelector("i")
    if (personal) {
      icon.className = "fas fa-check-circle text-success me-2"
    } else {
      icon.className = "fas fa-exclamation-circle text-warning me-2"
    }
  }

  if (businessItem) {
    const icon = businessItem.querySelector("i")
    if (business) {
      icon.className = "fas fa-check-circle text-success me-2"
    } else {
      icon.className = "fas fa-exclamation-circle text-warning me-2"
    }
  }

  if (documentsItem) {
    const icon = documentsItem.querySelector("i")
    if (documents) {
      icon.className = "fas fa-check-circle text-success me-2"
    } else {
      icon.className = "fas fa-times-circle text-danger me-2"
    }
  }
}

// Update verification badge
function updateVerificationBadge() {
  const badge = document.getElementById("verificationBadge")
  if (!badge) return

  const isComplete = checkPersonalInfoComplete() && checkBusinessDetailsComplete() && checkDocumentsComplete()

  if (isComplete) {
    badge.className = "badge bg-success fs-6"
    badge.innerHTML = '<i class="fas fa-check-circle me-1"></i>Verified'
  } else {
    badge.className = "badge bg-warning fs-6"
    badge.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Verification Pending'
  }
}

// Update document badges based on uploaded files
function updateDocumentBadges() {
  if (!companyProfileData) return

  if (companyProfileData.gst_certificate) {
    const badge = document.getElementById("gstBadge")
    if (badge) {
      badge.className = "badge bg-success"
      badge.textContent = "Uploaded"
    }
  }

  if (companyProfileData.business_license_file) {
    const badge = document.getElementById("businessLicenseBadge")
    if (badge) {
      badge.className = "badge bg-success"
      badge.textContent = "Uploaded"
    }
  }

  if (companyProfileData.identity_proof) {
    const badge = document.getElementById("identityBadge")
    if (badge) {
      badge.className = "badge bg-success"
      badge.textContent = "Uploaded"
    }
  }

  if (companyProfileData.address_proof) {
    const badge = document.getElementById("addressProofBadge")
    if (badge) {
      badge.className = "badge bg-success"
      badge.textContent = "Uploaded"
    }
  }
}

// Helper Functions
function getFullName() {
  if (companyProfileData && companyProfileData.first_name && companyProfileData.last_name) {
    return `${companyProfileData.first_name} ${companyProfileData.last_name}`
  }
  
  if (profileData && profileData.first_name && profileData.last_name) {
    return `${profileData.first_name} ${profileData.last_name}`
  }
  return "User"
}

function getInitials(name) {
  if (!name) return "U"
  const words = name.trim().split(" ")
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function showSuccessMessage(message) {
  const alert = document.createElement("div")
  alert.className = "alert alert-success alert-dismissible fade show position-fixed"
  alert.style.cssText = "top: 100px; right: 20px; z-index: 9999; min-width: 300px;"
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `

  document.body.appendChild(alert)

  setTimeout(() => {
    if (alert.parentNode) {
      alert.remove()
    }
  }, 3000)
}

function showErrorMessage(message) {
  const alert = document.createElement("div")
  alert.className = "alert alert-danger alert-dismissible fade show position-fixed"
  alert.style.cssText = "top: 100px; right: 20px; z-index: 9999; min-width: 300px;"
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `

  document.body.appendChild(alert)

  setTimeout(() => {
    if (alert.parentNode) {
      alert.remove()
    }
  }, 3000)
}
