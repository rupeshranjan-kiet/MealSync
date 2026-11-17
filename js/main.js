(function () {
    'use strict';


    document.addEventListener('DOMContentLoaded', function () {
        initToastSystem();
        initNavigation();
        initDashboard();
        initAttendance();
        initLogin();
        initFeedback();
        initComplaints();
        initMealDemand();
        initFoodWaste();
        initHygiene();
        initAdminMenu();
        initProfile();
    });



    function initToastSystem() {
        if (document.getElementById('mealsync-toast-container')) return;

        const style = document.createElement('style');
        style.id = 'mealsync-interactive-styles';
        style.textContent = `
            #mealsync-toast-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }
            .mealsync-toast {
                min-width: 280px;
                max-width: 400px;
                padding: 12px 18px;
                background: #172033;
                color: #ffffff;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 12px;
                opacity: 0;
                transform: translateY(16px);
                transition: opacity 0.25s ease, transform 0.25s ease;
                pointer-events: auto;
            }
            .mealsync-toast.show {
                opacity: 1;
                transform: translateY(0);
            }
            .mealsync-toast-success {
                border-left: 5px solid #16a34a;
            }
            .mealsync-toast-error {
                border-left: 5px solid #dc2626;
            }
            .mealsync-toast-info {
                border-left: 5px solid #2563eb;
            }
            .mealsync-toast-icon {
                font-size: 16px;
                font-weight: bold;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.15);
                flex-shrink: 0;
            }
            nav a.active-nav-link {
                color: var(--primary) !important;
                border-bottom: 2px solid var(--primary);
                padding-bottom: 2px;
            }
            .attendance-actions .yes-button.active,
            .attendance-actions .no-button.active {
                outline: 3px solid #2563eb;
                box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
            }
        `;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.id = 'mealsync-toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('mealsync-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `mealsync-toast mealsync-toast-${type}`;

        let icon = 'ℹ';
        if (type === 'success') icon = '✓';
        else if (type === 'error') icon = '!';

        toast.innerHTML = `
            <span class="mealsync-toast-icon">${icon}</span>
            <span class="mealsync-toast-msg">${escapeHtml(message)}</span>
        `;
        container.appendChild(toast);

        // Force browser reflow to trigger animation
        void toast.offsetWidth;
        toast.classList.add('show');

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3200);
    }

    
    //     NAVIGATION HIGHLIGHTER
     

    function initNavigation() {
        const rawPath = window.location.pathname;
        let currentFile = rawPath.substring(rawPath.lastIndexOf('/') + 1);
        if (!currentFile || currentFile === '') {
            currentFile = 'index.html';
        }

        const navLinks = document.querySelectorAll('header nav a');
        navLinks.forEach(function (link) {
            const href = link.getAttribute('href');
            if (href === currentFile) {
                link.classList.add('active-nav-link');
            }
        });
    }

    
    //    3. STUDENT DASHBOARD (index.html)

    function initDashboard() {
        const mealButtons = document.querySelectorAll('.meal-action-card .meal-button');
        if (!mealButtons.length) return;

        const savedAttendance = getStoredData('mealsync_attendance', {});

        // Restore saved status on load
        Object.keys(savedAttendance).forEach(function (meal) {
            const status = savedAttendance[meal];
            const btn = document.querySelector(`.meal-button[data-meal="${meal}"][data-status="${status}"]`);
            if (btn) {
                btn.classList.add('active');
            }

            const statusEl = document.getElementById(`${meal}-status`);
            if (statusEl) {
                if (status === 'having') {
                    statusEl.textContent = '✓ Marked as Having';
                    statusEl.style.color = 'var(--success)';
                } else if (status === 'skipping') {
                    statusEl.textContent = '✕ Marked as Skipped';
                    statusEl.style.color = 'var(--muted)';
                }
            }
        });

        // Add click listener to attendance toggle buttons
        mealButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                const meal = this.dataset.meal;
                const status = this.dataset.status;
                if (!meal || !status) return;

                const card = this.closest('.meal-action-card');
                if (card) {
                    card.querySelectorAll('.meal-button').forEach(function (b) {
                        b.classList.remove('active');
                    });
                }
                this.classList.add('active');

                const statusEl = document.getElementById(`${meal}-status`);
                if (statusEl) {
                    if (status === 'having') {
                        statusEl.textContent = '✓ Marked as Having';
                        statusEl.style.color = 'var(--success)';
                    } else {
                        statusEl.textContent = '✕ Marked as Skipped';
                        statusEl.style.color = 'var(--muted)';
                    }
                }

                savedAttendance[meal] = status;
                setStoredData('mealsync_attendance', savedAttendance);

                const mealCapitalized = meal.charAt(0).toUpperCase() + meal.slice(1);
                showToast(`${mealCapitalized} marked as ${status === 'having' ? 'Attending' : 'Skipped'}.`, 'success');
            });
        });
    }

    
    //    4. ATTENDANCE PAGE (attendance.html)
       

    function initAttendance() {
        const cards = document.querySelectorAll('.attendance-card');
        if (!cards.length) return;

        const savedAttendance = getStoredData('mealsync_attendance', {});

        cards.forEach(function (card) {
            const heading = card.querySelector('h3');
            if (!heading) return;
            const mealKey = heading.textContent.trim().toLowerCase();

            const yesBtn = card.querySelector('.yes-button');
            const noBtn = card.querySelector('.no-button');

            function applyButtonState(choice) {
                if (choice === 'having') {
                    if (yesBtn) yesBtn.classList.add('active');
                    if (noBtn) noBtn.classList.remove('active');
                } else if (choice === 'skipping') {
                    if (noBtn) noBtn.classList.add('active');
                    if (yesBtn) yesBtn.classList.remove('active');
                }
            }

            // Restore on load
            if (savedAttendance[mealKey]) {
                applyButtonState(savedAttendance[mealKey]);
            }

            if (yesBtn) {
                yesBtn.addEventListener('click', function () {
                    applyButtonState('having');
                    savedAttendance[mealKey] = 'having';
                    setStoredData('mealsync_attendance', savedAttendance);
                    showToast(`Marked ${heading.textContent.trim()} as Having!`, 'success');
                });
            }

            if (noBtn) {
                noBtn.addEventListener('click', function () {
                    applyButtonState('skipping');
                    savedAttendance[mealKey] = 'skipping';
                    setStoredData('mealsync_attendance', savedAttendance);
                    showToast(`Marked ${heading.textContent.trim()} as Skipped.`, 'info');
                });
            }
        });
    }

    
    //    5. LOGIN PORTAL (login.html)
        

    function initLogin() {
        const loginPage = document.querySelector('.login-page');
        if (!loginPage) return;

        const loginForm = loginPage.querySelector('form');
        if (!loginForm) return;

        const idInput = document.getElementById('login-id');
        const passInput = document.getElementById('password');
        const rememberCheckbox = loginForm.querySelector('input[name="remember"]');

        // Pre-fill remembered ID if present
        const savedId = localStorage.getItem('mealsync_remember_id');
        if (savedId && idInput) {
            idInput.value = savedId;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }

        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const idVal = idInput ? idInput.value.trim() : '';
            const passVal = passInput ? passInput.value.trim() : '';

            if (!idVal) {
                showToast('Please enter your Student ID or Email.', 'error');
                if (idInput) idInput.focus();
                return;
            }

            if (!passVal) {
                showToast('Please enter your password.', 'error');
                if (passInput) passInput.focus();
                return;
            }

            // Check if remember me is checked
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('mealsync_remember_id', idVal);
            } else {
                localStorage.removeItem('mealsync_remember_id');
            }

            // Determine role: if ID or password contains "admin", log in as mess admin
            const isAdmin = idVal.toLowerCase().includes('admin') || passVal.toLowerCase() === 'admin';

            setStoredData('mealsync_session', {
                id: idVal,
                role: isAdmin ? 'admin' : 'student',
                loginTime: new Date().toISOString()
            });

            if (isAdmin) {
                showToast('Signed in as Administrator. Redirecting...', 'success');
                setTimeout(function () {
                    window.location.href = 'admin.html';
                }, 700);
            } else {
                showToast('Signed in successfully! Welcome to MealSync.', 'success');
                setTimeout(function () {
                    window.location.href = 'index.html';
                }, 700);
            }
        });
    }

    
    //    6. FEEDBACK FORM (feedback.html)
      

    function initFeedback() {
        const feedbackSection = document.querySelector('.feedback-form-section');
        if (!feedbackSection) return;

        const form = feedbackSection.querySelector('form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const mealSelect = document.getElementById('meal');
            if (!mealSelect || !mealSelect.value) {
                showToast('Please select which meal you are reviewing.', 'error');
                if (mealSelect) mealSelect.focus();
                return;
            }

            const mealName = mealSelect.options[mealSelect.selectedIndex].text;
            const taste = form.querySelector('select[name="taste"]')?.value || 'Good';
            const quality = form.querySelector('select[name="quality"]')?.value || 'Good';
            const quantity = form.querySelector('select[name="quantity"]')?.value || 'Good';
            const hygiene = form.querySelector('select[name="hygiene"]')?.value || 'Good';
            const overall = form.querySelector('select[name="overall"]')?.value || '4';
            const suggestion = document.getElementById('suggestion')?.value.trim() || '';

            const feedbackList = getStoredData('mealsync_feedbacks', []);
            feedbackList.unshift({
                meal: mealName,
                taste,
                quality,
                quantity,
                hygiene,
                overall,
                suggestion,
                date: new Date().toLocaleDateString()
            });
            setStoredData('mealsync_feedbacks', feedbackList);

            showToast(`Thank you! Your feedback for ${mealName} has been submitted.`, 'success');
            form.reset();
        });
    }

   
   //    COMPLAINTS SYSTEM (complaints.html)
      

    function initComplaints() {
        const complaintSection = document.querySelector('.complaint-form-section');
        if (!complaintSection) return;

        const form = complaintSection.querySelector('form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const categorySelect = document.getElementById('category');
            const mealSelect = document.getElementById('meal');
            const descArea = document.getElementById('description');

            if (!categorySelect || !categorySelect.value) {
                showToast('Please select a complaint category.', 'error');
                if (categorySelect) categorySelect.focus();
                return;
            }

            const description = descArea ? descArea.value.trim() : '';
            if (!description) {
                showToast('Please describe the issue in detail.', 'error');
                if (descArea) descArea.focus();
                return;
            }

            const categoryText = categorySelect.options[categorySelect.selectedIndex].text;
            const mealText = mealSelect && mealSelect.value ? mealSelect.options[mealSelect.selectedIndex].text : '';
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const complaintId = `#MS${randomNum}`;

            // Add new complaint card to tracking list
            const listContainer = document.querySelector('.complaint-list');
            if (listContainer) {
                const article = document.createElement('article');
                article.className = 'complaint-card';
                article.innerHTML = `
                    <div class="complaint-card-top">
                        <div>
                            <span class="complaint-category">${escapeHtml(categoryText)}${mealText ? ' • ' + escapeHtml(mealText) : ''}</span>
                            <h3>${escapeHtml(description.length > 50 ? description.substring(0, 50) + '...' : description)}</h3>
                        </div>
                        <span class="status-review">Under Review</span>
                    </div>
                    <p class="complaint-description">${escapeHtml(description)}</p>
                    <div class="complaint-meta">
                        <span>📅 Just now</span>
                        <span>ID: ${complaintId}</span>
                    </div>
                `;
                listContainer.insertBefore(article, listContainer.firstChild);

                // Update count badge
                const countBadge = document.querySelector('.complaint-count');
                if (countBadge) {
                    const totalCount = listContainer.querySelectorAll('.complaint-card').length;
                    countBadge.textContent = `${totalCount} Total`;
                }
            }

            showToast(`Complaint submitted! Reference ID: ${complaintId}`, 'success');
            form.reset();
        });
    }

    
    //MEAL DEMAND CALCULATOR (meal-demand.html)
       

    function initMealDemand() {
        const demandForm = document.querySelector('.demand-form');
        if (!demandForm) return;

        // Auto-set today's date if empty
        const dateInput = document.getElementById('demand-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        function calculateDemand() {
            const registeredInput = document.getElementById('registered');
            const attendanceInput = document.getElementById('attendance');
            const avgServingInput = document.getElementById('avg-serving');
            const bufferSelect = document.getElementById('buffer');

            const totalRegistered = parseFloat(registeredInput?.value) || 450;
            const enteredAttendance = parseFloat(attendanceInput?.value);
            const attendance = !isNaN(enteredAttendance) && enteredAttendance > 0
                ? enteredAttendance
                : Math.round(totalRegistered * 0.85);

            const avgServing = parseFloat(avgServingInput?.value) || 0.25;
            const bufferText = bufferSelect ? bufferSelect.value : '5%';
            const bufferPct = parseFloat(bufferText) || 5;

            const totalKg = Math.round(attendance * avgServing * (1 + bufferPct / 100));

            // Update recommendation section
            const recSection = document.querySelector('.demand-recommendation');
            if (recSection) {
                const heading = recSection.querySelector('.recommendation-content h2');
                const description = recSection.querySelector('.recommendation-content p:not(.small-heading)');
                const numberStrong = recSection.querySelector('.recommendation-number strong');

                if (heading) heading.textContent = `Prepare approximately ${totalKg} KG`;
                if (description) description.textContent = `Based on ${attendance} expected students and a ${bufferPct}% safety buffer.`;
                if (numberStrong) numberStrong.textContent = `${attendance}`;
            }

            return { totalKg, attendance, bufferPct };
        }

        demandForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const result = calculateDemand();
            showToast(`Requirement calculated: ${result.totalKg} KG for ${result.attendance} students.`, 'success');
        });

        // Recalculate live on input
        ['registered', 'attendance', 'avg-serving', 'buffer'].forEach(function (id) {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', calculateDemand);
                element.addEventListener('change', calculateDemand);
            }
        });
    }

     
    // FOOD WASTE MANAGEMENT (food-waste.html)
       

    function initFoodWaste() {
        const wasteForm = document.querySelector('.waste-form');
        if (!wasteForm) return;

        // Auto-set today's date if empty
        const dateInput = document.getElementById('waste-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        const preparedInput = document.getElementById('prepared');
        const servedInput = document.getElementById('served');
        const wastedInput = document.getElementById('wasted');

        function autoCalculateWaste() {
            const prepared = parseFloat(preparedInput?.value);
            const served = parseFloat(servedInput?.value);

            if (!isNaN(prepared) && !isNaN(served) && wastedInput) {
                const difference = Math.max(0, prepared - served);
                wastedInput.value = Math.round(difference * 10) / 10;
            }
        }

        if (preparedInput) preparedInput.addEventListener('input', autoCalculateWaste);
        if (servedInput) servedInput.addEventListener('input', autoCalculateWaste);

        wasteForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const mealSelect = document.getElementById('waste-meal');
            const mealName = mealSelect && mealSelect.value ? mealSelect.value : 'Today';
            const wastedAmount = wastedInput && wastedInput.value ? wastedInput.value : '0';

            showToast(`Waste record of ${wastedAmount} KG saved for ${mealName}.`, 'success');
            wasteForm.reset();

            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        });
    }

    
    //    HYGIENE AUDIT CHECKLIST (hygiene.html)
       

    function initHygiene() {
        const auditSection = document.querySelector('.hygiene-audit-section');
        if (!auditSection) return;

        const checkboxes = auditSection.querySelectorAll('input[type="checkbox"]');
        const scoreStrong = document.querySelector('.hygiene-score strong');
        const scoreSpan = document.querySelector('.hygiene-score span');

        function recalculateHygieneScore() {
            if (!checkboxes.length) return;

            let checkedCount = 0;
            checkboxes.forEach(function (cb) {
                if (cb.checked) checkedCount++;
            });

            const percentage = Math.round((checkedCount / checkboxes.length) * 100);

            if (scoreStrong) {
                scoreStrong.textContent = `${percentage}%`;
            }

            let rating = 'Needs Attention';
            let color = '#dc2626';

            if (percentage >= 90) {
                rating = 'Excellent';
                color = '#16a34a';
            } else if (percentage >= 75) {
                rating = 'Good';
                color = '#2563eb';
            } else if (percentage >= 60) {
                rating = 'Satisfactory';
                color = '#d97706';
            }

            if (scoreSpan) {
                scoreSpan.textContent = rating;
                scoreSpan.style.color = color;
            }
        }

        checkboxes.forEach(function (cb) {
            cb.addEventListener('change', recalculateHygieneScore);
        });

        const form = auditSection.querySelector('form');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                const currentScore = scoreStrong ? scoreStrong.textContent : '92%';
                showToast(`Hygiene audit submitted! Overall Score: ${currentScore}`, 'success');
            });
        }
    }

    
    //     ADMIN MENU EDITOR (admin-menu.html)
       

    function initAdminMenu() {
        const menuForm = document.querySelector('.menu-editor-form');

        // Delete menu item handler
        document.addEventListener('click', function (e) {
            if (e.target && e.target.classList.contains('delete-button')) {
                const item = e.target.closest('.admin-menu-item');
                if (item) {
                    const itemName = item.querySelector('h3')?.textContent.trim() || 'Menu Item';
                    if (window.confirm(`Are you sure you want to remove "${itemName}"?`)) {
                        item.remove();
                        showToast(`Removed "${itemName}" from the menu.`, 'info');
                    }
                }
            }
        });

        // Edit menu item handler
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.admin-menu-actions button');
            if (btn && !btn.classList.contains('delete-button') && menuForm) {
                const item = btn.closest('.admin-menu-item');
                if (item) {
                    const title = item.querySelector('h3')?.textContent.trim() || '';
                    const time = item.querySelector('span')?.textContent.trim() || '';
                    const desc = item.querySelector('p')?.textContent.trim() || '';

                    const mealType = document.getElementById('meal-type');
                    const mealName = document.getElementById('meal-name');
                    const timing = document.getElementById('timing');
                    const description = document.getElementById('description');

                    if (mealName) mealName.value = desc;
                    if (timing) timing.value = time;
                    if (description) description.value = desc;

                    if (mealType) {
                        for (let i = 0; i < mealType.options.length; i++) {
                            if (mealType.options[i].text.toLowerCase() === title.toLowerCase()) {
                                mealType.selectedIndex = i;
                                break;
                            }
                        }
                    }

                    menuForm.scrollIntoView({ behavior: 'smooth' });
                    showToast(`Loaded "${title}" into the editor.`, 'info');
                }
            }
        });

        // Form submit
        if (menuForm) {
            menuForm.addEventListener('submit', function (e) {
                e.preventDefault();

                const day = document.getElementById('day')?.value || 'Monday';
                const mealType = document.getElementById('meal-type')?.value || 'Breakfast';
                const mealName = document.getElementById('meal-name')?.value.trim() || mealType;
                const timing = document.getElementById('timing')?.value.trim() || 'Scheduled Time';
                const description = document.getElementById('description')?.value.trim() || mealName;

                const list = document.querySelector('.admin-menu-list');
                if (list) {
                    const item = document.createElement('article');
                    item.className = 'admin-menu-item';
                    item.innerHTML = `
                        <div class="admin-menu-icon">🍽️</div>
                        <div class="admin-menu-info">
                            <span>${escapeHtml(timing)}</span>
                            <h3>${escapeHtml(mealType)}</h3>
                            <p>${escapeHtml(description)}</p>
                        </div>
                        <div class="admin-menu-actions">
                            <button type="button">Edit</button>
                            <button type="button" class="delete-button">Delete</button>
                        </div>
                    `;
                    list.insertBefore(item, list.firstChild);
                }

                showToast(`"${mealName}" added to ${day} menu!`, 'success');
                menuForm.reset();
            });
        }
    }

    
    // PROFILE & PREFERENCES (profile.html)
       

    function initProfile() {
        // Preferences Form
        const prefForm = document.querySelector('.preferences-form');
        if (prefForm) {
            const savedPreferences = getStoredData('mealsync_preferences', {});
            const dietSelect = document.getElementById('diet');
            const notifSelect = document.getElementById('notification');

            if (savedPreferences.diet && dietSelect) {
                dietSelect.value = savedPreferences.diet;
            }
            if (savedPreferences.notification && notifSelect) {
                notifSelect.value = savedPreferences.notification;
            }

            prefForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const diet = dietSelect ? dietSelect.value : '';
                const notification = notifSelect ? notifSelect.value : '';

                setStoredData('mealsync_preferences', { diet, notification });
                showToast('Preferences saved successfully!', 'success');
            });
        }

        // Edit Profile Button
        const editProfileButtons = document.querySelectorAll('.edit-profile-button, .account-actions button:first-child');
        editProfileButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                const nameEl = document.querySelector('.profile-main-info h2');
                const avatarEl = document.querySelector('.profile-avatar');

                const currentName = nameEl ? nameEl.textContent.trim() : 'Pratham Arora';
                const newName = window.prompt('Enter your name:', currentName);

                if (newName && newName.trim()) {
                    const trimmed = newName.trim();
                    if (nameEl) nameEl.textContent = trimmed;
                    if (avatarEl) {
                        const initials = trimmed
                            .split(' ')
                            .filter(Boolean)
                            .map(part => part[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase();
                        avatarEl.textContent = initials || 'ST';
                    }
                    localStorage.setItem('mealsync_user_name', trimmed);
                    showToast('Profile name updated!', 'success');
                }
            });
        });

        // Restore custom student name if previously saved
        const storedName = localStorage.getItem('mealsync_user_name');
        if (storedName) {
            const nameEl = document.querySelector('.profile-main-info h2');
            const avatarEl = document.querySelector('.profile-avatar');
            if (nameEl) nameEl.textContent = storedName;
            if (avatarEl) {
                const initials = storedName
                    .split(' ')
                    .filter(Boolean)
                    .map(part => part[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                avatarEl.textContent = initials || 'ST';
            }
        }

        // Logout Button
        const logoutBtn = document.querySelector('.logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                if (window.confirm('Are you sure you want to log out of MealSync?')) {
                    localStorage.removeItem('mealsync_session');
                    showToast('Logged out successfully.', 'info');
                    setTimeout(function () {
                        window.location.href = 'login.html';
                    }, 600);
                }
            });
        }
    }



    function getStoredData(key, fallback) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function setStoredData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('LocalStorage error:', e);
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

})();
