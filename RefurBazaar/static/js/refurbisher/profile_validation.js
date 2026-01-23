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
