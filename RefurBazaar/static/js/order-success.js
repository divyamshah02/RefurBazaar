let csrf_token = null;
let verify_payment_url = null;
let orderId = null;
let paymentId = null;
let razorpayOrderId = null;
let razorpaySignature = null;
let verificationAttempts = 0;
const maxAttempts = 3;

async function InitializeOrderSuccess(csrfTokenParam, verifyPaymentUrlParam) {
  csrf_token = csrfTokenParam;
  verify_payment_url = verifyPaymentUrlParam;

  try {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    orderId = urlParams.get("order_id");
    paymentId = urlParams.get("razorpay_payment_id");
    razorpayOrderId = urlParams.get("razorpay_order_id");
    razorpaySignature = urlParams.get("razorpay_signature");

    // Validate required parameters
    if (!orderId) {
      showError("Order ID not found in URL parameters.");
      return;
    }

    // Start payment verification process
    await startPaymentVerification();
  } catch (error) {
    console.error("Error initializing order success:", error);
    showError("Error initializing payment verification.");
  }
}

async function startPaymentVerification() {
  try {
    // Show checking card
    showCheckingCard();

    // Start progress animation
    animateProgress();

    // Wait a moment for better UX
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify payment
    await verifyPayment();
  } catch (error) {
    console.error("Error in payment verification:", error);
    showError("Payment verification failed. Please try again.");
  }
}

function animateProgress() {
  const progressBar = document.getElementById("verification-progress");
  let width = 0;

  const interval = setInterval(() => {
    if (width >= 90) {
      clearInterval(interval);
    } else {
      width += Math.random() * 10;
      progressBar.style.width = Math.min(width, 90) + "%";
    }
  }, 200);
}

async function verifyPayment() {
  verificationAttempts++;

  try {
    const requestData = {
      order_id: orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: razorpaySignature
    };

    const [success, result] = await callApi("POST", verify_payment_url, requestData, csrf_token);

    if (success && result.success) {
      // Payment verified successfully
      showSuccess();

      // Complete progress bar
      const progressBar = document.getElementById("verification-progress");
      progressBar.style.width = "100%";

      // Redirect to order detail page after 3 seconds
      setTimeout(() => {
        window.location.href = `/order-detail/?order_id=${orderId}`;
      }, 3000);
    } else {
      // Payment verification failed
      const errorMessage = result.error || "Payment verification failed.";

      if (verificationAttempts < maxAttempts) {
        // Retry after a delay
        setTimeout(() => {
          verifyPayment();
        }, 3000);
      } else {
        showError(errorMessage);
      }
    }
  } catch (error) {
    console.error("Error verifying payment:", error);

    if (verificationAttempts < maxAttempts) {
      // Retry after a delay
      setTimeout(() => {
        verifyPayment();
      }, 3000);
    } else {
      showError("Network error. Please check your connection and try again.");
    }
  }
}

function showCheckingCard() {
  document.getElementById("payment-checking-card").style.display = "block";
  document.getElementById("payment-success-card").style.display = "none";
  document.getElementById("payment-failed-card").style.display = "none";
}

function showSuccess() {
  document.getElementById("payment-checking-card").style.display = "none";
  document.getElementById("payment-success-card").style.display = "block";
  document.getElementById("payment-failed-card").style.display = "none";
}

function showError(message) {
  document.getElementById("payment-checking-card").style.display = "none";
  document.getElementById("payment-success-card").style.display = "none";
  document.getElementById("payment-failed-card").style.display = "block";

  // Update error message
  const errorMessageElement = document.getElementById("error-message");
  if (errorMessageElement) {
    errorMessageElement.textContent = message;
  }
}

function retryVerification() {
  verificationAttempts = 0;
  startPaymentVerification();
}
