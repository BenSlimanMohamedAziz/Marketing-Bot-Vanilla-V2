// Enhanced Form Validation Script

let currentStep = 0;
const steps = document.querySelectorAll('.step');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const submitBtn = document.getElementById('submitBtn');
const progressBar = document.getElementById('progressBar');
const stepIndicator = document.getElementById('stepIndicator');
const form = document.getElementById('companyForm');

// Initialize form
document.addEventListener('DOMContentLoaded', function() {
    // File upload display
    document.getElementById('logo').addEventListener('change', function(e) {
        const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
        document.getElementById('fileName').textContent = fileName;
        validateField(this);
    });

    // Handle "Other" option in select
    document.getElementById('brandTone').addEventListener('change', function() {
        const otherInput = document.getElementById('brandTone_other');
        if (this.value === 'Other') {
            otherInput.style.display = 'block';
            otherInput.required = true;
        } else {
            otherInput.style.display = 'none';
            otherInput.required = false;
        }
        validateField(this);
    });

    // Set up validation for all fields
    setupFieldValidation();
    
    // Initialize first step
    showStep(currentStep);
});

// Field validation setup
function setupFieldValidation() {
    // Setup regular field validation
    document.querySelectorAll('input:not([type="checkbox"]), textarea, select').forEach(field => {
        // Real-time validation while typing
        field.addEventListener('input', function() {
            validateField(this);
        });
        
        // Validate on blur (after typing)
        field.addEventListener('blur', function() {
            validateField(this);
        });
    });
    
    // Setup checkbox group validation
    document.querySelectorAll('.required-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // When any checkbox changes, validate the entire group
            validateCheckboxGroup(this.name);
        });
    });
}

// Validate a checkbox group
function validateCheckboxGroup(groupName) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    const errorElement = document.getElementById(`${groupName}-error`);
    
    if (checkboxes.length === 0) return true;
    
    let isChecked = false;
    checkboxes.forEach(cb => {
        if (cb.checked) {
            isChecked = true;
        }
    });
    
    if (!isChecked) {
        if (errorElement) {
            errorElement.textContent = 'Please select at least one option';
            errorElement.classList.add('show');
        }
        return false;
    } else {
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
        return true;
    }
}

// Validate a single field
function validateField(field) {
    const errorElement = document.getElementById(`${field.id}-error`);
    
    // Reset state
    field.classList.remove('invalid');
    if (errorElement) errorElement.classList.remove('show');
    
    // Skip validation for hidden fields
    if (field.offsetParent === null) return true;
    
    // Check required fields
    if (field.required && field.type !="file" && !field.value.trim()) {
        if (errorElement) {
            // Custom message for brand tone select
            if (field.id === 'brandTone') {
                errorElement.textContent = "Please select your brand's tone";
            } else {
                errorElement.textContent = 'This field is required';
            }
            errorElement.classList.add('show');
        }
        field.classList.add('invalid');
        return false;
    }
    
    // Special handling for file input
    if (field.type === 'file' && field.required) {
        if (!field.files || !field.files[0]) {
            if (errorElement) {
                errorElement.textContent = 'Please upload a file';
                errorElement.classList.add('show');
            }
            
            // For file inputs, apply invalid class to the file-upload-label instead
            const fileUploadLabel = field.parentElement.querySelector('.file-upload-label');
            if (fileUploadLabel) {
                fileUploadLabel.classList.add('invalid');
            }
            
            return false;
        } else {
            // Remove invalid class if there's a file
            const fileUploadLabel = field.parentElement.querySelector('.file-upload-label');
            if (fileUploadLabel) {
                fileUploadLabel.classList.remove('invalid');
            }
        }
    }
    
    // Custom validation for email fields
    if (field.type === 'email' && field.value.trim() && !/^\S+@\S+\.\S+$/.test(field.value)) {
        if (errorElement) {
            errorElement.textContent = 'Please enter a valid email address';
            errorElement.classList.add('show');
        }
        field.classList.add('invalid');
        return false;
    }
    
    // If field passes validation
    return true;
}

// Apply shake animation to invalid elements
function applyShakeAnimation(element) {
    if (!element) return;
    
    // Remove existing animation to allow it to be retriggered
    element.classList.remove('shake-animation');
    
    // Force browser to recognize the removal
    void element.offsetWidth;
    
    // Add the animation class back
    element.classList.add('shake-animation');
    
    // Remove the class after animation completes
    setTimeout(() => {
        element.classList.remove('shake-animation');
    }, 820); // Animation duration + a little extra
}

// Validate all fields in current step
function validateCurrentStep() {
    let isValid = true;
    const currentStepElement = steps[currentStep];
    let firstInvalidField = null;
    
    // First validate all regular fields
    const currentStepFields = currentStepElement.querySelectorAll('input:not([type="checkbox"]), textarea, select');
    currentStepFields.forEach(field => {
        const isFieldValid = validateField(field);
        
        if (!isFieldValid) {
            isValid = false;
            
            if (!firstInvalidField) {
                firstInvalidField = field;
            }
            
            // For file inputs, shake the file-upload container instead
            if (field.type === 'file') {
                const fileUploadContainer = field.closest('.file-upload');
                const fileUploadLabel = field.parentElement.querySelector('.file-upload-label');
                
                if (fileUploadContainer) {
                    applyShakeAnimation(fileUploadContainer);
                }
                
                if (fileUploadLabel) {
                    fileUploadLabel.classList.add('invalid');
                }
            } else {
                // Apply shake animation to invalid field
                applyShakeAnimation(field);
            }
            
            // Also shake the error message
            const errorElement = document.getElementById(`${field.id}-error`);
            if (errorElement) {
                applyShakeAnimation(errorElement);
                errorElement.classList.add('show');
            }
        }
    });
    
    // Then validate all checkbox groups in the current step
    const checkboxGroups = new Set();
    currentStepElement.querySelectorAll('.required-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkboxGroups.add(checkbox.name);
    });
    
    checkboxGroups.forEach(groupName => {
        if (!validateCheckboxGroup(groupName)) {
            isValid = false;
            
            // Apply shake animation to error message for checkbox group
            const errorElement = document.getElementById(`${groupName}-error`);
            if (errorElement) {
                applyShakeAnimation(errorElement);
            }
            
            // Also apply shake to the checkbox group container
            const container = document.querySelector(`.checkbox-group input[name="${groupName}"]`).closest('.checkbox-group');
            if (container) {
                applyShakeAnimation(container);
            }
        }
    });
    
    // Scroll to first invalid element if any
    if (firstInvalidField) {
        // For file inputs, scroll to the parent container
        if (firstInvalidField.type === 'file') {
            const fileContainer = firstInvalidField.closest('.file-upload');
            if (fileContainer) {
                fileContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalidField.focus();
        }
    }
    
    return isValid;
}

// Show specific step
function showStep(n) {
    steps.forEach((step, i) => {
        step.classList.toggle('active', i === n);
    });
    
    prevBtn.style.display = n > 0 ? 'inline' : 'none';
    nextBtn.style.display = n < steps.length - 1 ? 'inline' : 'none';
    submitBtn.style.display = n === steps.length - 1 ? 'inline' : 'none';
    
    updateProgress();
}

// Update progress bar and step indicator
function updateProgress() {
    const progress = ((currentStep + 1) / steps.length) * 100;
    progressBar.style.width = `${progress}%`;
    stepIndicator.textContent = `Page ${currentStep + 1} of ${steps.length}`;
}

// Change step with validation
function changeStep(n) {
    // When going forward, validate current step
    if (n > 0 && !validateCurrentStep()) {
        return;
    }
    
    currentStep += n;
    showStep(currentStep);
    
    // Scroll to top of form for better user experience
    document.getElementById('companyForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Form submission handler
form.addEventListener('submit', function(e) {
    e.preventDefault(); // Always prevent default behavior to handle our custom validation
    
    // Validate the entire form, not just the last step
    let isFormValid = true;
    
    // First check the current (last) step
    if (!validateCurrentStep()) {
        isFormValid = false;
    }
    
    if (isFormValid) {
        
        // Force all fields to be marked as valid for a cleaner submission appearance
        document.querySelectorAll('.invalid').forEach(element => {
            element.classList.remove('invalid');
        });
        
        // Submit after a slight delay
        setTimeout(() => {
            this.submit();
        }, 100);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Read cookie function
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
    
    // Display company name
    const companyName = getCookie('pending_company_name');
    if (companyName) {
        document.getElementById('displayCompanyName').textContent = companyName;
    } else {
        console.warn('Company name not found in cookies');
        // Optional: Redirect to signup if name is missing
        // window.location.href = '/signup_page';
    }
});

// Add website validation
// Add website validation
document.addEventListener('DOMContentLoaded', function() {
    const websiteInput = document.getElementById('website');
    const websiteError = document.getElementById('website-error');
    
    if (websiteInput && websiteError) {
        // Validate on form submission
        const form = document.getElementById('companyForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                const websiteValue = websiteInput.value.trim();
                
                if (websiteValue && !isValidWebsite(websiteValue)) {
                    e.preventDefault();
                    showError(websiteInput, websiteError, 'Please enter a valid website URL (example.com) or LinkedIn profile (linkedin.com/in/username)');
                    websiteInput.focus();
                } else {
                    hideError(websiteError);
                    // Remove any invalid styling if field is valid
                    websiteInput.classList.remove('invalid');
                    // Remove the checkmark background image if it exists
                    websiteInput.style.backgroundImage = 'none';
                    // Reset border color
                    websiteInput.style.borderColor = '';
                }
            });
        }
        
        // Validate on input blur (when user leaves the field)
        websiteInput.addEventListener('blur', function() {
            const websiteValue = websiteInput.value.trim();
            
            if (websiteValue && !isValidWebsite(websiteValue)) {
                showError(websiteInput, websiteError, 'Please enter a valid website URL (example.com) or LinkedIn profile (linkedin.com/in/username)');
            } else {
                hideError(websiteError);
                // Remove any invalid styling if field is valid
                websiteInput.classList.remove('invalid');
                // Remove the checkmark background image if it exists
                websiteInput.style.backgroundImage = 'none';
                // Reset border color
                websiteInput.style.borderColor = '';
            }
        });
        
        // Clear error when user starts typing again
        websiteInput.addEventListener('input', function() {
            const websiteValue = websiteInput.value.trim();
            
            if (!websiteValue) {
                // If field is empty, clear everything
                hideError(websiteError);
                websiteInput.classList.remove('invalid');
                websiteInput.style.backgroundImage = 'none';
                websiteInput.style.borderColor = '';
            } else {
                // Only hide error but don't show checkmark until valid
                hideError(websiteError);
                websiteInput.classList.remove('invalid');
                websiteInput.style.backgroundImage = 'none';
                websiteInput.style.borderColor = '';
                
                // If input becomes valid while typing, show the checkmark and green border
                if (isValidWebsite(websiteValue)) {
                    websiteInput.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234bb543' viewBox='0 0 16 16'%3E%3Cpath d='M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z'/%3E%3C/svg%3E\")";
                }
            }
        });
    }
    
    function isValidWebsite(url) {
        if (!url) return true; // Empty is allowed
        
        // Remove any protocol prefix and convert to lowercase
        const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
        
        // Regular website validation (domain.tld)
        const websitePattern = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*\.[a-z]{2,}(\/.*)?$/;
        
        // LinkedIn profile validation
        const linkedinPattern1 = /^linkedin\.com\/in\/[a-z0-9\-_]{3,100}(\/.*)?$/; // linkedin.com/in/username
        const linkedinPattern2 = /^linkedin\.com\/company\/[a-z0-9\-_]{3,100}(\/.*)?$/; // linkedin.com/company/companyname
        
        return websitePattern.test(cleanUrl) || 
               linkedinPattern1.test(cleanUrl) || 
               linkedinPattern2.test(cleanUrl);
    }
    
    function showError(input, errorElement, message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.classList.add('show');
        input.classList.add('invalid');
        
        // Show error icon instead of checkmark
        input.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23f44336' viewBox='0 0 16 16'%3E%3Cpath d='M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z'/%3E%3C/svg%3E\")";
        
        // Override the green border with red border for invalid inputs
        input.style.borderColor = '#f44336';
        
        // Apply shake animation to match your existing validation
        applyShakeAnimation(input);
        applyShakeAnimation(errorElement);
    }
    
    function hideError(errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
        errorElement.classList.remove('show');
    }
    
    function applyShakeAnimation(element) {
        if (!element) return;
        
        // Remove existing animation to allow it to be retriggered
        element.classList.remove('shake-animation');
        
        // Force browser to recognize the removal
        void element.offsetWidth;
        
        // Add the animation class back
        element.classList.add('shake-animation');
        
        // Remove the class after animation completes
        setTimeout(() => {
            element.classList.remove('shake-animation');
        }, 820);
    }
});

