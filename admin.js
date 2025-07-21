// Simple Admin Panel - Randevu Yönetimi

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Simple Admin Panel loaded');
    
    // Check if user is logged in
    if (isLoggedIn()) {
        showAdminPanel();
    } else {
        showLoginForm();
    }
});

// Authentication functions
function isLoggedIn() {
    const sessionData = localStorage.getItem('adminSession');
    if (!sessionData) return false;
    
    try {
        const data = JSON.parse(sessionData);
        // Check if session is still valid
        const now = new Date();
        const expiresAt = new Date(data.expiresAt);
        
        return now < expiresAt;
    } catch (e) {
        return false;
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const adminId = document.getElementById('adminId').value;
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('login-error');
    
    // Get stored credentials
    const storedCredentials = JSON.parse(localStorage.getItem('adminCredentials') || '{}');
    const validAdminId = storedCredentials.adminId || 'admin';
    const validPassword = storedCredentials.password || '123456';
    
    if (adminId === validAdminId && password === validPassword) {
        // Set login session
        const sessionData = {
            adminId: adminId,
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
        localStorage.setItem('adminSession', JSON.stringify(sessionData));
        
        showAdminPanel();
        showNotification('Giriş başarılı! Hoşgeldiniz!', 'success');
    } else {
        errorDiv.textContent = 'Kullanıcı ID veya şifre hatalı!';
        errorDiv.style.display = 'block';
        
        // Hide error after 3 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

function logout() {
    // Show confirmation dialog
    showLogoutConfirmation();
}

function showLogoutConfirmation() {
    const overlay = document.createElement('div');
    overlay.className = 'logout-confirmation-overlay';
    
    overlay.innerHTML = `
        <div class="logout-confirmation-modal">
            <div class="logout-confirmation-header">
                <div class="logout-confirmation-icon">🔓</div>
                <h3>Çıkış Yapmak İstediğinizden Emin misiniz?</h3>
            </div>
            <div class="logout-confirmation-body">
                <p>Oturumunuz sonlandırılacak ve giriş sayfasına yönlendirileceksiniz.</p>
            </div>
            <div class="logout-confirmation-actions">
                <button class="logout-confirm-btn" onclick="confirmLogout()">
                    <span class="btn-icon">✅</span>
                    <span class="btn-text">Evet, Çıkış Yap</span>
                </button>
                <button class="logout-cancel-btn" onclick="cancelLogout()">
                    <span class="btn-icon">❌</span>
                    <span class="btn-text">İptal</span>
                </button>
            </div>
        </div>
    `;
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cancelLogout();
        }
    });
    
    document.body.appendChild(overlay);
    
    // Focus trap for accessibility
    const confirmBtn = overlay.querySelector('.logout-confirm-btn');
    confirmBtn.focus();
}

function confirmLogout() {
    // Remove session data
    localStorage.removeItem('adminSession');
    
    // Remove confirmation modal
    const overlay = document.querySelector('.logout-confirmation-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Show login form with animation
    showLoginForm();
    showNotification('Güvenli bir şekilde çıkış yaptınız. Teşekkürler! 👋', 'success');
}

function cancelLogout() {
    const overlay = document.querySelector('.logout-confirmation-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

function showLoginForm() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
    
    // Clear form
    document.getElementById('loginForm').reset();
    document.getElementById('login-error').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'grid';
    
    // Load appointments by default
    loadAppointments();
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', function() {
        loadAppointments();
        showNotification('Veriler yenilendi', 'success');
    });
    
    // Clear all data button
    document.getElementById('clearBtn').addEventListener('click', function() {
        if (confirm('TÜM randevuları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
            localStorage.removeItem('appointments');
            loadAppointments();
            loadCompletedAppointments();
            showNotification('Tüm randevular silindi', 'success');
        }
    });
    
    // Test appointment button
    document.getElementById('testBtn').addEventListener('click', function() {
        createTestAppointment();
    });
    
    // Sidebar menu items
    document.querySelectorAll('.menu-item[data-section]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            switchSection(section);
            
            // Update active state
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Filter functionality
    document.getElementById('dateFilter').addEventListener('change', filterAppointments);
    document.getElementById('statusFilter').addEventListener('change', filterAppointments);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Completed appointments filter functionality
    const completedDateFilter = document.getElementById('completedDateFilter');
    const completedSearchFilter = document.getElementById('completedSearchFilter');
    const clearCompletedFilters = document.getElementById('clearCompletedFilters');
    
    if (completedDateFilter) {
        completedDateFilter.addEventListener('change', filterCompletedAppointments);
    }
    if (completedSearchFilter) {
        completedSearchFilter.addEventListener('input', filterCompletedAppointments);
    }
    if (clearCompletedFilters) {
        clearCompletedFilters.addEventListener('click', clearCompletedFiltersFunc);
    }
}

// Load and display appointments
async function loadAppointments() {
    console.log('🔄 loadAppointments() called');
    const appointmentsList = document.getElementById('appointmentsList');
    
    if (!appointmentsList) {
        console.error('❌ appointmentsList element not found!');
        return;
    }
    
    appointmentsList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Randevular yükleniyor...</p></div>';
    
    try {
        const appointments = await getAppointments();
        console.log('=== LOADED APPOINTMENTS DEBUG ===');
        console.log('Raw localStorage data:', localStorage.getItem('appointments'));
        console.log('Parsed appointments:', appointments);
        console.log('Number of appointments:', appointments.length);
        
        // Filter out completed appointments (they will be shown in completed section)
        const activeAppointments = appointments.filter(app => app.status !== 'completed');
        
        // Debug each appointment's name fields
        activeAppointments.forEach((app, index) => {
            console.log(`Appointment ${index + 1}:`, {
                id: app.id,
                name: app.name,
                surname: app.surname,
                nameType: typeof app.name,
                surnameType: typeof app.surname,
                nameLength: app.name ? app.name.length : 0,
                surnameLength: app.surname ? app.surname.length : 0
            });
        });
        
        console.log('📋 Calling displayAppointments...');
        displayAppointments(activeAppointments);
        console.log('✅ loadAppointments completed');
    } catch (error) {
        console.error('Error loading appointments:', error);
        appointmentsList.innerHTML = '<div class="no-appointments">❌ Randevular yüklenirken hata oluştu: ' + error.message + '</div>';
    }
}

// Load and display completed appointments
async function loadCompletedAppointments() {
    console.log('🔄 loadCompletedAppointments() called');
    const completedAppointmentsList = document.getElementById('completedAppointmentsList');
    
    if (!completedAppointmentsList) {
        console.error('❌ completedAppointmentsList element not found!');
        return;
    }
    
    completedAppointmentsList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Tamamlanan randevular yükleniyor...</p></div>';
    
    try {
        const appointments = await getAppointments();
        console.log('=== LOADED COMPLETED APPOINTMENTS DEBUG ===');
        console.log('Total appointments:', appointments.length);
        
        // Filter only completed appointments
        const completedAppointments = appointments.filter(app => app.status === 'completed');
        console.log('Completed appointments:', completedAppointments.length);
        
        console.log('📋 Calling displayCompletedAppointments...');
        displayCompletedAppointments(completedAppointments);
        console.log('✅ loadCompletedAppointments completed');
    } catch (error) {
        console.error('Error loading completed appointments:', error);
        completedAppointmentsList.innerHTML = '<div class="no-appointments">❌ Tamamlanan randevular yüklenirken hata oluştu: ' + error.message + '</div>';
    }
}

// Display completed appointments in the UI
function displayCompletedAppointments(appointments) {
    console.log('📋 displayCompletedAppointments() called with', appointments.length, 'appointments');
    const completedAppointmentsList = document.getElementById('completedAppointmentsList');
    
    if (!completedAppointmentsList) {
        console.error('❌ completedAppointmentsList element not found in displayCompletedAppointments!');
        return;
    }
    
    if (appointments.length === 0) {
        console.log('📭 No completed appointments found, showing empty message');
        completedAppointmentsList.innerHTML = '<div class="no-appointments">✅ Henüz tamamlanan randevu bulunmuyor.<br><br>Randevuları tamamladığınızda burada görünecekler.</div>';
        return;
    }
    
    console.log('📋 Sorting and creating cards for', appointments.length, 'completed appointments');
    
    // Sort appointments by date and time (most recent first)
    appointments.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateB - dateA;
    });
    
    // Create appointment cards HTML
    const appointmentCards = appointments.map(appointment => createCompletedAppointmentCard(appointment)).join('');
    
    completedAppointmentsList.innerHTML = appointmentCards;
    
    console.log('✅ Completed appointments displayed successfully');
}

// Filter completed appointments
async function filterCompletedAppointments() {
    const dateFilter = document.getElementById('completedDateFilter').value;
    const searchFilter = document.getElementById('completedSearchFilter').value.toLowerCase();
    
    try {
        const appointments = await getAppointments();
        let filteredAppointments = appointments.filter(app => app.status === 'completed');
        
        // Apply date filter
        if (dateFilter) {
            filteredAppointments = filteredAppointments.filter(app => app.date === dateFilter);
        }
        
        // Apply search filter
        if (searchFilter) {
            filteredAppointments = filteredAppointments.filter(app => {
                const name = `${app.name || ''} ${app.surname || ''}`.toLowerCase();
                const phone = (app.phone || '').toLowerCase();
                return name.includes(searchFilter) || phone.includes(searchFilter);
            });
        }
        
        displayCompletedAppointments(filteredAppointments);
        
    } catch (error) {
        console.error('Error filtering completed appointments:', error);
        showNotification('Filtre uygulanırken hata oluştu!', 'error');
    }
}

// Clear completed filters
function clearCompletedFiltersFunc() {
    document.getElementById('completedDateFilter').value = '';
    document.getElementById('completedSearchFilter').value = '';
    loadCompletedAppointments();
    showNotification('Filtreler temizlendi', 'info');
}

// Display appointments in the UI
function displayAppointments(appointments) {
    console.log('📋 displayAppointments() called with', appointments.length, 'appointments');
    const appointmentsList = document.getElementById('appointmentsList');
    
    if (!appointmentsList) {
        console.error('❌ appointmentsList element not found in displayAppointments!');
        return;
    }
    
    if (appointments.length === 0) {
        console.log('📭 No appointments found, showing empty message');
        appointmentsList.innerHTML = '<div class="no-appointments">📭 Henüz randevu bulunmuyor.<br><br>🧪 "Test Ekle" butonuna basarak test randevusu oluşturabilirsiniz.</div>';
        return;
    }
    
    console.log('📋 Sorting and creating cards for', appointments.length, 'appointments');
    
    // Sort appointments by date and time
    appointments.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateB - dateA; // Most recent first
    });
    
    try {
        const cardsHTML = appointments.map((appointment, index) => {
            console.log(`Creating card ${index + 1} for:`, appointment.name, appointment.surname);
            return createAppointmentCard(appointment);
        }).join('');
        
        console.log('📋 Setting innerHTML with', cardsHTML.length, 'characters');
        appointmentsList.innerHTML = cardsHTML;
        console.log('✅ displayAppointments completed successfully');
    } catch (error) {
        console.error('❌ Error creating appointment cards:', error);
        appointmentsList.innerHTML = '<div class="no-appointments">❌ Randevu kartları oluşturulurken hata: ' + error.message + '</div>';
    }
}

// Create appointment card HTML
function createAppointmentCard(appointment) {
    console.log('🎯 Creating card for appointment:', appointment);
    console.log('Name:', appointment.name, 'Surname:', appointment.surname);
    
    const formattedDate = formatDate(appointment.date);
    const createdAt = new Date(appointment.createdAt).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const fullName = (appointment.name || '') + ' ' + (appointment.surname || '');
    console.log('Full name:', fullName);
    console.log('Full name after trim:', fullName.trim());
    console.log('Is fullName empty?', !fullName.trim());
    
    // More robust name handling
    let displayName = '';
    if (appointment.name && appointment.surname) {
        displayName = appointment.name + ' ' + appointment.surname;
    } else if (appointment.name) {
        displayName = appointment.name;
    } else if (appointment.surname) {
        displayName = appointment.surname;
    } else {
        displayName = 'İsim belirtilmemiş';
    }
    
    console.log('Final display name:', displayName);
    
    const cardHTML = `
        <div class="appointment-card collapsed" data-id="${appointment.id}">
            <div class="appointment-header" onclick="toggleAppointmentDetails('${appointment.id}')">
                <div class="appointment-info">
                    <div class="appointment-avatar">
                        <div class="avatar-circle">
                            ${displayName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="appointment-name-section">
                        <div class="appointment-name">${displayName}</div>
                        <div class="appointment-preview">${formattedDate} • ${appointment.time}</div>
                    </div>
                </div>
                <div class="header-actions">
                    <div class="appointment-status status-${appointment.status}">
                        <span class="status-icon">${getStatusIcon(appointment.status)}</span>
                        ${getStatusText(appointment.status)}
                    </div>
                    <div class="expand-icon">▼</div>
                </div>
            </div>
            
            <div class="appointment-content">
                <div class="appointment-tabs">
                    <div class="tab-buttons">
                        <button class="tab-btn active" data-tab="details">📋 Detaylar</button>
                        <button class="tab-btn" data-tab="timeline">⏰ Zaman Çizelgesi</button>
                        <button class="tab-btn" data-tab="actions">⚡ Hızlı İşlemler</button>
                    </div>
                    
                    <div class="tab-content active" data-tab="details">
                        <div class="detail-grid">
                            <div class="detail-card">
                                <div class="detail-icon">📅</div>
                                <div class="detail-info">
                                    <div class="detail-label">Randevu Tarihi</div>
                                    <div class="detail-value">${formattedDate}</div>
                                </div>
                            </div>
                            
                            <div class="detail-card">
                                <div class="detail-icon">🕒</div>
                                <div class="detail-info">
                                    <div class="detail-label">Saat</div>
                                    <div class="detail-value">${appointment.time}</div>
                                </div>
                            </div>
                            
                            <div class="detail-card">
                                <div class="detail-icon">📝</div>
                                <div class="detail-info">
                                    <div class="detail-label">Oluşturulma</div>
                                    <div class="detail-value">${createdAt}</div>
                                </div>
                            </div>
                            
                            ${appointment.phone ? `
                                <div class="detail-card phone-card">
                                    <div class="detail-icon">📱</div>
                                    <div class="detail-info">
                                        <div class="detail-label">Telefon</div>
                                        <div class="detail-value">
                                            <a href="tel:${appointment.phone}" class="phone-link">${appointment.phone}</a>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${appointment.notes ? `
                            <div class="notes-section">
                                <div class="notes-header">
                                    <span class="notes-icon">💭</span>
                                    <span class="notes-title">Müşteri Notları</span>
                                </div>
                                <div class="notes-content">${appointment.notes}</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="tab-content" data-tab="timeline">
                        <div class="timeline">
                            <div class="timeline-item">
                                <div class="timeline-dot created"></div>
                                <div class="timeline-content">
                                    <div class="timeline-title">Randevu Oluşturuldu</div>
                                    <div class="timeline-time">${createdAt}</div>
                                </div>
                            </div>
                            ${appointment.status !== 'pending' ? `
                                <div class="timeline-item">
                                    <div class="timeline-dot ${appointment.status}"></div>
                                    <div class="timeline-content">
                                        <div class="timeline-title">${getTimelineText(appointment.status)}</div>
                                        <div class="timeline-time">Durum güncellendi</div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="tab-content" data-tab="actions">
                        <div class="quick-actions-grid">
                            ${appointment.phone ? `
                                <button class="quick-action-btn whatsapp" onclick="openWhatsApp('${appointment.phone}', '${displayName}')">
                                    <span class="qa-icon">💬</span>
                                    <span class="qa-text">WhatsApp</span>
                                </button>
                            ` : ''}
                            
                                                         <button class="quick-action-btn mail" onclick="sendEmail('${appointment.phone}', '${displayName}')">
                                 <span class="qa-icon">📧</span>
                                 <span class="qa-text">Mail Gönder</span>
                             </button>
                        </div>
                    </div>
                </div>
                
                <div class="appointment-actions">
                    ${appointment.status === 'pending' ? `
                        <button class="action-btn confirm-btn" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">
                            ✅ Onayla
                        </button>
                        <button class="action-btn cancel-btn" onclick="updateAppointmentStatus('${appointment.id}', 'cancelled')">
                            ❌ İptal Et
                        </button>
                    ` : ''}
                    
                    ${appointment.status === 'confirmed' ? `
                        <button class="action-btn complete-btn" onclick="updateAppointmentStatus('${appointment.id}', 'completed')">
                            ✅ Tamamlandı
                        </button>
                        <button class="action-btn cancel-btn" onclick="updateAppointmentStatus('${appointment.id}', 'cancelled')">
                            ❌ İptal Et
                        </button>
                    ` : ''}
                    
                    ${appointment.status === 'cancelled' ? `
                        <button class="action-btn confirm-btn" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">
                            🔄 Tekrar Onayla
                        </button>
                    ` : ''}
                    
                    ${appointment.status === 'completed' ? `
                        <button class="action-btn confirm-btn" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">
                            🔄 Tekrar Aktif Et
                        </button>
                    ` : ''}
                    
                    <button class="action-btn delete-btn" onclick="deleteAppointment('${appointment.id}')">
                        🗑️ Sil
                    </button>
                </div>
            </div>
        </div>
    `;
    
    console.log('🎯 Generated card HTML length:', cardHTML.length);
    console.log('🎯 Card HTML preview:', cardHTML.substring(0, 200) + '...');
    return cardHTML;
}

// Create completed appointment card HTML
function createCompletedAppointmentCard(appointment) {
    console.log('🏗️ Creating completed appointment card for:', appointment);
    
    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const createdAt = new Date(appointment.createdAt).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Get display name
    let displayName = 'İsimsiz';
    if (appointment.name && appointment.surname) {
        displayName = `${appointment.name} ${appointment.surname}`;
    } else if (appointment.name) {
        displayName = appointment.name;
    } else if (appointment.surname) {
        displayName = appointment.surname;
    }

    const cardHTML = `
        <div class="appointment-card completed-card collapsed" data-id="${appointment.id}">
            <div class="appointment-header" onclick="toggleAppointmentDetails('${appointment.id}')">
                <div class="appointment-info">
                    <div class="appointment-avatar">
                        <div class="avatar-circle completed-avatar">
                            ${displayName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="appointment-name-section">
                        <div class="appointment-name">${displayName}</div>
                        <div class="appointment-preview">${formattedDate} • ${appointment.time} • Tamamlandı</div>
                    </div>
                </div>
                <div class="header-actions">
                    <div class="appointment-status status-completed">
                        <span class="status-icon">🎉</span>
                        Tamamlandı
                    </div>
                    <div class="expand-icon">▼</div>
                </div>
            </div>
            
            <div class="appointment-content">
                <div class="appointment-tabs">
                    <div class="tab-buttons">
                        <button class="tab-btn active" data-tab="details">📋 Detaylar</button>
                        <button class="tab-btn" data-tab="timeline">⏰ Zaman Çizelgesi</button>
                        <button class="tab-btn" data-tab="actions">⚡ İşlemler</button>
                    </div>
                    
                    <div class="tab-content active" data-tab="details">
                        <div class="detail-grid">
                            <div class="detail-card">
                                <div class="detail-icon">📅</div>
                                <div class="detail-info">
                                    <div class="detail-label">Randevu Tarihi</div>
                                    <div class="detail-value">${formattedDate}</div>
                                </div>
                            </div>
                            
                            <div class="detail-card">
                                <div class="detail-icon">🕒</div>
                                <div class="detail-info">
                                    <div class="detail-label">Saat</div>
                                    <div class="detail-value">${appointment.time}</div>
                                </div>
                            </div>
                            
                            <div class="detail-card">
                                <div class="detail-icon">📝</div>
                                <div class="detail-info">
                                    <div class="detail-label">Oluşturulma</div>
                                    <div class="detail-value">${createdAt}</div>
                                </div>
                            </div>
                            
                            ${appointment.phone ? `
                                <div class="detail-card phone-card">
                                    <div class="detail-icon">📱</div>
                                    <div class="detail-info">
                                        <div class="detail-label">Telefon</div>
                                        <div class="detail-value">
                                            <a href="tel:${appointment.phone}" class="phone-link">${appointment.phone}</a>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${appointment.notes ? `
                            <div class="notes-section">
                                <div class="notes-header">
                                    <span class="notes-icon">💭</span>
                                    <span class="notes-title">Müşteri Notları</span>
                                </div>
                                <div class="notes-content">${appointment.notes}</div>
                            </div>
                        ` : ''}
                        
                        <div class="admin-notes-section">
                            <div class="admin-notes-header">
                                <span class="notes-icon">👨‍💼</span>
                                <span class="notes-title">Yönetici Notu</span>
                                <button class="edit-admin-note-btn" onclick="toggleAdminNoteEdit('${appointment.id}')">
                                    <span class="edit-icon">✏️</span>
                                </button>
                            </div>
                            <div class="admin-notes-display" id="adminNoteDisplay-${appointment.id}">
                                ${appointment.adminNote ? appointment.adminNote : '<span class="no-admin-note">Henüz yönetici notu eklenmemiş. Telefon görüşmesi sonrası notları burada tutabilirsiniz.</span>'}
                            </div>
                            <div class="admin-notes-edit" id="adminNoteEdit-${appointment.id}" style="display: none;">
                                <textarea class="admin-note-textarea" id="adminNoteTextarea-${appointment.id}" placeholder="Telefon görüşmesi sonrası notlarınızı buraya yazın...">${appointment.adminNote || ''}</textarea>
                                <div class="admin-note-actions">
                                    <button class="save-admin-note-btn" onclick="saveAdminNote('${appointment.id}')">💾 Kaydet</button>
                                    <button class="cancel-admin-note-btn" onclick="cancelAdminNoteEdit('${appointment.id}')">❌ İptal</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" data-tab="timeline">
                        <div class="timeline">
                            <div class="timeline-item">
                                <div class="timeline-dot created"></div>
                                <div class="timeline-content">
                                    <div class="timeline-title">Randevu Oluşturuldu</div>
                                    <div class="timeline-time">${createdAt}</div>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="timeline-dot completed"></div>
                                <div class="timeline-content">
                                    <div class="timeline-title">Randevu Tamamlandı</div>
                                    <div class="timeline-time">Başarıyla tamamlandı</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" data-tab="actions">
                        <div class="quick-actions-grid">
                            ${appointment.phone ? `
                                <button class="quick-action-btn whatsapp" onclick="openWhatsApp('${appointment.phone}', '${displayName}')">
                                    <span class="qa-icon">💬</span>
                                    <span class="qa-text">WhatsApp</span>
                                </button>
                                
                                <button class="quick-action-btn mail" onclick="sendEmail('${appointment.phone}', '${displayName}')">
                                    <span class="qa-icon">📧</span>
                                    <span class="qa-text">Mail Gönder</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="appointment-actions">
                    <button class="action-btn confirm-btn" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">
                        🔄 Tekrar Aktif Et
                    </button>
                    
                    <button class="action-btn delete-btn" onclick="deleteAppointment('${appointment.id}')">
                        🗑️ Sil
                    </button>
                </div>
            </div>
        </div>
    `;

    return cardHTML;
}

// Get status text in Turkish
function getStatusText(status) {
    const statusMap = {
        'pending': 'Beklemede',
        'confirmed': 'Onaylandı',
        'cancelled': 'İptal Edildi',
        'completed': 'Tamamlandı'
    };
    return statusMap[status] || status;
}

// Get status icon
function getStatusIcon(status) {
    const iconMap = {
        'pending': '⏳',
        'confirmed': '✅',
        'cancelled': '❌',
        'completed': '🎉'
    };
    return iconMap[status] || '📅';
}

// Get timeline text
function getTimelineText(status) {
    const timelineMap = {
        'confirmed': 'Randevu Onaylandı',
        'cancelled': 'Randevu İptal Edildi',
        'completed': 'Randevu Tamamlandı'
    };
    return timelineMap[status] || 'Durum Güncellendi';
}

// Update appointment status
async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
        const appointments = await getAppointments();
        const appointmentIndex = appointments.findIndex(app => app.id === appointmentId);
        
        if (appointmentIndex === -1) {
            showNotification('Randevu bulunamadı!', 'error');
            return;
        }
        
        // Update status
        appointments[appointmentIndex].status = newStatus;
        
        // Save back to localStorage
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Reload both appointment lists
        loadAppointments();
        loadCompletedAppointments();
        
        // Show notification
        const statusTexts = {
            'confirmed': 'onaylandı',
            'cancelled': 'iptal edildi',
            'completed': 'tamamlandı olarak işaretlendi',
            'pending': 'beklemede olarak işaretlendi'
        };
        
        showNotification(`Randevu ${statusTexts[newStatus] || newStatus}`, 'success');
        
    } catch (error) {
        console.error('Error updating appointment status:', error);
        showNotification('Durum güncellenirken hata oluştu!', 'error');
    }
}

// Delete appointment
async function deleteAppointment(appointmentId) {
    if (!confirm('Bu randevuyu silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        const appointments = await getAppointments();
        const filteredAppointments = appointments.filter(app => app.id !== appointmentId);
        
        // Save back to localStorage
        localStorage.setItem('appointments', JSON.stringify(filteredAppointments));
        
        // Reload both appointment lists
        loadAppointments();
        loadCompletedAppointments();
        
        showNotification('Randevu silindi', 'success');
        
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showNotification('Randevu silinirken hata oluştu!', 'error');
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

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Filter appointments
function filterAppointments() {
    const dateFilter = document.getElementById('dateFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    getAppointments().then(appointments => {
        let filteredAppointments = appointments;
        
        // Filter by date
        if (dateFilter) {
            filteredAppointments = filteredAppointments.filter(app => app.date === dateFilter);
        }
        
        // Filter by status
        if (statusFilter) {
            filteredAppointments = filteredAppointments.filter(app => app.status === statusFilter);
        }
        
        displayAppointments(filteredAppointments);
    });
}

// Clear filters
function clearFilters() {
    document.getElementById('dateFilter').value = '';
    document.getElementById('statusFilter').value = '';
    loadAppointments();
    showNotification('Filtreler temizlendi', 'info');
}

// Create test appointment for debugging
function createTestAppointment() {
    const testAppointment = {
        id: Date.now().toString(),
        name: 'Test',
        surname: 'Kullanıcı',
        date: new Date().toISOString().split('T')[0],
        time: '14:30',
        phone: '0555 123 4567',
        notes: 'Test randevu - debug amaçlı',
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // Get existing appointments
    const existingAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    
    // Add test appointment
    existingAppointments.push(testAppointment);
    
    // Save back to localStorage
    localStorage.setItem('appointments', JSON.stringify(existingAppointments));
    
    console.log('Test appointment created:', testAppointment);
    console.log('Total appointments now:', existingAppointments.length);
    
    // Reload appointments
    loadAppointments();
    
    showNotification('✅ Test randevu oluşturuldu!', 'success');
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Toggle appointment details
function toggleAppointmentDetails(appointmentId) {
    const card = document.querySelector(`[data-id="${appointmentId}"]`);
    const content = card.querySelector('.appointment-content');
    const expandIcon = card.querySelector('.expand-icon');
    
    if (card.classList.contains('collapsed')) {
        // Expand
        card.classList.remove('collapsed');
        expandIcon.textContent = '▲';
        expandIcon.style.transform = 'rotate(0deg)';
        
        // Initialize tabs
        initializeTabs(card);
    } else {
        // Collapse
        card.classList.add('collapsed');
        expandIcon.textContent = '▼';
        expandIcon.style.transform = 'rotate(0deg)';
    }
}

// Initialize tab functionality
function initializeTabs(card) {
    const tabBtns = card.querySelectorAll('.tab-btn');
    const tabContents = card.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and content
            this.classList.add('active');
            card.querySelector(`[data-tab="${targetTab}"].tab-content`).classList.add('active');
        });
    });
}

// Quick Actions Functions
function openWhatsApp(phone, name) {
    const message = `Merhaba ${name}, randevunuz hakkında bilgi vermek istiyoruz.`;
    const url = `https://wa.me/${phone.replace(/\s/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showNotification('WhatsApp açılıyor...', 'info');
}



function sendEmail(phone, name) {
    if (!phone) {
        showNotification('Telefon numarası bulunamadı!', 'error');
        return;
    }
    
    // E-posta gönderme için mailto kullanıyoruz
    const subject = encodeURIComponent(`Randevu Hakkında - ${name}`);
    const body = encodeURIComponent(`Sayın ${name},\n\nRandevunuz hakkında bilgi vermek istiyoruz.\n\nTelefon: ${phone}\n\nİyi günler.`);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoLink;
    showNotification('E-posta uygulaması açılıyor...', 'info');
}

// Admin Note Functions
function toggleAdminNoteEdit(appointmentId) {
    const displayDiv = document.getElementById(`adminNoteDisplay-${appointmentId}`);
    const editDiv = document.getElementById(`adminNoteEdit-${appointmentId}`);
    
    if (displayDiv && editDiv) {
        if (editDiv.style.display === 'none') {
            // Show edit mode
            displayDiv.style.display = 'none';
            editDiv.style.display = 'block';
            
            // Focus on textarea
            const textarea = document.getElementById(`adminNoteTextarea-${appointmentId}`);
            if (textarea) {
                textarea.focus();
            }
        } else {
            // Hide edit mode
            displayDiv.style.display = 'block';
            editDiv.style.display = 'none';
        }
    }
}

async function saveAdminNote(appointmentId) {
    const textarea = document.getElementById(`adminNoteTextarea-${appointmentId}`);
    if (!textarea) {
        showNotification('Textarea bulunamadı!', 'error');
        return;
    }
    
    const noteText = textarea.value.trim();
    
    try {
        const appointments = await getAppointments();
        const appointmentIndex = appointments.findIndex(app => app.id === appointmentId);
        
        if (appointmentIndex === -1) {
            showNotification('Randevu bulunamadı!', 'error');
            return;
        }
        
        // Update admin note
        appointments[appointmentIndex].adminNote = noteText;
        
        // Save back to localStorage
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Update display
        const displayDiv = document.getElementById(`adminNoteDisplay-${appointmentId}`);
        if (displayDiv) {
            displayDiv.innerHTML = noteText || '<span class="no-admin-note">Henüz yönetici notu eklenmemiş. Telefon görüşmesi sonrası notları burada tutabilirsiniz.</span>';
        }
        
        // Hide edit mode
        toggleAdminNoteEdit(appointmentId);
        
        showNotification('Yönetici notu kaydedildi!', 'success');
        
    } catch (error) {
        console.error('Error saving admin note:', error);
        showNotification('Not kaydedilirken hata oluştu!', 'error');
    }
}

function cancelAdminNoteEdit(appointmentId) {
    // Reset textarea to original value
    getAppointments().then(appointments => {
        const appointment = appointments.find(app => app.id === appointmentId);
        if (appointment) {
            const textarea = document.getElementById(`adminNoteTextarea-${appointmentId}`);
            if (textarea) {
                textarea.value = appointment.adminNote || '';
            }
        }
    });
    
    // Hide edit mode
    toggleAdminNoteEdit(appointmentId);
}

// Switch between sections
function switchSection(section) {
    // Hide placeholder first
    const placeholder = document.getElementById('section-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // Hide all sections
    const allSections = document.querySelectorAll('[id$="-section"]');
    allSections.forEach(s => s.style.display = 'none');
    
    // Show selected section
    const targetSection = document.getElementById(section + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Load section-specific data
        switch(section) {
            case 'appointments':
                loadAppointments();
                break;
            case 'completed':
                loadCompletedAppointments();
                break;
            case 'calendar':
                loadCalendar();
                break;
            case 'customers':
                loadCustomers();
                break;
            case 'stats':
                loadStats();
                break;
            case 'reports':
                loadReports();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    } else {
        // Fallback to placeholder
        showSectionPlaceholder(section);
    }
}

// Show placeholder for future sections
function showSectionPlaceholder(section) {
    const mainContent = document.querySelector('.main-content');
    const sectionNames = {
        'calendar': '📅 Takvim',
        'customers': '👥 Müşteriler', 
        'stats': '📊 İstatistikler',
        'reports': '📈 Raporlar',
        'settings': '⚙️ Ayarlar'
    };
    
    // Hide appointments section
    document.getElementById('appointments-section').style.display = 'none';
    
    // Create placeholder if not exists
    let placeholder = document.getElementById('section-placeholder');
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.id = 'section-placeholder';
        placeholder.className = 'section-placeholder';
        mainContent.appendChild(placeholder);
    }
    
    placeholder.innerHTML = `
        <div class="placeholder-content">
            <div class="placeholder-icon">${sectionNames[section].split(' ')[0]}</div>
            <h2>${sectionNames[section]}</h2>
            <p>Bu bölüm yakında eklenecek!</p>
            <p class="placeholder-note">Şu anda sadece <strong>Randevular</strong> bölümü aktif.</p>
            <button onclick="switchSection('appointments')" class="simple-btn">📋 Randevulara Dön</button>
        </div>
    `;
    placeholder.style.display = 'flex';
}

// Calendar Section Functions
async function loadCalendar() {
    const currentDate = new Date();
    await displayCalendar(currentDate);
    
    // Setup calendar navigation
    document.getElementById('prevMonth').onclick = async () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        await displayCalendar(currentDate);
    };
    
    document.getElementById('nextMonth').onclick = async () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        await displayCalendar(currentDate);
    };
}

async function displayCalendar(date) {
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    
    document.getElementById('currentMonth').textContent = 
        `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    // Get all appointments first
    const appointments = await getAppointments();
    
    // Calendar header
    const daysOfWeek = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });
    
    // Calendar days
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    for (let i = 0; i < 42; i++) {
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        if (currentDay.getMonth() !== date.getMonth()) {
            dayElement.classList.add('other-month');
        }
        
        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = currentDay.getDate();
        dayElement.appendChild(dayNumber);
        
        // Check for appointments on this day
        const dayAppointments = appointments.filter(app => app.date === currentDay.toISOString().split('T')[0]);
        
        if (dayAppointments.length > 0) {
            dayElement.classList.add('has-appointment');
            
            // Add appointment count indicator (hidden but for screen readers)
            const appointmentsIndicator = document.createElement('div');
            appointmentsIndicator.className = 'appointments-count';
            appointmentsIndicator.textContent = dayAppointments.length;
            appointmentsIndicator.style.display = 'none'; // Hidden but present for hover
            dayElement.appendChild(appointmentsIndicator);
            
            // Add hover functionality for all appointments
            dayElement.addEventListener('mouseenter', (e) => {
                showHoverPreview(e, currentDay, dayAppointments);
            });
            
            dayElement.addEventListener('mouseleave', () => {
                hideHoverPreview();
            });
            
            // Add click functionality to show day appointments
            dayElement.addEventListener('click', (e) => {
                e.stopPropagation();
                showDayAppointments(currentDay, dayAppointments);
            });
        }
        
        calendar.appendChild(dayElement);
    }
}

// Show appointment popup
function showAppointmentPopup(appointment) {
    const popup = document.createElement('div');
    popup.className = 'appointment-popup-overlay';
    
    // Get display name
    let displayName = 'İsimsiz';
    if (appointment.name && appointment.surname) {
        displayName = `${appointment.name} ${appointment.surname}`;
    } else if (appointment.name) {
        displayName = appointment.name;
    } else if (appointment.surname) {
        displayName = appointment.surname;
    }
    
    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    popup.innerHTML = `
        <div class="appointment-popup">
            <div class="popup-header">
                <h3>📅 Randevu Detayı</h3>
                <button class="popup-close" onclick="closeAppointmentPopup()">&times;</button>
            </div>
            <div class="popup-content">
                <div class="popup-info">
                    <div class="popup-avatar">
                        <div class="avatar-circle">
                            ${displayName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="popup-details">
                        <div class="popup-name">${displayName}</div>
                        <div class="popup-datetime">${formattedDate} • ${appointment.time}</div>
                        <div class="popup-status status-${appointment.status}">
                            ${getStatusIcon(appointment.status)} ${getStatusText(appointment.status)}
                        </div>
                    </div>
                </div>
                ${appointment.phone ? `
                    <div class="popup-contact">
                        <strong>📱 Telefon:</strong> 
                        <a href="tel:${appointment.phone}" class="phone-link">${appointment.phone}</a>
                    </div>
                ` : ''}
                ${appointment.notes ? `
                    <div class="popup-notes">
                        <strong>💭 Notlar:</strong>
                        <div class="notes-text">${appointment.notes}</div>
                    </div>
                ` : ''}
            </div>
            <div class="popup-actions">
                <button class="popup-btn edit-btn" onclick="editAppointmentFromCalendar('${appointment.id}')">
                    ✏️ Düzenle
                </button>
                <button class="popup-btn whatsapp-btn" onclick="openWhatsApp('${appointment.phone}', '${displayName}')">
                    💬 WhatsApp
                </button>
            </div>
        </div>
    `;
    
    // Close on overlay click
    popup.onclick = (e) => {
        if (e.target === popup) {
            closeAppointmentPopup();
        }
    };
    
    document.body.appendChild(popup);
}

// Close appointment popup
function closeAppointmentPopup() {
    const popup = document.querySelector('.appointment-popup-overlay');
    if (popup) {
        popup.remove();
    }
}

// Show all appointments for a specific day
function showDayAppointments(date, appointments) {
    const popup = document.createElement('div');
    popup.className = 'appointment-popup-overlay';
    
    const formattedDate = date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        weekday: 'long'
    });
    
    let appointmentsList = '';
    appointments.forEach(appointment => {
        let displayName = 'İsimsiz';
        if (appointment.name && appointment.surname) {
            displayName = `${appointment.name} ${appointment.surname}`;
        } else if (appointment.name) {
            displayName = appointment.name;
        } else if (appointment.surname) {
            displayName = appointment.surname;
        }
        
        appointmentsList += `
            <div class="day-appointment-item status-${appointment.status}" onclick="showAppointmentPopup(${JSON.stringify(appointment).replace(/"/g, '&quot;')})">
                <div class="appointment-time-detail">${appointment.time}</div>
                <div class="appointment-customer-detail">${displayName}</div>
                <div class="appointment-status-detail">${getStatusIcon(appointment.status)}</div>
            </div>
        `;
    });
    
    popup.innerHTML = `
        <div class="appointment-popup day-appointments-popup">
            <div class="popup-header">
                <h3>📅 ${formattedDate}</h3>
                <button class="popup-close" onclick="closeAppointmentPopup()">&times;</button>
            </div>
            <div class="popup-content">
                <div class="day-appointments-list">
                    ${appointmentsList}
                </div>
            </div>
        </div>
    `;
    
    // Close on overlay click
    popup.onclick = (e) => {
        if (e.target === popup) {
            closeAppointmentPopup();
        }
    };
    
    document.body.appendChild(popup);
}

// Show hover preview for multiple appointments
function showHoverPreview(event, date, appointments) {
    // Remove any existing hover preview
    hideHoverPreview();
    
    const preview = document.createElement('div');
    preview.className = 'hover-preview';
    preview.id = 'hover-preview';
    
    const formattedDate = date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        weekday: 'short'
    });
    
    let appointmentsList = '';
    appointments.forEach(appointment => {
        let displayName = 'İsimsiz';
        if (appointment.name && appointment.surname) {
            displayName = `${appointment.name} ${appointment.surname}`;
        } else if (appointment.name) {
            displayName = appointment.name;
        } else if (appointment.surname) {
            displayName = appointment.surname;
        }
        
        // Truncate long names for hover preview
        if (displayName.length > 15) {
            displayName = displayName.substring(0, 15) + '...';
        }
        
        appointmentsList += `
            <div class="hover-appointment status-${appointment.status}">
                <div class="hover-time">${appointment.time}</div>
                <div class="hover-name">${displayName}</div>
                <div class="hover-status">${getStatusIcon(appointment.status)}</div>
            </div>
        `;
    });
    
    preview.innerHTML = `
        <div class="hover-header">
            <span class="hover-date">${formattedDate}</span>
            <span class="hover-count">${appointments.length} randevu</span>
        </div>
        <div class="hover-appointments">
            ${appointmentsList}
        </div>
    `;
    
    // Position the preview near the mouse
    const rect = event.currentTarget.getBoundingClientRect();
    preview.style.position = 'fixed';
    preview.style.left = (rect.right + 10) + 'px';
    preview.style.top = rect.top + 'px';
    
    // Check if preview goes out of viewport and adjust
    document.body.appendChild(preview);
    
    const previewRect = preview.getBoundingClientRect();
    if (previewRect.right > window.innerWidth) {
        preview.style.left = (rect.left - previewRect.width - 10) + 'px';
    }
    if (previewRect.bottom > window.innerHeight) {
        preview.style.top = (window.innerHeight - previewRect.height - 10) + 'px';
    }
}

// Hide hover preview
function hideHoverPreview() {
    const preview = document.getElementById('hover-preview');
    if (preview) {
        preview.remove();
    }
}

// Global event to hide hover preview on various actions
document.addEventListener('click', hideHoverPreview);
document.addEventListener('scroll', hideHoverPreview);
window.addEventListener('resize', hideHoverPreview);

// Edit appointment from calendar
function editAppointmentFromCalendar(appointmentId) {
    closeAppointmentPopup();
    // Switch to appointments section and highlight the appointment
    switchSection('appointments');
    
    // Scroll to and highlight the appointment
    setTimeout(() => {
        const appointmentCard = document.querySelector(`[data-id="${appointmentId}"]`);
        if (appointmentCard) {
            appointmentCard.scrollIntoView({ behavior: 'smooth' });
            appointmentCard.style.border = '3px solid #f59e0b';
            setTimeout(() => {
                appointmentCard.style.border = '';
            }, 3000);
        }
    }, 500);
}

// Customers Section Functions
async function loadCustomers() {
    const appointments = await getAppointments();
    const customers = getUniqueCustomers(appointments);
    displayCustomers(customers);
    
    // Setup search
    document.getElementById('customerSearch').oninput = (e) => {
        const filtered = customers.filter(customer => 
            customer.name.toLowerCase().includes(e.target.value.toLowerCase())
        );
        displayCustomers(filtered);
    };
}

function getUniqueCustomers(appointments) {
    const customerMap = new Map();
    
    appointments.forEach(app => {
        const key = `${app.name}_${app.surname}`;
        if (!customerMap.has(key)) {
            customerMap.set(key, {
                name: `${app.name} ${app.surname}`,
                phone: app.phone,
                appointments: []
            });
        }
        customerMap.get(key).appointments.push(app);
    });
    
    return Array.from(customerMap.values());
}

function displayCustomers(customers) {
    const container = document.getElementById('customersList');
    if (customers.length === 0) {
        container.innerHTML = '<div class="no-data">Müşteri bulunamadı</div>';
        return;
    }
    
    container.innerHTML = customers.map(customer => `
        <div class="customer-card">
            <h3>${customer.name}</h3>
            <p>📱 ${customer.phone || 'Telefon belirtilmemiş'}</p>
            <p>📅 ${customer.appointments.length} randevu</p>
            <small>Son randevu: ${customer.appointments[customer.appointments.length - 1].date}</small>
        </div>
    `).join('');
}

// Stats Section Functions
async function loadStats() {
    const appointments = await getAppointments();
    
    // Calculate stats
    const now = new Date();
    const thisMonth = appointments.filter(app => {
        const appDate = new Date(app.date);
        return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
    });
    
    const completed = appointments.filter(app => app.status === 'completed');
    const pending = appointments.filter(app => app.status === 'pending');
    const customers = getUniqueCustomers(appointments);
    
    // Update UI
    document.getElementById('thisMonthCount').textContent = thisMonth.length;
    document.getElementById('completedCount').textContent = completed.length;
    document.getElementById('pendingCount').textContent = pending.length;
    document.getElementById('customerCount').textContent = customers.length;
    
    // Generate simple chart
    generateMonthlyChart(appointments);
}

function generateMonthlyChart(appointments) {
    const chart = document.getElementById('monthlyChart');
    const monthCounts = new Array(12).fill(0);
    
    appointments.forEach(app => {
        const month = new Date(app.date).getMonth();
        monthCounts[month]++;
    });
    
    const max = Math.max(...monthCounts);
    chart.innerHTML = monthCounts.map((count, index) => {
        const height = max > 0 ? (count / max) * 100 : 0;
        return `
            <div class="chart-bar" style="height: ${height}%;" title="${count} randevu">
                <span class="chart-month">${index + 1}</span>
            </div>
        `;
    }).join('');
}

// Reports Section Functions
function loadReports() {
    document.getElementById('reportMonth').value = new Date().toISOString().slice(0, 7);
}

async function generateReport() {
    const type = document.getElementById('reportType').value;
    const month = document.getElementById('reportMonth').value;
    const appointments = await getAppointments();
    
    let filtered = appointments;
    if (month) {
        filtered = appointments.filter(app => app.date.startsWith(month));
    }
    
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = `
        <div class="report-summary">
            <h3>📊 ${type === 'monthly' ? 'Aylık' : type === 'weekly' ? 'Haftalık' : 'Günlük'} Rapor</h3>
            <p>Toplam Randevu: ${filtered.length}</p>
            <p>Tamamlanan: ${filtered.filter(a => a.status === 'completed').length}</p>
            <p>Bekleyen: ${filtered.filter(a => a.status === 'pending').length}</p>
            <p>İptal Edilen: ${filtered.filter(a => a.status === 'cancelled').length}</p>
        </div>
        <div class="report-table">
            <table>
                <thead>
                    <tr><th>Tarih</th><th>İsim</th><th>Saat</th><th>Durum</th></tr>
                </thead>
                <tbody>
                    ${filtered.map(app => `
                        <tr>
                            <td>${app.date}</td>
                            <td>${app.name} ${app.surname}</td>
                            <td>${app.time}</td>
                            <td>${getStatusText(app.status)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function exportReport() {
    // Simple CSV export
    getAppointments().then(appointments => {
        const csv = 'Tarih,İsim,Soyisim,Saat,Telefon,Durum\n' + 
            appointments.map(app => 
                `${app.date},${app.name},${app.surname},${app.time},${app.phone || ''},${getStatusText(app.status)}`
            ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'randevular.csv';
        a.click();
        
        showNotification('Rapor indirildi', 'success');
    });
}

// Settings Section Functions
function loadSettings() {
    // Load saved settings
    const settings = JSON.parse(localStorage.getItem('adminSettings') || '{}');
    
    document.getElementById('startTime').value = settings.startTime || '09:00';
    document.getElementById('endTime').value = settings.endTime || '18:00';
    document.getElementById('theme').value = settings.theme || 'light';
    
    // Load admin security information
    loadAdminSecurityInfo();
}

function saveSettings() {
    const settings = {
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        theme: document.getElementById('theme').value
    };
    
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showNotification('Ayarlar kaydedildi', 'success');
}

// Auto refresh every 30 seconds
setInterval(() => {
    loadAppointments();
}, 30000);

// ============================================
// ADMIN SECURITY SETTINGS FUNCTIONS
// ============================================

// Load admin security information on settings page load
function loadAdminSecurityInfo() {
    const adminData = JSON.parse(localStorage.getItem('adminCredentials') || '{}');
    
    // Update current admin ID display
    const currentAdminIdElement = document.getElementById('currentAdminId');
    if (currentAdminIdElement) {
        currentAdminIdElement.textContent = adminData.adminId || 'admin';
    }
    
    // Update last password change display
    const lastPasswordChangeElement = document.getElementById('lastPasswordChange');
    if (lastPasswordChangeElement) {
        if (adminData.lastPasswordChange) {
            const date = new Date(adminData.lastPasswordChange);
            lastPasswordChangeElement.textContent = date.toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            lastPasswordChangeElement.textContent = 'Hiç değiştirilmemiş';
        }
    }
}

// Check password strength
function checkPasswordStrength(password) {
    const strengthIndicator = document.getElementById('passwordStrength');
    if (!strengthIndicator) return;
    
    let score = 0;
    let feedback = '';
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    // Remove previous classes
    strengthIndicator.className = 'password-strength';
    
    if (score < 3) {
        strengthIndicator.classList.add('weak');
    } else if (score < 5) {
        strengthIndicator.classList.add('medium');
    } else {
        strengthIndicator.classList.add('strong');
    }
}

// Check password match
function checkPasswordMatch() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchIndicator = document.getElementById('passwordMatch');
    
    if (!matchIndicator) return;
    
    matchIndicator.className = 'password-match';
    
    if (confirmPassword === '') {
        matchIndicator.textContent = '';
        return;
    }
    
    if (newPassword === confirmPassword) {
        matchIndicator.classList.add('match');
        matchIndicator.textContent = '✅ Şifreler eşleşiyor';
    } else {
        matchIndicator.classList.add('no-match');
        matchIndicator.textContent = '❌ Şifreler eşleşmiyor';
    }
}

// Main function to change admin credentials
async function changeAdminCredentials() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newAdminId = document.getElementById('newAdminId').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Basic validations
    if (!currentPassword) {
        showNotification('Mevcut şifrenizi girmelisiniz!', 'error');
        return;
    }
    
    if (!newPassword) {
        showNotification('Yeni şifre alanı boş olamaz!', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showNotification('Yeni şifre en az 8 karakter olmalı!', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('Yeni şifreler eşleşmiyor!', 'error');
        return;
    }
    
    // Get current admin credentials
    const currentAdminData = JSON.parse(localStorage.getItem('adminCredentials') || '{}');
    const defaultAdminId = 'admin';
    const defaultPassword = '123456';
    
    const currentAdminIdToCheck = currentAdminData.adminId || defaultAdminId;
    const currentPasswordToCheck = currentAdminData.password || defaultPassword;
    
    // Verify current password
    if (currentPassword !== currentPasswordToCheck) {
        showNotification('Mevcut şifre yanlış!', 'error');
        return;
    }
    
    // Prepare new credentials
    const newCredentials = {
        adminId: newAdminId || currentAdminIdToCheck, // Keep current ID if new one is empty
        password: newPassword,
        lastPasswordChange: new Date().toISOString(),
        changeHistory: [
            ...(currentAdminData.changeHistory || []),
            {
                date: new Date().toISOString(),
                action: 'Credentials updated',
                oldAdminId: currentAdminIdToCheck,
                newAdminId: newAdminId || currentAdminIdToCheck
            }
        ]
    };
    
    try {
        // Save new credentials
        localStorage.setItem('adminCredentials', JSON.stringify(newCredentials));
        
        // Update session data (so user doesn't get logged out)
        const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
        sessionData.adminId = newCredentials.adminId;
        localStorage.setItem('adminSession', JSON.stringify(sessionData));
        
        // Clear the form
        resetSecurityForm();
        
        // Update the display
        loadAdminSecurityInfo();
        
        // Show success message
        showNotification('🎉 Admin bilgileri başarıyla güncellendi!', 'success');
        
        // Show a more detailed notification
        setTimeout(() => {
            showNotification(`Yeni Kullanıcı ID: ${newCredentials.adminId}`, 'info');
        }, 1500);
        
    } catch (error) {
        console.error('Error saving admin credentials:', error);
        showNotification('Bilgiler kaydedilirken hata oluştu!', 'error');
    }
}

// Reset the security form
function resetSecurityForm() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newAdminId').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    // Clear strength and match indicators
    const strengthIndicator = document.getElementById('passwordStrength');
    if (strengthIndicator) {
        strengthIndicator.className = 'password-strength';
    }
    
    const matchIndicator = document.getElementById('passwordMatch');
    if (matchIndicator) {
        matchIndicator.textContent = '';
        matchIndicator.className = 'password-match';
    }
    
    showNotification('Form temizlendi', 'info');
}

// Duplicate handleLogin function removed - using the updated one above

// Add event listeners for real-time password checking
document.addEventListener('DOMContentLoaded', function() {
    // Password strength checker
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
    
    // Password match checker
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }
    
    // Also check match when new password changes
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswordMatch);
    }
    
    // Load admin security info when settings section is shown
    const settingsMenuItems = document.querySelectorAll('[data-section="settings"]');
    settingsMenuItems.forEach(item => {
        item.addEventListener('click', function() {
            setTimeout(loadAdminSecurityInfo, 100); // Small delay to ensure DOM is ready
        });
    });
    
    // Load admin security info on page load if settings is already active
    if (document.querySelector('#settings-section').style.display !== 'none') {
        loadAdminSecurityInfo();
    }
}); 