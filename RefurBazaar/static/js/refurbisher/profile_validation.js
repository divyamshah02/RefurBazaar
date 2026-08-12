// Profile validation and status checks for refurbisher

function showProfileStatusAlert(companyProfile) {
    if (!companyProfile) {
        showWarningAlert(
            'Complete Your Profile',
            'Please complete your profile to start selling. Fill in all sections: Personal Info, Business Details, Documents, and Payment Information.'
        );
        return;
    }

    if (!companyProfile.is_profile_complete) {
        showWarningAlert(
            'Profile Incomplete',
            'Please complete all required sections of your profile to start selling: Personal Info, Business Details, Documents, and Payment Information.'
        );
        return;
    }

    if (companyProfile.is_rejected) {
        showRejectedAlert(companyProfile);
        return;
    }

    if (!companyProfile.is_approved) {
        showInfoAlert(
            'Awaiting Approval',
            'Your profile is complete and submitted for review. Our team will verify your documents and approve your account within 24-48 hours. You will be notified via email once approved.'
        );
        return;
    }

    // Profile is complete and approved
    showSuccessAlert(
        'Profile Approved',
        'Your profile is verified and approved. You can now add listings and manage orders.'
    );
}

function showRejectedAlert(companyProfile) {
    const reason = companyProfile.rejection_reason
        ? escapeHtml(companyProfile.rejection_reason)
        : 'No specific reason was provided.'

    const alertDiv = document.createElement('div')
    alertDiv.className = 'alert alert-danger mb-4'
    alertDiv.id = 'rejection-alert'
    alertDiv.innerHTML = `
        <h5 class="alert-heading"><i class="fas fa-times-circle me-2"></i>Profile Rejected</h5>
        <p class="mb-2">Our admin team reviewed your profile and could not approve it for the following reason:</p>
        <div class="p-3 mb-3 rounded" style="background: rgba(0,0,0,0.05); white-space: pre-wrap;">${reason}</div>
        <p class="mb-3">Please update your profile to address this, then reply below to request another review.</p>
        <form id="resubmit-form">
            <textarea id="resubmit-reply" class="form-control mb-2" rows="3"
                placeholder="Optional: explain what you changed or add a reply for the admin team..."></textarea>
            <button type="submit" class="btn btn-danger" id="resubmit-btn">
                <i class="fas fa-paper-plane me-1"></i>Reply &amp; Request Review Again
            </button>
        </form>
    `

    const mainContent = document.querySelector('.dashboard-main')
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild)
    }

    const form = document.getElementById('resubmit-form')
    if (form) {
        form.addEventListener('submit', handleResubmitApproval)
    }
}

async function handleResubmitApproval(e) {
    e.preventDefault()
    const btn = document.getElementById('resubmit-btn')
    const reply = document.getElementById('resubmit-reply').value.trim()

    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Submitting...'

    const url = `${profile_url}resubmit-approval/`
    const [success, response] = await callApi('POST', url, { reply: reply }, csrf_token)

    if (success && response.success) {
        const alertDiv = document.getElementById('rejection-alert')
        if (alertDiv) alertDiv.remove()

        if (typeof companyProfileData !== 'undefined' && companyProfileData) {
            companyProfileData.is_rejected = false
        }

        showInfoAlert(
            'Resubmitted for Review',
            'Your profile has been resubmitted. Our team will review it again within 24-48 hours.'
        )

        if (typeof loadProfileData === 'function') {
            loadProfileData()
        }
    } else {
        btn.disabled = false
        btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Reply &amp; Request Review Again'
        alert(response?.error || 'Failed to resubmit. Please try again.')
    }
}

function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
}

function showWarningAlert(title, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning alert-dismissible fade show mb-4';
    alertDiv.innerHTML = `
        <h5 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>${title}</h5>
        <p class="mb-0">${message}</p>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const mainContent = document.querySelector('.dashboard-main');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
    }
}

function showInfoAlert(title, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-info alert-dismissible fade show mb-4';
    alertDiv.innerHTML = `
        <h5 class="alert-heading"><i class="fas fa-info-circle me-2"></i>${title}</h5>
        <p class="mb-0">${message}</p>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const mainContent = document.querySelector('.dashboard-main');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
    }
}

function showSuccessAlert(title, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show mb-4';
    alertDiv.innerHTML = `
        <h5 class="alert-heading"><i class="fas fa-check-circle me-2"></i>${title}</h5>
        <p class="mb-0">${message}</p>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const mainContent = document.querySelector('.dashboard-main');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
    }
}

// Check profile status and show appropriate message
window.checkProfileStatus = function(companyProfile) {
    showProfileStatusAlert(companyProfile);
};

// Handle API error responses specifically for profile validation
window.handleApiError = function(response) {
    if (!response.success) {
        if (response.profile_incomplete) {
            showWarningAlert(
                'Profile Incomplete',
                'Please complete all required sections of your profile before adding listings: Personal Info, Business Details, Documents, and Payment Information. <a href="/refurbisher-profile/" class="alert-link">Complete Profile Now</a>'
            );
            return true;
        }
        
        if (response.profile_not_approved) {
            showInfoAlert(
                'Awaiting Approval',
                'Your profile is under review by our admin team. You will be able to add listings and manage orders once your profile is approved. You will be notified via email once approved.'
            );
            return true;
        }
    }
    return false;
};
