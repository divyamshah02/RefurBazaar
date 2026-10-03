// Handle API errors with profile validation redirects

function handleApiError(response) {
    console.log('Handling API error:', response);
    
    // Check for profile-related errors
    if (response && response.profile_incomplete) {
        showProfileIncompleteModal();
        return true;
    }
    
    if (response && response.profile_not_approved) {
        showProfileNotApprovedModal();
        return true;
    }
    
    return false;
}

function showProfileIncompleteModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-warning text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-exclamation-triangle me-2"></i>Profile Incomplete
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-3">You need to complete your profile before accessing this feature.</p>
                    <p class="mb-0">Please complete all sections:</p>
                    <ul class="mt-2">
                        <li>Personal Information</li>
                        <li>Business Details</li>
                        <li>Document Upload</li>
                        <li>Payment Information</li>
                    </ul>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <a href="/refurbisher-profile" class="btn btn-warning">
                        <i class="fas fa-user-edit me-2"></i>Complete Profile
                    </a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new window.bootstrap.Modal(modal);
    modal.addEventListener('hidden.bs.modal', () => modal.remove());
    bsModal.show();
}

function showProfileNotApprovedModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-info text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-clock me-2"></i>Awaiting Approval
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-3">Your profile is complete and under review by our admin team.</p>
                    <p class="mb-3">This typically takes 24-48 hours. You will receive an email notification once your profile is approved.</p>
                    <p class="mb-0"><strong>What happens after approval?</strong></p>
                    <ul class="mt-2">
                        <li>You can add and manage product listings</li>
                        <li>View and process customer orders</li>
                        <li>Start selling on RefurBazaar</li>
                    </ul>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Understood</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new window.bootstrap.Modal(modal);
    modal.addEventListener('hidden.bs.modal', () => modal.remove());
    bsModal.show();
}

// Export functions for use in other scripts
window.handleApiError = handleApiError;
window.showProfileIncompleteModal = showProfileIncompleteModal;
window.showProfileNotApprovedModal = showProfileNotApprovedModal;
