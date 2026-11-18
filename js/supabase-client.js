/**
 * MealSync - Supabase Client & Database Services
 * Handles Supabase initialization, authentications, role-based route protection,
 * and live database CRUD operations for profiles, weekly menus, attendance,
 * feedback, complaints, food waste, hygiene audits, announcements, and student streaks.
 */

(function () {
    'use strict';

    /**
     * Retrieve Supabase configuration securely:
     * 1. window.MEALSYNC_CONFIG (loaded from untracked js/config.js)
     * 2. localStorage ('mealsync_supabase_config') for runtime configuration
     */
    function getCredentials() {
        if (window.MEALSYNC_CONFIG && window.MEALSYNC_CONFIG.SUPABASE_URL && window.MEALSYNC_CONFIG.SUPABASE_ANON_KEY) {
            return window.MEALSYNC_CONFIG;
        }
        try {
            const stored = localStorage.getItem('mealsync_supabase_config');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.SUPABASE_URL && parsed.SUPABASE_ANON_KEY) {
                    return parsed;
                }
            }
        } catch (e) {
            // Ignore storage parsing issues
        }
        return null;
    }

    let supabaseClient = null;

    function getSupabase() {
        if (supabaseClient) return supabaseClient;

        const creds = getCredentials();
        if (!creds || !creds.SUPABASE_URL || !creds.SUPABASE_ANON_KEY) {
            console.warn('[MealSync] Supabase credentials not found. Ensure js/config.js is created from js/config.example.js or set via localStorage.');
            return null;
        }

        // Check if placeholder values were left unchanged
        if (creds.SUPABASE_URL.includes('your-project-id') || creds.SUPABASE_ANON_KEY.includes('your-anon-public-key')) {
            console.warn('[MealSync] Placeholder Supabase credentials detected. Please update js/config.js with your project credentials.');
            return null;
        }

        if (window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                supabaseClient = window.supabase.createClient(creds.SUPABASE_URL, creds.SUPABASE_ANON_KEY, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true
                    }
                });
            } catch (err) {
                console.error('[MealSync] Error creating Supabase client:', err);
            }
        }
        return supabaseClient;
    }

    /* ==========================================================================
       1. AUTHENTICATION & SESSION MANAGEMENT
       ========================================================================== */

    const MealSyncAuth = {
        getClient: function () {
            return getSupabase();
        },

        hasConfig: function () {
            return !!getCredentials();
        },

        getConfig: function () {
            return getCredentials();
        },

        setCredentials: function (url, anonKey) {
            if (!url || !anonKey) return false;
            try {
                localStorage.setItem('mealsync_supabase_config', JSON.stringify({
                    SUPABASE_URL: url.trim(),
                    SUPABASE_ANON_KEY: anonKey.trim()
                }));
                supabaseClient = null;
                return true;
            } catch (e) {
                return false;
            }
        },

        getCurrentUser: async function () {
            const client = this.getClient();
            if (!client) {
                const cached = localStorage.getItem('mealsync_cached_user');
                return cached ? JSON.parse(cached) : null;
            }

            try {
                const { data: { session }, error } = await client.auth.getSession();
                if (error || !session) {
                    const cached = localStorage.getItem('mealsync_cached_user');
                    return cached ? JSON.parse(cached) : null;
                }
                const user = session.user;
                if (user) {
                    localStorage.setItem('mealsync_cached_user', JSON.stringify(user));
                }
                return user;
            } catch (err) {
                console.warn('Error fetching Supabase session:', err);
                const cached = localStorage.getItem('mealsync_cached_user');
                return cached ? JSON.parse(cached) : null;
            }
        },

        getUserRole: function (user) {
            if (!user) return null;
            if (user.user_metadata && user.user_metadata.role) {
                return user.user_metadata.role.toLowerCase();
            }
            if (user.email && user.email.toLowerCase().includes('admin')) {
                return 'admin';
            }
            return 'student';
        },

        getUserName: function (user) {
            if (!user) return 'Student';
            if (user.user_metadata && user.user_metadata.full_name) {
                return user.user_metadata.full_name;
            }
            if (user.email) {
                const prefix = user.email.split('@')[0];
                return prefix.charAt(0).toUpperCase() + prefix.slice(1);
            }
            return 'Student';
        },

        signIn: async function (email, password) {
            const client = this.getClient();
            if (!client) throw new Error('Database service is currently initializing. Please try again.');

            const { data, error } = await client.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim()
            });

            if (error) throw error;
            if (data && data.user) {
                localStorage.setItem('mealsync_cached_user', JSON.stringify(data.user));
            }
            return data;
        },

        signUp: async function (email, password, fullName, role) {
            const client = this.getClient();
            if (!client) throw new Error('Database service is currently initializing. Please try again.');

            const normalizedRole = (role || 'student').toLowerCase();
            const { data, error } = await client.auth.signUp({
                email: email.trim(),
                password: password.trim(),
                options: {
                    data: {
                        full_name: fullName.trim() || 'MealSync User',
                        role: normalizedRole
                    }
                }
            });

            if (error) throw error;
            if (data && data.user) {
                localStorage.setItem('mealsync_cached_user', JSON.stringify(data.user));
            }
            return data;
        },

        signOut: async function () {
            const client = this.getClient();
            if (client) {
                try {
                    await client.auth.signOut();
                } catch (e) {
                    console.warn('Sign out warning:', e);
                }
            }
            localStorage.removeItem('mealsync_cached_user');
            localStorage.removeItem('mealsync_session');
            window.location.href = 'login.html';
        },

        protectRoutes: async function () {
            const currentFile = window.location.pathname.split('/').pop() || 'index.html';
            const user = await this.getCurrentUser();
            const role = this.getUserRole(user);

            const adminPages = ['admin.html', 'admin-menu.html', 'meal-demand.html', 'food-waste.html', 'hygiene.html'];
            const studentPages = ['index.html', 'attendance.html', 'menu.html', 'feedback.html', 'complaints.html', 'activity.html', 'announcements.html', 'profile.html'];

            // Login Page
            if (currentFile === 'login.html') {
                if (user && role) {
                    window.location.href = role === 'admin' ? 'admin.html' : 'index.html';
                }
                return;
            }

            // Unauthenticated
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            // Student accessing admin tools
            if (adminPages.includes(currentFile) && role !== 'admin') {
                alert('⚠️ Access Denied: Administrator privileges required.');
                window.location.href = 'index.html';
                return;
            }

            this.updateNavigationBar(user, role, currentFile);
        },

        updateNavigationBar: function (user, role, currentFile) {
            const nav = document.querySelector('header nav');
            if (!nav) return;

            const existingAuthEl = nav.querySelector('.nav-auth-container');
            if (existingAuthEl) existingAuthEl.remove();

            const authContainer = document.createElement('div');
            authContainer.className = 'nav-auth-container';
            authContainer.style.display = 'inline-flex';
            authContainer.style.alignItems = 'center';
            authContainer.style.gap = '8px';
            authContainer.style.marginLeft = 'auto';

            const userName = this.getUserName(user);
            const roleLabel = role === 'admin' ? 'Admin' : 'Student';
            const roleBadgeClass = role === 'admin' ? 'admin-badge' : 'student-badge';

            authContainer.innerHTML = `
                <span class="nav-user-pill ${roleBadgeClass}" title="${escapeHtml(user.email || '')}">
                    ${role === 'admin' ? '🛡️' : '🎓'} ${escapeHtml(userName)}
                    <small style="opacity:0.8;font-size:11px;padding-left:4px">(${roleLabel})</small>
                </span>
                <button type="button" class="nav-logout-btn" id="mealsync-global-logout" title="Sign out of MealSync">
                    Logout
                </button>
            `;

            nav.appendChild(authContainer);

            const logoutBtn = document.getElementById('mealsync-global-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to log out?')) {
                        MealSyncAuth.signOut();
                    }
                });
            }

            // Hide admin links from students
            if (role === 'student') {
                const adminLinks = nav.querySelectorAll('a[href="admin.html"], a[href="admin-menu.html"], a[href="food-waste.html"], a[href="meal-demand.html"], a[href="hygiene.html"]');
                adminLinks.forEach(link => link.style.display = 'none');
            }
        }
    };

    /* ==========================================================================
       2. LIVE DATABASE OPERATIONS (MealSyncDB)
       ========================================================================== */

    const MealSyncDB = {
        // --- PROFILES ---
        getProfile: async function (userId) {
            const client = getSupabase();
            if (!client || !userId) return null;

            try {
                const { data, error } = await client
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error && error.code === 'PGRST116') {
                    // Profile does not exist yet; create it
                    const user = await MealSyncAuth.getCurrentUser();
                    if (user) {
                        const newProfile = {
                            id: userId,
                            full_name: MealSyncAuth.getUserName(user),
                            email: user.email || '',
                            role: MealSyncAuth.getUserRole(user),
                            student_id: 'MS-' + userId.substring(0, 6).toUpperCase()
                        };
                        const { data: created } = await client.from('profiles').insert(newProfile).select().single();
                        return created || newProfile;
                    }
                }
                return data;
            } catch (err) {
                console.error('Error fetching profile from Supabase:', err);
                return null;
            }
        },

        updateProfile: async function (userId, updates) {
            const client = getSupabase();
            if (!client || !userId) return null;

            try {
                const { data, error } = await client
                    .from('profiles')
                    .update(updates)
                    .eq('id', userId)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Error updating profile in Supabase:', err);
                throw err;
            }
        },

        // --- MENU ITEMS ---
        getMenuItems: async function (day = null) {
            const client = getSupabase();
            if (!client) return [];

            try {
                let query = client.from('menu_items').select('*');
                if (day) {
                    query = query.ilike('day', day);
                }
                const { data, error } = await query;
                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Error fetching menu items:', err);
                return [];
            }
        },

        addMenuItem: async function (item) {
            const client = getSupabase();
            if (!client) throw new Error('Database unavailable');

            const { data, error } = await client.from('menu_items').insert(item).select().single();
            if (error) throw error;
            return data;
        },

        updateMenuItem: async function (id, updates) {
            const client = getSupabase();
            if (!client) throw new Error('Database unavailable');

            const { data, error } = await client.from('menu_items').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },

        deleteMenuItem: async function (id) {
            const client = getSupabase();
            if (!client) throw new Error('Database unavailable');

            const { error } = await client.from('menu_items').delete().eq('id', id);
            if (error) throw error;
            return true;
        },

        // --- ATTENDANCE ---
        getTodayAttendance: async function (userId) {
            const client = getSupabase();
            if (!client || !userId) return [];

            const today = new Date().toISOString().split('T')[0];
            try {
                const { data, error } = await client
                    .from('attendance')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('date', today);

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Error fetching today attendance:', err);
                return [];
            }
        },

        recordAttendance: async function (userId, userEmail, userName, mealType, status) {
            const client = getSupabase();
            if (!client || !userId) return null;

            const today = new Date().toISOString().split('T')[0];
            const normalizedMeal = mealType.toLowerCase();

            try {
                // Check if record exists for today
                const { data: existing } = await client
                    .from('attendance')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('date', today)
                    .eq('meal_type', normalizedMeal);

                let result;
                if (existing && existing.length > 0) {
                    const { data, error } = await client
                        .from('attendance')
                        .update({ status: status })
                        .eq('id', existing[0].id)
                        .select()
                        .single();
                    if (error) throw error;
                    result = data;
                } else {
                    const { data, error } = await client
                        .from('attendance')
                        .insert({
                            user_id: userId,
                            user_email: userEmail,
                            user_name: userName,
                            meal_type: normalizedMeal,
                            status: status,
                            date: today,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        })
                        .select()
                        .single();
                    if (error) throw error;
                    result = data;
                }

                // If marked Having, update streak in database profile
                if (status === 'having') {
                    const profile = await this.getProfile(userId);
                    if (profile) {
                        const newStreak = (profile.streak_count || 0) + 1;
                        const updates = {
                            streak_count: newStreak,
                            last_attendance_date: today
                        };
                        if (newStreak >= (profile.streak_target || 7) && profile.voucher_status === 'locked') {
                            updates.voucher_status = 'available';
                        }
                        await this.updateProfile(userId, updates);
                    }
                }

                return result;
            } catch (err) {
                console.error('Error recording attendance in Supabase:', err);
                throw err;
            }
        },

        getUserAttendanceHistory: async function (userId, limit = 10) {
            const client = getSupabase();
            if (!client || !userId) return [];

            try {
                const { data, error } = await client
                    .from('attendance')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Error fetching attendance history:', err);
                return [];
            }
        },

        // --- FEEDBACK ---
        getFeedbacks: async function () {
            const client = getSupabase();
            if (!client) return [];

            try {
                const { data, error } = await client
                    .from('feedback')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Error fetching feedbacks:', err);
                return [];
            }
        },

        submitFeedback: async function (feedbackData) {
            const client = getSupabase();
            if (!client) throw new Error('Database unavailable');

            const { data, error } = await client.from('feedback').insert(feedbackData).select().single();
            if (error) throw error;
            return data;
        },

        // --- COMPLAINTS ---
        getComplaints: async function (userId = null, isAdmin = false) {
            const client = getSupabase();
            if (!client) return [];

            try {
                let query = client.from('complaints').select('*').order('created_at', { ascending: false });
                if (!isAdmin && userId) {
                    query = query.eq('user_id', userId);
                }
                const { data, error } = await query;
                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Error fetching complaints:', err);
                return [];
            }
        },

        submitComplaint: async function (complaintData) {
            const client = getSupabase();
            if (!client) throw new Error('Database unavailable');

            const { data, error } = await client.from('complaints').insert(complaintData).select().single();
            if (error) throw error;
            return data;
        },

        // --- FOOD WASTE ---
        getFoodWaste: async function (limit = 10) {
            const client = getSupabase();
            if (!client) return [];

            try {
                const { data, error } = await client
                    .from('food_waste')
                    .select('*')
                    .order('date', { ascending: false })
                    .limit(limit);

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Error fetching food waste:', err);
                return [];
            }
        },

        submitFoodWaste: async function (wasteData) {
            const client = getSupabase();
            if (!client) throw new Error('Database unavailable');

            const { data, error } = await client.from('food_waste').insert(wasteData).select().single();
            if (error) throw error;
            return data;
        },

        // --- HYGIENE AUDITS ---
        getHygieneAudits: async function (limit = 10) {
            const client = getSupabase();
            if (!client) return [];

            try {
                const { data, error } = await client
                    .from('hygiene_audits')
                    .select('*')
                    .order('date', { ascending: false })
                    .limit(limit);

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Error fetching hygiene audits:', err);
                return [];
            }
        },

        submitHygieneAudit: async function (auditData) {
            const client = getSupabase();
            if (!client) throw new Error('Database unavailable');

            const { data, error } = await client.from('hygiene_audits').insert(auditData).select().single();
            if (error) throw error;
            return data;
        },

        // --- ANNOUNCEMENTS ---
        getAnnouncements: async function () {
            const client = getSupabase();
            if (!client) return [];

            try {
                const { data, error } = await client
                    .from('announcements')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Error fetching announcements:', err);
                return [];
            }
        },

        // --- USER STATS ---
        getUserStats: async function (userId) {
            const client = getSupabase();
            if (!client || !userId) return { attended: 0, skipped: 0, feedbacks: 0, complaints: 0 };

            try {
                const [attendanceRes, feedbackRes, complaintRes] = await Promise.all([
                    client.from('attendance').select('status').eq('user_id', userId),
                    client.from('feedback').select('id', { count: 'exact' }).eq('user_id', userId),
                    client.from('complaints').select('id', { count: 'exact' }).eq('user_id', userId)
                ]);

                const attendanceRecords = attendanceRes.data || [];
                const attended = attendanceRecords.filter(r => r.status === 'having').length;
                const skipped = attendanceRecords.filter(r => r.status === 'skipping').length;
                const feedbacks = feedbackRes.count || (feedbackRes.data ? feedbackRes.data.length : 0);
                const complaints = complaintRes.count || (complaintRes.data ? complaintRes.data.length : 0);

                return { attended, skipped, feedbacks, complaints };
            } catch (err) {
                console.error('Error fetching user stats:', err);
                return { attended: 0, skipped: 0, feedbacks: 0, complaints: 0 };
            }
        },

        // --- ADMIN DASHBOARD STATS ---
        getAdminStats: async function () {
            const client = getSupabase();
            if (!client) return null;

            const today = new Date().toISOString().split('T')[0];
            try {
                const [studentsRes, attendanceRes, wasteRes, hygieneRes] = await Promise.all([
                    client.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
                    client.from('attendance').select('status, meal_type').eq('date', today),
                    client.from('food_waste').select('wasted_kg').eq('date', today),
                    client.from('hygiene_audits').select('score_percent, rating').order('date', { ascending: false }).limit(1)
                ]);

                const totalStudents = studentsRes.count || 450;
                const todayAttendance = attendanceRes.data || [];
                const expectedAttendance = todayAttendance.filter(r => r.status === 'having').length;

                let todayWasteKg = 0;
                if (wasteRes.data) {
                    wasteRes.data.forEach(w => { todayWasteKg += Number(w.wasted_kg || 0); });
                }

                let hygieneScore = 92;
                if (hygieneRes.data && hygieneRes.data.length > 0) {
                    hygieneScore = hygieneRes.data[0].score_percent;
                }

                return {
                    totalStudents,
                    expectedAttendance,
                    todayWasteKg: Math.round(todayWasteKg * 10) / 10,
                    hygieneScore,
                    todayAttendance
                };
            } catch (err) {
                console.error('Error fetching admin stats:', err);
                return null;
            }
        }
    };

    /* ==========================================================================
       3. STREAK & VOUCHER REDEMPTION (Connected to Supabase Profile)
       ========================================================================== */

    const MealSyncStreak = {
        getStreakData: async function (userId) {
            if (!userId) {
                return {
                    currentStreak: 5,
                    targetGoal: 7,
                    voucherStatus: 'available',
                    voucherCode: 'MEALSYNC-STREAK-2OFF'
                };
            }

            const profile = await MealSyncDB.getProfile(userId);
            if (profile) {
                return {
                    currentStreak: profile.streak_count || 5,
                    targetGoal: profile.streak_target || 7,
                    voucherStatus: profile.voucher_status || 'available',
                    voucherCode: profile.voucher_code || 'MEALSYNC-STREAK-2OFF',
                    redeemedDate: profile.voucher_redeemed_date,
                    redeemReference: profile.voucher_reference
                };
            }

            return {
                currentStreak: 5,
                targetGoal: 7,
                voucherStatus: 'available',
                voucherCode: 'MEALSYNC-STREAK-2OFF'
            };
        },

        redeemVoucher: async function (userId) {
            if (!userId) throw new Error('User not authenticated');

            const profile = await MealSyncDB.getProfile(userId);
            if (profile && profile.voucher_status === 'redeemed') {
                return {
                    success: false,
                    message: 'Voucher has already been redeemed for this billing cycle.',
                    data: profile
                };
            }

            const today = new Date().toISOString().split('T')[0];
            const ref = '#MS-VOUCHER-' + Math.floor(100000 + Math.random() * 900000);

            const updated = await MealSyncDB.updateProfile(userId, {
                voucher_status: 'redeemed',
                voucher_redeemed_date: today,
                voucher_reference: ref
            });

            return {
                success: true,
                message: 'Voucher redeemed! 2% discount applied to your mess fees.',
                data: {
                    currentStreak: updated.streak_count,
                    targetGoal: updated.streak_target,
                    voucherStatus: 'redeemed',
                    voucherCode: updated.voucher_code,
                    redeemedDate: today,
                    redeemReference: ref
                }
            };
        }
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Expose globally
    window.MealSyncAuth = MealSyncAuth;
    window.MealSyncDB = MealSyncDB;
    window.MealSyncStreak = MealSyncStreak;

    // Enforce route protection on load
    document.addEventListener('DOMContentLoaded', function () {
        MealSyncAuth.protectRoutes();
    });

})();
