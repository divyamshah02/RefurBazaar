// Product detail page functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeProductDetail()
})

function initializeProductDetail() {
  // Initialize image gallery
  initializeImageGallery()

  // Initialize option selections
  initializeProductOptions()
}

function initializeImageGallery() {
  // Initialize thumbnail swiper
  const Swiper = window.Swiper // Declare Swiper variable
  const thumbnailSwiper = new Swiper(".thumbnailSwiper", {
    spaceBetween: 10,
    slidesPerView: 4,
    freeMode: true,
    watchSlidesProgress: true,
    breakpoints: {
      320: {
        slidesPerView: 3,
      },
      768: {
        slidesPerView: 4,
      },
    },
  })
}

function changeMainImage(src) {
  const mainImage = document.getElementById("mainImage")
  mainImage.src = src
}

function initializeProductOptions() {
  // Storage options
  const storageButtons = document.querySelectorAll(".option-buttons .btn")
  storageButtons.forEach((button) => {
    button.addEventListener("click", function () {
      storageButtons.forEach((b) => b.classList.remove("active"))
      this.classList.add("active")
      updatePrice()
    })
  })

  // Color options
  const colorOptions = document.querySelectorAll(".color-option")
  colorOptions.forEach((option) => {
    option.addEventListener("click", function () {
      colorOptions.forEach((o) => o.classList.remove("active"))
      this.classList.add("active")
    })
  })
}

function updatePrice() {
  // Update price based on selected options
  const activeStorage = document.querySelector(".option-buttons .btn.active")
  const basePrice = 65999
  let additionalCost = 0

  if (activeStorage.textContent.includes("256GB")) {
    additionalCost = 10000
  } else if (activeStorage.textContent.includes("512GB")) {
    additionalCost = 20000
  }

  const newPrice = basePrice + additionalCost
  document.querySelector(".current-price").textContent = `₹${newPrice.toLocaleString()}`
}

function updateQuantity(change) {
  const quantityElement = document.getElementById("quantity")
  const currentQuantity = Number.parseInt(quantityElement.textContent)
  let newQuantity = currentQuantity + change

  if (newQuantity < 1) newQuantity = 1
  if (newQuantity > 5) newQuantity = 5

  quantityElement.textContent = newQuantity
}

function addToCart() {
  const quantity = Number.parseInt(document.getElementById("quantity").textContent)
  const selectedStorage = document.querySelector(".option-buttons .btn.active").textContent
  const selectedColor = document.querySelector(".color-option.active").title

  console.log(`Adding to cart: ${quantity}x iPhone 13 Pro ${selectedStorage} ${selectedColor}`)
  showToast("Product added to cart!", "success")

  // Update cart badge
  const cartBadge = document.querySelector(".badge")
  if (cartBadge) {
    const currentCount = Number.parseInt(cartBadge.textContent)
    cartBadge.textContent = currentCount + quantity
  }
}

function addToWishlist() {
  console.log("Adding to wishlist")
  showToast("Product added to wishlist!", "success")
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
  const bootstrap = window.bootstrap // Declare bootstrap variable
  const bsToast = new bootstrap.Toast(toast)
  bsToast.show()

  // Remove toast after it's hidden
  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove()
  })
}
