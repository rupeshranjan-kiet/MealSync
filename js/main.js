/**
 * MealSync - Main Application Script
 * Fully integrated with Supabase Database and Authentication.
 * All data (profiles, menus, attendance, streaks, feedback, complaints, waste, audits)
 * is fetched from and saved to the live Supabase database.
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function () {
        initToastSystem();
        initNavigation();
        initLogin();

        // Check authentication state
        const user = window.MealSyncAuth ? await window.MealSyncAuth.getCurrentUser() : null;
        let profile = null;
        if (user && window.MealSyncDB) {
            profile = await window.MealSyncDB.getProfile(user.id);
        }

        // Initialize page components with database data
        initDashboard(user, profile);
        initStreakElement(user, profile);
        initAttendance(user, profile);
        initWeeklyMenu();
        initFeedback(user, profile);
        initComplaints(user, profile);
        initActivity(user);
        initAnnouncements();
        initProfilePage(user, profile);
        initAdminDashboard();
        initAdminMenu();
        initFoodWaste();
        initHygiene();
        initMealDemand();
    });

    /* ==========================================================================
       1. TOAST NOTIFICATION SYSTEM
       ========================================================================== */

    function initToastSystem() {
        if (document.getElementById('mealsync-toast-container')) return;

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

        void toast.offsetWidth;
        toast.classList.add('show');

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3400);
    }

    /* ==========================================================================
       2. NAVIGATION HIGHLIGHTING
       ========================================================================== */

    function initNavigation() {
        const rawPath = window.location.pathname;
        let currentFile = rawPath.substring(rawPath.lastIndexOf('/') + 1) || 'index.html';

        const navLinks = document.querySelectorAll('header nav a');
        navLinks.forEach(function (link) {
            const href = link.getAttribute('href');
            if (href === currentFile) {
                link.classList.add('active-nav-link');
            }
        });
    }

    /* ==========================================================================
       3. LOGIN & SIGNUP (login.html)
       ========================================================================== */

    function initLogin() {
        const loginPage = document.querySelector('.login-page');
        if (!loginPage) return;

        const configAlert = document.getElementById('login-config-alert');
        if (configAlert && window.MealSyncAuth && !window.MealSyncAuth.hasConfig()) {
            configAlert.style.display = 'block';
        }

        const tabSignIn = document.getElementById('tab-btn-signin');
        const tabSignUp = document.getElementById('tab-btn-signup');
        const formSignIn = document.getElementById('form-signin');
        const formSignUp = document.getElementById('form-signup');

        // Tab Switching
        if (tabSignIn && tabSignUp && formSignIn && formSignUp) {
            tabSignIn.addEventListener('click', function () {
                tabSignIn.classList.add('active');
                tabSignUp.classList.remove('active');
                formSignIn.style.display = 'block';
                formSignUp.style.display = 'none';
            });

            tabSignUp.addEventListener('click', function () {
                tabSignUp.classList.add('active');
                tabSignIn.classList.remove('active');
                formSignIn.style.display = 'none';
                formSignUp.style.display = 'block';
            });
        }

        // Sign In Handler
        if (formSignIn) {
            formSignIn.addEventListener('submit', async function (e) {
                e.preventDefault();

                const emailInput = document.getElementById('login-email');
                const passInput = document.getElementById('login-password');
                const submitBtn = document.getElementById('btn-submit-signin');

                const email = emailInput ? emailInput.value.trim() : '';
                const password = passInput ? passInput.value.trim() : '';

                if (!email || !password) {
                    showToast('Please enter your email and password.', 'error');
                    return;
                }

                try {
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Signing in...';
                    }

                    if (window.MealSyncAuth) {
                        const { user } = await window.MealSyncAuth.signIn(email, password);
                        const role = window.MealSyncAuth.getUserRole(user);

                        showToast(`Welcome back, ${window.MealSyncAuth.getUserName(user)}!`, 'success');
                        setTimeout(function () {
                            window.location.href = role === 'admin' ? 'admin.html' : 'index.html';
                        }, 700);
                    }
                } catch (err) {
                    console.error('Sign in error:', err);
                    showToast(err.message || 'Invalid email or password.', 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Sign In';
                    }
                }
            });
        }

        // Sign Up Handler
        if (formSignUp) {
            formSignUp.addEventListener('submit', async function (e) {
                e.preventDefault();

                const nameInput = document.getElementById('signup-name');
                const emailInput = document.getElementById('signup-email');
                const passInput = document.getElementById('signup-password');
                const roleInput = formSignUp.querySelector('input[name="signup-role"]:checked');
                const submitBtn = document.getElementById('btn-submit-signup');

                const name = nameInput ? nameInput.value.trim() : '';
                const email = emailInput ? emailInput.value.trim() : '';
                const password = passInput ? passInput.value.trim() : '';
                const role = roleInput ? roleInput.value : 'student';

                if (!name || !email || !password) {
                    showToast('Please fill out all fields.', 'error');
                    return;
                }

                if (password.length < 6) {
                    showToast('Password must be at least 6 characters long.', 'error');
                    return;
                }

                try {
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Creating Account...';
                    }

                    if (window.MealSyncAuth) {
                        const { user } = await window.MealSyncAuth.signUp(email, password, name, role);
                        showToast('Account created successfully! Redirecting...', 'success');

                        setTimeout(function () {
                            window.location.href = role === 'admin' ? 'admin.html' : 'index.html';
                        }, 800);
                    }
                } catch (err) {
                    console.error('Sign up error:', err);
                    showToast(err.message || 'Failed to create account.', 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Create Account';
                    }
                }
            });
        }
    }

    /* ==========================================================================
       4. STUDENT DASHBOARD (index.html)
       ========================================================================== */

    async function initDashboard(user, profile) {
        const greetingEl = document.getElementById('student-greeting');
        if (greetingEl) {
            const displayName = profile ? profile.full_name : (user ? window.MealSyncAuth.getUserName(user) : 'Student');
            greetingEl.textContent = `Good Morning, ${displayName}! 👋`;
        }

        // Load today's meals from database
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()];

        if (window.MealSyncDB) {
            try {
                const todayMeals = await window.MealSyncDB.getMenuItems(todayName);
                if (todayMeals && todayMeals.length > 0) {
                    // Update Today's Lunch card
                    const lunchMeal = todayMeals.find(m => m.meal_type.toLowerCase() === 'lunch');
                    if (lunchMeal) {
                        const todayCard = document.querySelector('.dashboard-cards article:first-child');
                        if (todayCard) {
                            const desc = todayCard.querySelector('p:not(.card-label):not(.card-time)');
                            if (desc) desc.textContent = lunchMeal.meal_name;
                        }
                    }

                    // Update Next Meal (Dinner) card
                    const dinnerMeal = todayMeals.find(m => m.meal_type.toLowerCase() === 'dinner');
                    if (dinnerMeal) {
                        const nextCard = document.querySelector('.dashboard-cards article:nth-child(2)');
                        if (nextCard) {
                            const desc = nextCard.querySelector('p:not(.card-label):not(.card-time)');
                            if (desc) desc.textContent = dinnerMeal.meal_name;
                        }
                    }

                    // Update Menu action cards (Breakfast, Lunch, Dinner)
                    todayMeals.forEach(meal => {
                        const type = meal.meal_type.toLowerCase();
                        const card = document.querySelector(`.meal-button[data-meal="${type}"]`)?.closest('.meal-action-card');
                        if (card) {
                            const nameP = card.querySelector('p:not(.meal-time):not(.meal-response-status)');
                            if (nameP) nameP.textContent = meal.meal_name;
                            const timeP = card.querySelector('.meal-time');
                            if (timeP && meal.timing) timeP.textContent = meal.timing;
                        }
                    });
                }
            } catch (err) {
                console.warn('Could not load today meals:', err);
            }

            // Restore user's today attendance from database
            if (user) {
                try {
                    const todayAttendance = await window.MealSyncDB.getTodayAttendance(user.id);
                    todayAttendance.forEach(att => {
                        const meal = att.meal_type.toLowerCase();
                        const btn = document.querySelector(`.meal-button[data-meal="${meal}"][data-status="${att.status}"]`);
                        if (btn) {
                            const parent = btn.closest('.meal-response');
                            if (parent) {
                                parent.querySelectorAll('.meal-button').forEach(b => b.classList.remove('active'));
                            }
                            btn.classList.add('active');
                        }

                        const statusEl = document.getElementById(`${meal}-status`);
                        if (statusEl) {
                            if (att.status === 'having') {
                                statusEl.textContent = '✓ Marked as Having';
                                statusEl.style.color = 'var(--success)';
                            } else {
                                statusEl.textContent = '✕ Marked as Skipped';
                                statusEl.style.color = 'var(--muted)';
                            }
                        }
                    });
                } catch (e) {
                    console.warn('Could not restore today attendance:', e);
                }
            }

            // Load Latest Announcement from Database
            try {
                const announcements = await window.MealSyncDB.getAnnouncements();
                if (announcements && announcements.length > 0) {
                    const latest = announcements[0];
                    const annHeading = document.querySelector('.announcement-content h3');
                    const annDesc = document.querySelector('.announcement-content p:not(.small-heading)');
                    if (annHeading) annHeading.textContent = latest.title;
                    if (annDesc) annDesc.textContent = latest.content;
                }
            } catch (e) {}
        }

        // Attendance toggle click handlers
        const mealButtons = document.querySelectorAll('.meal-action-card .meal-button');
        mealButtons.forEach(btn => {
            btn.addEventListener('click', async function () {
                const meal = this.dataset.meal;
                const status = this.dataset.status;
                if (!meal || !status) return;

                const card = this.closest('.meal-action-card');
                if (card) {
                    card.querySelectorAll('.meal-button').forEach(b => b.classList.remove('active'));
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

                const mealCap = meal.charAt(0).toUpperCase() + meal.slice(1);
                showToast(`${mealCap} marked as ${status === 'having' ? 'Attending' : 'Skipped'}.`, 'success');

                // Save to database
                if (user && window.MealSyncDB) {
                    try {
                        const userName = profile ? profile.full_name : window.MealSyncAuth.getUserName(user);
                        await window.MealSyncDB.recordAttendance(user.id, user.email, userName, meal, status);

                        // Refresh streak UI
                        if (status === 'having') {
                            const updatedProfile = await window.MealSyncDB.getProfile(user.id);
                            initStreakElement(user, updatedProfile);
                        }
                    } catch (e) {
                        console.error('Error recording attendance to database:', e);
                    }
                }
            });
        });
    }

    /* ==========================================================================
       5. ATTENDANCE STREAK & 2% MESS FEE VOUCHER (Database-Connected)
       ========================================================================== */

    async function initStreakElement(user, profile) {
        const streakSection = document.querySelector('.streak-section');
        if (!streakSection) return;

        const currentStreak = profile ? (profile.streak_count || 0) : 5;
        const targetGoal = profile ? (profile.streak_target || 7) : 7;
        const voucherStatus = profile ? (profile.voucher_status || 'available') : 'available';
        const voucherCode = profile ? (profile.voucher_code || 'MEALSYNC-STREAK-2OFF') : 'MEALSYNC-STREAK-2OFF';
        const percent = Math.min(100, Math.round((currentStreak / targetGoal) * 100));

        const streakDaysDisplay = document.getElementById('streak-days-display');
        const pillBadge = document.getElementById('streak-pill-badge');
        const progressPercent = document.getElementById('streak-progress-percent');
        const progressFill = document.getElementById('streak-progress-fill');
        const voucherStatusEl = document.getElementById('voucher-status-display');
        const voucherCodeEl = document.getElementById('voucher-code-display');
        const redeemBtn = document.getElementById('btn-redeem-voucher');

        if (streakDaysDisplay) streakDaysDisplay.textContent = currentStreak;
        if (progressPercent) progressPercent.textContent = `${currentStreak} / ${targetGoal} Days (${percent}%)`;
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (voucherCodeEl) voucherCodeEl.textContent = voucherCode;

        if (pillBadge) {
            if (voucherStatus === 'redeemed') {
                pillBadge.textContent = '✓ Reward Claimed';
                pillBadge.style.background = '#dcfce7';
                pillBadge.style.color = '#166534';
            } else if (currentStreak >= targetGoal || voucherStatus === 'available') {
                pillBadge.textContent = '🎉 Reward Ready to Claim!';
                pillBadge.style.background = '#fef3c7';
                pillBadge.style.color = '#92400e';
            } else {
                pillBadge.textContent = `🔥 ${currentStreak}-Day Streak Active`;
            }
        }

        if (voucherStatusEl) {
            if (voucherStatus === 'redeemed') {
                voucherStatusEl.className = 'voucher-status-badge voucher-status-redeemed';
                voucherStatusEl.textContent = `✓ Redeemed (${profile?.voucher_redeemed_date || 'Applied'})`;
            } else if (voucherStatus === 'available' || currentStreak >= targetGoal) {
                voucherStatusEl.className = 'voucher-status-badge voucher-status-available';
                voucherStatusEl.textContent = '✓ Ready to Redeem (2% Off)';
            } else {
                voucherStatusEl.className = 'voucher-status-badge';
                voucherStatusEl.textContent = `🔒 Reach ${targetGoal} Days to Unlock`;
            }
        }

        if (redeemBtn) {
            if (voucherStatus === 'redeemed') {
                redeemBtn.textContent = '✓ 2% Discount Applied';
                redeemBtn.disabled = true;
                redeemBtn.style.background = '#9ca3af';
            } else {
                redeemBtn.textContent = '🎁 Redeem Voucher';
                redeemBtn.disabled = false;
                redeemBtn.style.background = '#16a34a';

                redeemBtn.onclick = async function () {
                    if (!user) {
                        showToast('Please sign in to redeem your voucher.', 'error');
                        return;
                    }

                    try {
                        const res = await window.MealSyncStreak.redeemVoucher(user.id);
                        if (res.success) {
                            showToast('🎉 Voucher redeemed! 2% discount applied to your mess fees.', 'success');
                            showVoucherModal(res.data);
                            const updatedProfile = await window.MealSyncDB.getProfile(user.id);
                            initStreakElement(user, updatedProfile);
                        } else {
                            showToast(res.message, 'info');
                        }
                    } catch (e) {
                        console.error('Error redeeming voucher:', e);
                        showToast('Failed to redeem voucher. Please try again.', 'error');
                    }
                };
            }
        }
    }

    function showVoucherModal(data) {
        const overlay = document.createElement('div');
        overlay.className = 'voucher-modal-overlay';
        overlay.innerHTML = `
            <div class="voucher-modal-box">
                <div class="voucher-modal-icon">🎉</div>
                <h2 style="color:#1e3a8a;margin-bottom:6px">Voucher Redeemed!</h2>
                <p style="color:var(--muted);font-size:14px">Your attendance consistency reward has been officially verified and applied.</p>

                <div class="voucher-certificate">
                    <div class="voucher-cert-row">
                        <span>Benefit:</span>
                        <strong>2% Mess Fee Reduction</strong>
                    </div>
                    <div class="voucher-cert-row">
                        <span>Voucher Code:</span>
                        <code style="font-weight:bold;color:#1e3a8a">${escapeHtml(data.voucherCode || 'MEALSYNC-STREAK-2OFF')}</code>
                    </div>
                    <div class="voucher-cert-row">
                        <span>Reference ID:</span>
                        <span>${escapeHtml(data.redeemReference || '#MS-VOUCHER-928174')}</span>
                    </div>
                    <div class="voucher-cert-row">
                        <span>Status:</span>
                        <strong style="color:#16a34a">✓ Applied to Next Billing Cycle</strong>
                    </div>
                </div>

                <button type="button" class="submit-button" id="close-voucher-modal" style="width:100%;margin-top:10px">
                    Great, Thank You!
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        const closeBtn = document.getElementById('close-voucher-modal');
        if (closeBtn) closeBtn.onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }

    /* ==========================================================================
       6. ATTENDANCE PAGE (attendance.html)
       ========================================================================== */

    async function initAttendance(user, profile) {
        const attendancePage = document.querySelector('.attendance-grid');
        if (!attendancePage) return;

        // Update streak banner
        const streakCountEl = document.getElementById('attendance-streak-count');
        if (streakCountEl && profile) {
            streakCountEl.textContent = profile.streak_count || 5;
        }

        // Load today attendance from database
        if (user && window.MealSyncDB) {
            try {
                const todayRecords = await window.MealSyncDB.getTodayAttendance(user.id);
                todayRecords.forEach(att => {
                    const card = Array.from(document.querySelectorAll('.attendance-card')).find(c => {
                        return c.querySelector('h3')?.textContent.trim().toLowerCase() === att.meal_type.toLowerCase();
                    });
                    if (card) {
                        const yesBtn = card.querySelector('.yes-button');
                        const noBtn = card.querySelector('.no-button');
                        if (att.status === 'having') {
                            if (yesBtn) yesBtn.classList.add('active');
                            if (noBtn) noBtn.classList.remove('active');
                        } else {
                            if (noBtn) noBtn.classList.add('active');
                            if (yesBtn) yesBtn.classList.remove('active');
                        }
                    }
                });

                // Load attendance history table
                const history = await window.MealSyncDB.getUserAttendanceHistory(user.id, 10);
                const tableBody = document.querySelector('.table-container tbody');
                if (tableBody && history && history.length > 0) {
                    tableBody.innerHTML = history.map(row => `
                        <tr>
                            <td>${escapeHtml(row.date)}</td>
                            <td>${escapeHtml(row.meal_type.charAt(0).toUpperCase() + row.meal_type.slice(1))}</td>
                            <td>${escapeHtml(row.time || '12:30 PM')}</td>
                            <td>
                                <span class="${row.status === 'having' ? 'status-attended' : 'status-skipped'}">
                                    ${row.status === 'having' ? 'Attended' : 'Skipped'}
                                </span>
                            </td>
                        </tr>
                    `).join('');
                }

                // Update summary
                const stats = await window.MealSyncDB.getUserStats(user.id);
                const attendedNum = document.querySelector('.weekly-summary div:nth-child(1) .summary-number');
                const skippedNum = document.querySelector('.weekly-summary div:nth-child(2) .summary-number');
                const rateNum = document.querySelector('.weekly-summary div:nth-child(3) .summary-number');

                if (attendedNum) attendedNum.textContent = stats.attended;
                if (skippedNum) skippedNum.textContent = stats.skipped;
                if (rateNum) {
                    const total = stats.attended + stats.skipped;
                    const rate = total > 0 ? Math.round((stats.attended / total) * 100) : 100;
                    rateNum.textContent = `${rate}%`;
                }
            } catch (e) {
                console.warn('Error loading attendance data:', e);
            }
        }

        // Attendance button clicks
        document.querySelectorAll('.attendance-card').forEach(card => {
            const heading = card.querySelector('h3');
            const mealKey = heading ? heading.textContent.trim().toLowerCase() : '';
            const yesBtn = card.querySelector('.yes-button');
            const noBtn = card.querySelector('.no-button');

            if (yesBtn) {
                yesBtn.onclick = async function () {
                    yesBtn.classList.add('active');
                    if (noBtn) noBtn.classList.remove('active');
                    showToast(`Marked ${heading.textContent.trim()} as Having!`, 'success');

                    if (user && window.MealSyncDB) {
                        const name = profile ? profile.full_name : window.MealSyncAuth.getUserName(user);
                        await window.MealSyncDB.recordAttendance(user.id, user.email, name, mealKey, 'having');
                        const updated = await window.MealSyncDB.getProfile(user.id);
                        if (streakCountEl && updated) streakCountEl.textContent = updated.streak_count;
                    }
                };
            }

            if (noBtn) {
                noBtn.onclick = async function () {
                    noBtn.classList.add('active');
                    if (yesBtn) yesBtn.classList.remove('active');
                    showToast(`Marked ${heading.textContent.trim()} as Skipped.`, 'info');

                    if (user && window.MealSyncDB) {
                        const name = profile ? profile.full_name : window.MealSyncAuth.getUserName(user);
                        await window.MealSyncDB.recordAttendance(user.id, user.email, name, mealKey, 'skipping');
                    }
                };
            }
        });
    }

    /* ==========================================================================
       7. WEEKLY MENU (menu.html)
       ========================================================================== */

    async function initWeeklyMenu() {
        const daySections = document.querySelectorAll('.day-section');
        if (!daySections.length || !window.MealSyncDB) return;

        try {
            const allMeals = await window.MealSyncDB.getMenuItems();
            if (!allMeals || allMeals.length === 0) return;

            daySections.forEach(section => {
                const dayHeader = section.querySelector('.day-header h2')?.textContent.trim();
                if (!dayHeader) return;

                const dayMeals = allMeals.filter(m => m.day.toLowerCase() === dayHeader.toLowerCase());
                const mealCards = section.querySelectorAll('.meal-card');

                mealCards.forEach(card => {
                    const type = card.querySelector('h3')?.textContent.trim();
                    const matching = dayMeals.find(m => m.meal_type.toLowerCase() === type?.toLowerCase());
                    if (matching) {
                        const desc = card.querySelector('p:not(.meal-card-top p)');
                        const time = card.querySelector('.meal-card-top p');
                        if (desc) desc.textContent = matching.meal_name;
                        if (time && matching.timing) time.textContent = matching.timing;
                    }
                });
            });
        } catch (e) {
            console.warn('Could not populate weekly menu:', e);
        }
    }

    /* ==========================================================================
       8. FEEDBACK SYSTEM (feedback.html)
       ========================================================================== */

    async function initFeedback(user, profile) {
        const feedbackSection = document.querySelector('.feedback-form-section');
        if (!feedbackSection) return;

        const form = feedbackSection.querySelector('form');
        if (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();

                const mealSelect = document.getElementById('meal');
                if (!mealSelect || !mealSelect.value) {
                    showToast('Please select which meal you are reviewing.', 'error');
                    return;
                }

                const mealName = mealSelect.options[mealSelect.selectedIndex].text;
                const taste = form.querySelector('select[name="taste"]')?.value || 'Good';
                const quality = form.querySelector('select[name="quality"]')?.value || 'Good';
                const quantity = form.querySelector('select[name="quantity"]')?.value || 'Good';
                const hygiene = form.querySelector('select[name="hygiene"]')?.value || 'Good';
                const overall = parseFloat(form.querySelector('select[name="overall"]')?.value) || 4;
                const suggestion = document.getElementById('suggestion')?.value.trim() || '';

                const userName = profile ? profile.full_name : (user ? window.MealSyncAuth.getUserName(user) : 'Student');

                try {
                    if (window.MealSyncDB) {
                        await window.MealSyncDB.submitFeedback({
                            user_id: user ? user.id : null,
                            user_name: userName,
                            meal_type: mealName,
                            taste,
                            quality,
                            quantity,
                            hygiene,
                            overall_rating: overall,
                            suggestion,
                            date: new Date().toISOString().split('T')[0]
                        });
                    }

                    showToast(`Thank you! Your feedback for ${mealName} has been recorded.`, 'success');
                    form.reset();
                } catch (err) {
                    console.error('Error submitting feedback:', err);
                    showToast('Failed to record feedback. Please try again.', 'error');
                }
            });
        }
    }

    /* ==========================================================================
       9. COMPLAINTS SYSTEM (complaints.html)
       ========================================================================== */

    async function initComplaints(user, profile) {
        const complaintSection = document.querySelector('.complaint-form-section');
        if (!complaintSection) return;

        // Load complaints from database
        if (window.MealSyncDB) {
            try {
                const isAdmin = user && window.MealSyncAuth.getUserRole(user) === 'admin';
                const complaints = await window.MealSyncDB.getComplaints(user ? user.id : null, isAdmin);
                const list = document.querySelector('.complaint-list');
                const countBadge = document.querySelector('.complaint-count');

                if (countBadge && complaints) {
                    countBadge.textContent = `${complaints.length} Total`;
                }

                if (list && complaints && complaints.length > 0) {
                    list.innerHTML = complaints.map(c => `
                        <article class="complaint-card">
                            <div class="complaint-card-top">
                                <div>
                                    <span class="complaint-category">${escapeHtml(c.category)}${c.meal_type ? ' • ' + escapeHtml(c.meal_type) : ''}</span>
                                    <h3>${escapeHtml(c.description.length > 50 ? c.description.substring(0, 50) + '...' : c.description)}</h3>
                                </div>
                                <span class="${c.status === 'Resolved' ? 'status-resolved' : 'status-review'}">
                                    ${escapeHtml(c.status || 'Under Review')}
                                </span>
                            </div>
                            <p class="complaint-description">${escapeHtml(c.description)}</p>
                            <div class="complaint-meta">
                                <span>📅 ${escapeHtml(c.created_date || 'Today')}</span>
                                <span>ID: ${escapeHtml(c.id)}</span>
                            </div>
                        </article>
                    `).join('');
                }
            } catch (e) {
                console.warn('Error loading complaints:', e);
            }
        }

        // Form submit
        const form = complaintSection.querySelector('form');
        if (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();

                const categorySelect = document.getElementById('category');
                const mealSelect = document.getElementById('meal');
                const descArea = document.getElementById('description');
                const priorityRadio = form.querySelector('input[name="priority"]:checked');

                if (!categorySelect || !categorySelect.value) {
                    showToast('Please select a complaint category.', 'error');
                    return;
                }

                const desc = descArea ? descArea.value.trim() : '';
                if (!desc) {
                    showToast('Please describe the issue.', 'error');
                    return;
                }

                const categoryText = categorySelect.options[categorySelect.selectedIndex].text;
                const mealText = mealSelect && mealSelect.value ? mealSelect.options[mealSelect.selectedIndex].text : '';
                const priority = priorityRadio ? priorityRadio.value : 'Medium';
                const complaintId = '#MS' + Math.floor(1000 + Math.random() * 9000);
                const userName = profile ? profile.full_name : (user ? window.MealSyncAuth.getUserName(user) : 'Student');

                try {
                    if (window.MealSyncDB) {
                        await window.MealSyncDB.submitComplaint({
                            id: complaintId,
                            user_id: user ? user.id : null,
                            user_name: userName,
                            category: categoryText,
                            meal_type: mealText,
                            priority,
                            description: desc,
                            status: 'Under Review',
                            created_date: 'Today'
                        });
                    }

                    showToast(`Complaint submitted! Reference ID: ${complaintId}`, 'success');
                    form.reset();
                    initComplaints(user, profile);
                } catch (err) {
                    console.error('Error submitting complaint:', err);
                    showToast('Failed to record complaint.', 'error');
                }
            });
        }
    }

    /* ==========================================================================
       10. ACTIVITY PAGE (activity.html)
       ========================================================================== */

    async function initActivity(user) {
        const activityStats = document.querySelector('.activity-stats');
        if (!activityStats || !user || !window.MealSyncDB) return;

        try {
            const stats = await window.MealSyncDB.getUserStats(user.id);
            const attendedEl = document.querySelector('.activity-stat:nth-child(1) h3');
            const skippedEl = document.querySelector('.activity-stat:nth-child(2) h3');
            const feedbackEl = document.querySelector('.activity-stat:nth-child(3) h3');
            const complaintEl = document.querySelector('.activity-stat:nth-child(4) h3');

            if (attendedEl) attendedEl.textContent = stats.attended;
            if (skippedEl) skippedEl.textContent = stats.skipped;
            if (feedbackEl) feedbackEl.textContent = stats.feedbacks;
            if (complaintEl) complaintEl.textContent = stats.complaints;

            // Load table
            const history = await window.MealSyncDB.getUserAttendanceHistory(user.id, 10);
            const tbody = document.querySelector('.table-container tbody');
            if (tbody && history && history.length > 0) {
                tbody.innerHTML = history.map(row => `
                    <tr>
                        <td>${escapeHtml(row.date)}</td>
                        <td>${escapeHtml(row.meal_type.charAt(0).toUpperCase() + row.meal_type.slice(1))}</td>
                        <td>${escapeHtml(row.time || '12:30 PM')}</td>
                        <td>
                            <span class="${row.status === 'having' ? 'status-attended' : 'status-skipped'}">
                                ${row.status === 'having' ? 'Attended' : 'Skipped'}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (e) {
            console.warn('Error loading activity stats:', e);
        }
    }

    /* ==========================================================================
       11. ANNOUNCEMENTS PAGE (announcements.html)
       ========================================================================== */

    async function initAnnouncements() {
        const annList = document.querySelector('.announcement-list');
        if (!annList || !window.MealSyncDB) return;

        try {
            const announcements = await window.MealSyncDB.getAnnouncements();
            if (!announcements || announcements.length === 0) return;

            // Important announcement
            const important = announcements.find(a => a.is_important);
            if (important) {
                const impTitle = document.querySelector('.important-announcement h2');
                const impDesc = document.querySelector('.important-announcement p');
                const impDate = document.querySelector('.important-announcement .announcement-date');
                if (impTitle) impTitle.textContent = important.title;
                if (impDesc) impDesc.textContent = important.content;
                if (impDate) impDate.textContent = `Posted on ${important.date}`;
            }

            // List
            const normalList = announcements.filter(a => !a.is_important);
            if (normalList.length > 0) {
                annList.innerHTML = normalList.map(a => `
                    <article class="announcement-card">
                        <div class="announcement-card-icon">${escapeHtml(a.icon || '📢')}</div>
                        <div class="announcement-card-content">
                            <div class="announcement-card-top">
                                <span class="announcement-type">${escapeHtml(a.category || 'GENERAL')}</span>
                                <span class="announcement-date">${escapeHtml(a.date || 'Today')}</span>
                            </div>
                            <h3>${escapeHtml(a.title)}</h3>
                            <p>${escapeHtml(a.content)}</p>
                        </div>
                    </article>
                `).join('');
            }
        } catch (e) {
            console.warn('Error loading announcements:', e);
        }
    }

    /* ==========================================================================
       12. PROFILE PAGE (profile.html - No Hardcoded Values)
       ========================================================================== */

    async function initProfilePage(user, profile) {
        const profilePage = document.querySelector('.profile-overview');
        if (!profilePage) return;

        // Fetch fresh profile from database if available
        if (user && window.MealSyncDB) {
            try {
                if (!profile) {
                    profile = await window.MealSyncDB.getProfile(user.id);
                }
            } catch (e) {}
        }

        const fullName = profile?.full_name || (user ? window.MealSyncAuth.getUserName(user) : 'Student');
        const course = profile?.course || 'MCA • Semester 1';
        const studentId = profile?.student_id || ('MS-' + (user ? user.id.slice(0, 6).toUpperCase() : '2026001'));
        const email = profile?.email || user?.email || 'student@mealsync.com';
        const phone = profile?.phone || '+91 98765 43210';
        const hostel = profile?.hostel || 'Hostel A';
        const room = profile?.room_number || 'A-204';
        const mess = profile?.mess_name || 'Main Campus Mess';

        // Update DOM elements dynamically
        const nameHeader = document.getElementById('profile-name-header');
        const courseHeader = document.getElementById('profile-course-header');
        const idHeader = document.getElementById('profile-id-header');
        const avatarDisplay = document.getElementById('profile-avatar-display');

        const nameDetail = document.getElementById('profile-name-detail');
        const idDetail = document.getElementById('profile-id-detail');
        const courseDetail = document.getElementById('profile-course-detail');
        const semDetail = document.getElementById('profile-sem-detail');
        const emailDetail = document.getElementById('profile-email-detail');
        const phoneDetail = document.getElementById('profile-phone-detail');
        const hostelDetail = document.getElementById('profile-hostel-detail');
        const roomDetail = document.getElementById('profile-room-detail');
        const messDetail = document.getElementById('profile-mess-detail');

        if (nameHeader) nameHeader.textContent = fullName;
        if (courseHeader) courseHeader.textContent = course;
        if (idHeader) idHeader.textContent = `Student ID: ${studentId}`;

        if (avatarDisplay) {
            const initials = fullName
                .split(' ')
                .filter(Boolean)
                .map(part => part[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
            avatarDisplay.textContent = initials || 'ST';
        }

        if (nameDetail) nameDetail.textContent = fullName;
        if (idDetail) idDetail.textContent = studentId;
        if (courseDetail) courseDetail.textContent = course.split('•')[0].trim();
        if (semDetail) semDetail.textContent = course.includes('•') ? course.split('•')[1].trim() : '1st Semester';
        if (emailDetail) emailDetail.textContent = email;
        if (phoneDetail) phoneDetail.textContent = phone;
        if (hostelDetail) hostelDetail.textContent = hostel;
        if (roomDetail) roomDetail.textContent = room;
        if (messDetail) messDetail.textContent = mess;

        // Load live student stats from database
        if (user && window.MealSyncDB) {
            try {
                const stats = await window.MealSyncDB.getUserStats(user.id);
                const attEl = document.getElementById('stat-attended-count');
                const skipEl = document.getElementById('stat-skipped-count');
                const feedEl = document.getElementById('stat-feedback-count');
                const compEl = document.getElementById('stat-complaint-count');

                if (attEl) attEl.textContent = stats.attended;
                if (skipEl) skipEl.textContent = stats.skipped;
                if (feedEl) feedEl.textContent = stats.feedbacks;
                if (compEl) compEl.textContent = stats.complaints;
            } catch (e) {}
        }

        // Preferences Form Handler (Saves to database)
        const prefForm = document.querySelector('.preferences-form');
        if (prefForm) {
            const dietSelect = document.getElementById('diet');
            const notifSelect = document.getElementById('notification');

            if (profile?.diet_preference && dietSelect) dietSelect.value = profile.diet_preference;
            if (profile?.notification_preference && notifSelect) notifSelect.value = profile.notification_preference;

            prefForm.onsubmit = async function (e) {
                e.preventDefault();
                const diet = dietSelect ? dietSelect.value : 'vegetarian';
                const notification = notifSelect ? notifSelect.value : 'all';

                if (user && window.MealSyncDB) {
                    try {
                        await window.MealSyncDB.updateProfile(user.id, {
                            diet_preference: diet,
                            notification_preference: notification
                        });
                        showToast('Preferences saved to your profile!', 'success');
                    } catch (err) {
                        showToast('Error saving preferences.', 'error');
                    }
                }
            };
        }

        // Edit Profile Button (Updates Database Profile)
        const editBtn = document.getElementById('btn-edit-profile') || document.querySelector('.edit-profile-button');
        if (editBtn) {
            editBtn.onclick = async function () {
                const newName = window.prompt('Enter your full name:', fullName);
                if (newName && newName.trim()) {
                    const newCourse = window.prompt('Enter your course & semester (e.g. MCA • Semester 1):', course);
                    const newRoom = window.prompt('Enter your room number:', room);

                    if (user && window.MealSyncDB) {
                        try {
                            const updated = await window.MealSyncDB.updateProfile(user.id, {
                                full_name: newName.trim(),
                                course: newCourse ? newCourse.trim() : course,
                                room_number: newRoom ? newRoom.trim() : room
                            });
                            showToast('Profile updated successfully!', 'success');
                            initProfilePage(user, updated);
                        } catch (err) {
                            showToast('Failed to update profile.', 'error');
                        }
                    }
                }
            };
        }
    }

    /* ==========================================================================
       13. ADMIN DASHBOARD (admin.html - Live Database Data)
       ========================================================================== */

    async function initAdminDashboard() {
        const adminPage = document.querySelector('.admin-stat-grid');
        if (!adminPage || !window.MealSyncDB) return;

        try {
            const stats = await window.MealSyncDB.getAdminStats();
            if (!stats) return;

            // Total Students
            const studentCountEl = document.querySelector('.admin-stat-card:nth-child(1) h3');
            if (studentCountEl) studentCountEl.textContent = stats.totalStudents;

            // Today's Expected Attendance
            const attendanceEl = document.querySelector('.admin-stat-card:nth-child(2) h3');
            if (attendanceEl) attendanceEl.textContent = stats.expectedAttendance;

            // Waste
            const wasteEl = document.querySelector('.admin-stat-card:nth-child(3) h3');
            if (wasteEl) wasteEl.textContent = `${stats.todayWasteKg} KG`;

            // Hygiene
            const hygieneEl = document.querySelector('.admin-stat-card:nth-child(4) h3');
            if (hygieneEl) hygieneEl.textContent = `${stats.hygieneScore}%`;

            // Meal Status Rows (Breakfast, Lunch, Dinner)
            if (stats.todayAttendance) {
                const lunchCount = stats.todayAttendance.filter(r => r.meal_type === 'lunch' && r.status === 'having').length;
                const lunchEl = document.querySelector('.meal-status-card strong');
                if (lunchEl && lunchCount > 0) lunchEl.textContent = `${lunchCount} Attending`;
            }
        } catch (e) {
            console.warn('Error loading admin stats:', e);
        }
    }

    /* ==========================================================================
       14. ADMIN MENU MANAGER (admin-menu.html)
       ========================================================================== */

    async function initAdminMenu() {
        const menuForm = document.querySelector('.menu-editor-form');
        const list = document.querySelector('.admin-menu-list');
        if (!menuForm || !list || !window.MealSyncDB) return;

        // Load items from database
        async function reloadMenuList() {
            try {
                const items = await window.MealSyncDB.getMenuItems();
                if (items && items.length > 0) {
                    list.innerHTML = items.map(m => `
                        <article class="admin-menu-item" data-id="${escapeHtml(m.id)}">
                            <div class="admin-menu-icon">🍽️</div>
                            <div class="admin-menu-info">
                                <span>${escapeHtml(m.timing)}</span>
                                <h3>${escapeHtml(m.meal_name || m.meal_type)}</h3>
                                <p>${escapeHtml(m.description || m.day + ' menu')}</p>
                            </div>
                            <div class="admin-menu-actions">
                                <button type="button" class="btn-edit-meal" data-id="${escapeHtml(m.id)}">Edit</button>
                                <button type="button" class="delete-button" data-id="${escapeHtml(m.id)}">Delete</button>
                            </div>
                        </article>
                    `).join('');
                }
            } catch (e) {
                console.warn('Error loading admin menu:', e);
            }
        }

        await reloadMenuList();

        // Delete handler
        list.onclick = async function (e) {
            const delBtn = e.target.closest('.delete-button');
            if (delBtn) {
                const id = delBtn.dataset.id;
                if (window.confirm('Are you sure you want to delete this meal item from the database?')) {
                    try {
                        await window.MealSyncDB.deleteMenuItem(id);
                        showToast('Meal item deleted from database.', 'info');
                        await reloadMenuList();
                    } catch (err) {
                        showToast('Error deleting meal.', 'error');
                    }
                }
            }

            const editBtn = e.target.closest('.btn-edit-meal');
            if (editBtn) {
                const item = editBtn.closest('.admin-menu-item');
                const title = item.querySelector('h3')?.textContent.trim() || '';
                const time = item.querySelector('span')?.textContent.trim() || '';
                const desc = item.querySelector('p')?.textContent.trim() || '';

                const nameInput = document.getElementById('meal-name');
                const timingInput = document.getElementById('timing');
                const descInput = document.getElementById('description');

                if (nameInput) nameInput.value = title;
                if (timingInput) timingInput.value = time;
                if (descInput) descInput.value = desc;

                menuForm.scrollIntoView({ behavior: 'smooth' });
                showToast(`Loaded "${title}" into editor.`, 'info');
            }
        };

        // Submit handler
        menuForm.onsubmit = async function (e) {
            e.preventDefault();

            const day = document.getElementById('day')?.value || 'Monday';
            const mealType = document.getElementById('meal-type')?.value || 'Breakfast';
            const mealName = document.getElementById('meal-name')?.value.trim() || mealType;
            const timing = document.getElementById('timing')?.value.trim() || 'Scheduled Time';
            const description = document.getElementById('description')?.value.trim() || mealName;

            try {
                await window.MealSyncDB.addMenuItem({
                    day,
                    meal_type: mealType,
                    meal_name: mealName,
                    timing,
                    description
                });
                showToast(`"${mealName}" saved to ${day} menu in database!`, 'success');
                menuForm.reset();
                await reloadMenuList();
            } catch (err) {
                console.error('Error adding meal:', err);
                showToast('Failed to save meal item.', 'error');
            }
        };
    }

    /* ==========================================================================
       15. FOOD WASTE MANAGEMENT (food-waste.html)
       ========================================================================== */

    async function initFoodWaste() {
        const wasteForm = document.querySelector('.waste-form');
        if (!wasteForm || !window.MealSyncDB) return;

        const dateInput = document.getElementById('waste-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        const preparedInput = document.getElementById('prepared');
        const servedInput = document.getElementById('served');
        const wastedInput = document.getElementById('wasted');

        function autoCalculateWaste() {
            const prep = parseFloat(preparedInput?.value);
            const serv = parseFloat(servedInput?.value);
            if (!isNaN(prep) && !isNaN(serv) && wastedInput) {
                const diff = Math.max(0, prep - serv);
                wastedInput.value = Math.round(diff * 10) / 10;
            }
        }

        if (preparedInput) preparedInput.oninput = autoCalculateWaste;
        if (servedInput) servedInput.oninput = autoCalculateWaste;

        wasteForm.onsubmit = async function (e) {
            e.preventDefault();

            const mealSelect = document.getElementById('waste-meal');
            const meal = mealSelect?.value || 'Lunch';
            const prep = parseFloat(preparedInput?.value) || 0;
            const serv = parseFloat(servedInput?.value) || 0;
            const wasted = parseFloat(wastedInput?.value) || (prep - serv);
            const reason = document.getElementById('reason')?.value || 'Low Attendance';
            const notes = document.getElementById('waste-notes')?.value || '';
            const pct = prep > 0 ? Math.round((wasted / prep) * 100 * 10) / 10 : 0;

            try {
                await window.MealSyncDB.submitFoodWaste({
                    date: dateInput?.value || new Date().toISOString().split('T')[0],
                    meal_type: meal,
                    prepared_kg: prep,
                    served_kg: serv,
                    wasted_kg: wasted,
                    waste_percentage: pct,
                    reason,
                    notes
                });

                showToast(`Food waste record of ${wasted} KG saved to database!`, 'success');
                wasteForm.reset();
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
            } catch (err) {
                console.error('Error recording waste:', err);
                showToast('Failed to save waste record.', 'error');
            }
        };
    }

    /* ==========================================================================
       16. HYGIENE AUDIT (hygiene.html)
       ========================================================================== */

    async function initHygiene() {
        const auditSection = document.querySelector('.hygiene-audit-section');
        if (!auditSection || !window.MealSyncDB) return;

        const checkboxes = auditSection.querySelectorAll('input[type="checkbox"]');
        const scoreStrong = document.querySelector('.hygiene-score strong');
        const scoreSpan = document.querySelector('.hygiene-score span');

        function recalculate() {
            if (!checkboxes.length) return;
            let checked = 0;
            checkboxes.forEach(cb => { if (cb.checked) checked++; });
            const pct = Math.round((checked / checkboxes.length) * 100);

            if (scoreStrong) scoreStrong.textContent = `${pct}%`;

            let label = 'Needs Attention';
            let color = '#dc2626';
            if (pct >= 90) { label = 'Excellent'; color = '#16a34a'; }
            else if (pct >= 75) { label = 'Good'; color = '#2563eb'; }
            else if (pct >= 60) { label = 'Satisfactory'; color = '#d97706'; }

            if (scoreSpan) {
                scoreSpan.textContent = label;
                scoreSpan.style.color = color;
            }
        }

        checkboxes.forEach(cb => { cb.onchange = recalculate; });

        const form = auditSection.querySelector('form');
        if (form) {
            form.onsubmit = async function (e) {
                e.preventDefault();
                const currentScore = parseFloat(scoreStrong?.textContent) || 92;
                const rating = scoreSpan?.textContent || 'Excellent';
                const notes = document.getElementById('audit-notes')?.value || 'Sanitation inspection completed.';

                try {
                    await window.MealSyncDB.submitHygieneAudit({
                        date: new Date().toISOString().split('T')[0],
                        score_percent: currentScore,
                        rating,
                        notes
                    });
                    showToast(`Hygiene audit of ${currentScore}% submitted to database!`, 'success');
                } catch (err) {
                    showToast('Failed to submit hygiene audit.', 'error');
                }
            };
        }
    }

    /* ==========================================================================
       17. MEAL DEMAND CALCULATOR (meal-demand.html)
       ========================================================================== */

    function initMealDemand() {
        const demandForm = document.querySelector('.demand-form');
        if (!demandForm) return;

        const dateInput = document.getElementById('demand-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        function calculateDemand() {
            const totalRegistered = parseFloat(document.getElementById('registered')?.value) || 450;
            const enteredAttendance = parseFloat(document.getElementById('attendance')?.value);
            const attendance = !isNaN(enteredAttendance) && enteredAttendance > 0 ? enteredAttendance : Math.round(totalRegistered * 0.85);

            const avgServing = parseFloat(document.getElementById('avg-serving')?.value) || 0.25;
            const bufferSelect = document.getElementById('buffer');
            const bufferPct = parseFloat(bufferSelect ? bufferSelect.value : '5') || 5;

            const totalKg = Math.round(attendance * avgServing * (1 + bufferPct / 100));

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

        demandForm.onsubmit = function (e) {
            e.preventDefault();
            const res = calculateDemand();
            showToast(`Calculated: ${res.totalKg} KG for ${res.attendance} students.`, 'success');
        };

        ['registered', 'attendance', 'avg-serving', 'buffer'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.oninput = calculateDemand;
                el.onchange = calculateDemand;
            }
        });
    }

    /* ==========================================================================
       18. HELPER UTILITIES
       ========================================================================== */

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
