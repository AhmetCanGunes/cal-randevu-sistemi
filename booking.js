// Global variables
let todayDate = new Date().toISOString().split('T')[0];

// Add some test appointments for demonstration
function addTestAppointments() {
    const testAppointments = [
        {
            id: 'test1',
            name: 'Ali',
            surname: 'Yılmaz',
            date: todayDate,
            time: '10:00',
            phone: '555-0101',
            notes: 'Test randevusu',
            status: 'confirmed',
            createdAt: new Date().toISOString()
        },
        {
            id: 'test2',
            name: 'Ayşe',
            surname: 'Demir',
            date: todayDate,
            time: '14:00',
            phone: '555-0102',
            notes: 'Test randevusu 2',
            status: 'pending',
            createdAt: new Date().toISOString()
        }
    ];
    
    // Only add if no appointments exist
    const existing = JSON.parse(localStorage.getItem('appointments') || '[]');
    if (existing.length === 0) {
        localStorage.setItem('appointments', JSON.stringify(testAppointments));
        console.log('Test randevuları eklendi:', testAppointments);
    }
}

// Initialize booking page
document.addEventListener('DOMContentLoaded', function() {
    addTestAppointments(); // Add test data for demonstration
    setupBookingForm();
    setupNavigation();
    setupAnimations();
});

// Setup booking form
function setupBookingForm() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.min = todayDate;
        dateInput.value = todayDate;
        
        // Update time slots when date changes
        dateInput.addEventListener('change', updateTimeSlots);
        
        // Initial load of time slots
        updateTimeSlots();
    }
    
    // Add form submission handler
    const form = document.getElementById('appointmentForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
}

// Update time slots based on selected date
async function updateTimeSlots() {
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    
    if (!dateInput || !timeSelect) return;
    
    const selectedDate = dateInput.value;
    if (!selectedDate) return;
    
    // Get existing appointments for the selected date
    const appointments = await getAppointments();
    const bookedTimes = appointments
        .filter(app => app.date === selectedDate && app.status !== 'cancelled')
        .map(app => app.time);
    
    // Update time options
    const timeOptions = timeSelect.querySelectorAll('option');
    timeOptions.forEach(option => {
        const timeValue = option.value;
        
        if (timeValue === '') {
            // Skip the placeholder option
            return;
        }
        
        if (bookedTimes.includes(timeValue)) {
            // Time slot is booked
            option.disabled = true;
            option.className = 'time-booked';
            option.textContent = `${timeValue} (Dolu)`;
        } else {
            // Time slot is available
            option.disabled = false;
            option.className = 'time-available';
            option.textContent = timeValue;
        }
    });
    
    // Reset time selection if current selection is now booked
    if (timeSelect.value && bookedTimes.includes(timeSelect.value)) {
        timeSelect.value = '';
        showTimeSlotMessage();
    }
    
    // Visual feedback removed per user request
}

// Show message about time slot availability
function showTimeSlotMessage() {
    const existingMessage = document.querySelector('.time-slot-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const timeSelect = document.getElementById('time');
    const message = document.createElement('div');
    message.className = 'time-slot-message';
    message.innerHTML = `
        <div class="time-message-content">
            <span class="time-message-icon">⚠️</span>
            <span class="time-message-text">Seçtiğiniz saat artık dolu! Lütfen başka bir saat seçin.</span>
        </div>
    `;
    
    timeSelect.parentNode.appendChild(message);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, 5000);
}

// Visual indicators removed per user request

// Handle form submission
async function handleFormSubmission(e) {
    e.preventDefault();
    
    // Get form elements first for debugging
    const nameElement = document.getElementById('name');
    const surnameElement = document.getElementById('surname');
    
    console.log('Name element:', nameElement);
    console.log('Surname element:', surnameElement);
    console.log('Name element value:', nameElement ? nameElement.value : 'ELEMENT NOT FOUND');
    console.log('Surname element value:', surnameElement ? surnameElement.value : 'ELEMENT NOT FOUND');
    
    // Get form data
    const formData = {
        name: nameElement ? nameElement.value.trim() : '',
        surname: surnameElement ? surnameElement.value.trim() : '',
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        phone: document.getElementById('phone').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        id: generateId()
    };
    
    console.log('Form data collected:', formData);
    console.log('Final name in formData:', formData.name);
    console.log('Final surname in formData:', formData.surname);
    
    // Validate form
    if (!validateForm(formData)) {
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;
    
    try {
        // Check if appointment slot is available
        if (!await isSlotAvailable(formData.date, formData.time)) {
            showMessage('Bu tarih ve saat için zaten randevu alınmış. Lütfen farklı bir saat seçin.', 'error');
            return;
        }
        
        // Save appointment
        await saveAppointment(formData);
        
        // Debug: Check what was actually saved
        const savedAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        const lastSaved = savedAppointments[savedAppointments.length - 1];
        console.log('Last saved appointment:', lastSaved);
        console.log('Saved name:', lastSaved ? lastSaved.name : 'NO APPOINTMENT SAVED');
        console.log('Saved surname:', lastSaved ? lastSaved.surname : 'NO APPOINTMENT SAVED');
        
        // Show success message
        showMessage('🎉 Randevunuz başarıyla oluşturuldu! En kısa sürede sizinle iletişime geçeceğiz.', 'success');
        
        // Reset form
        document.getElementById('appointmentForm').reset();
        document.getElementById('date').value = todayDate;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error saving appointment:', error);
        showMessage('Randevu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Validate form data
function validateForm(formData) {
    // Check required fields
    if (!formData.name || !formData.surname || !formData.date || !formData.time) {
        showMessage('Lütfen tüm zorunlu alanları doldurun.', 'error');
        return false;
    }
    
    // Check name and surname length
    if (formData.name.length < 2 || formData.surname.length < 2) {
        showMessage('İsim ve soyisim en az 2 karakter olmalıdır.', 'error');
        return false;
    }
    
    return true;
}

// Check if time slot is available
async function isSlotAvailable(date, time) {
    try {
        const appointments = await getAppointments();
        return !appointments.some(app => 
            app.date === date && 
            app.time === time && 
            app.status !== 'cancelled'
        );
    } catch (error) {
        console.error('Error checking slot availability:', error);
        return true; // Allow booking if check fails
    }
}

// Save appointment to localStorage
async function saveAppointment(appointmentData) {
    try {
        console.log('=== SAVING APPOINTMENT DEBUG ===');
        console.log('Data to save:', appointmentData);
        console.log('Name field:', appointmentData.name, 'Type:', typeof appointmentData.name);
        console.log('Surname field:', appointmentData.surname, 'Type:', typeof appointmentData.surname);
        
        const appointments = await getAppointments();
        console.log('Existing appointments count:', appointments.length);
        
        appointments.push(appointmentData);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Verify the save
        const verifyData = JSON.parse(localStorage.getItem('appointments'));
        const lastSaved = verifyData[verifyData.length - 1];
        console.log('Verification - last saved appointment:', lastSaved);
        console.log('Verification - name:', lastSaved.name, 'surname:', lastSaved.surname);
        
        return true;
    } catch (error) {
        console.error('Error saving appointment:', error);
        throw new Error('Randevu kaydedilemedi');
    }
}

// Get all appointments from localStorage
async function getAppointments() {
    try {
        const data = localStorage.getItem('appointments');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting appointments:', error);
        return [];
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Show message to user
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.innerHTML = message;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        // Auto hide after 8 seconds for success, 5 seconds for error
        const hideDelay = type === 'success' ? 8000 : 5000;
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, hideDelay);
        
        // Scroll to message
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Setup navigation
function setupNavigation() {
    const navToggle = document.getElementById('mobile-menu');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('is-active');
        });
    }
    
    // Handle navbar scroll effect
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
}

// Setup animations
function setupAnimations() {
    // Form validation animations
    const nameInputs = document.querySelectorAll('#name, #surname');
    const phoneInput = document.getElementById('phone');
    
    // Name validation
    nameInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', function() {
                const value = this.value.trim();
                const isValid = value.length >= 2 && /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(value);
                
                if (value.length > 0) {
                    this.classList.toggle('valid', isValid);
                    this.classList.toggle('invalid', !isValid);
                } else {
                    this.classList.remove('valid', 'invalid');
                }
            });
        }
    });
    
    // Phone validation
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (value.length > 0) {
                const isValid = /^[\d\s\-\+\(\)]+$/.test(value);
                this.classList.toggle('valid', isValid);
                this.classList.toggle('invalid', !isValid);
            } else {
                this.classList.remove('valid', 'invalid');
            }
        });
    }
}

// Console helper functions for testing
window.clearAllAppointments = function() {
    localStorage.removeItem('appointments');
    console.log('Tüm randevular temizlendi. Sayfayı yenileyin.');
    location.reload();
};

window.showAllAppointments = function() {
    const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    console.log('Mevcut randevular:', appointments);
    return appointments;
};

window.addTestAppointmentForToday = function(time = '16:00') {
    const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    const newAppointment = {
        id: 'test_' + Date.now(),
        name: 'Test',
        surname: 'Kullanıcı',
        date: todayDate,
        time: time,
        phone: '555-TEST',
        notes: 'Konsol üzerinden eklenen test randevusu',
        status: 'confirmed',
        createdAt: new Date().toISOString()
    };
    
    appointments.push(newAppointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    console.log(`${time} saatine test randevusu eklendi. Sayfa yenileniyor...`);
    location.reload();
};

console.log('📅 Randevu Test Fonksiyonları:');
console.log('• clearAllAppointments() - Tüm randevuları sil');
console.log('• showAllAppointments() - Randevuları görüntüle');
console.log('• addTestAppointmentForToday("15:00") - Test randevusu ekle');

