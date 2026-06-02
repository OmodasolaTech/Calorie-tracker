/* ============================================
   CalorieFlow — Application Logic
   ============================================ */

(function () {
    'use strict';

    // --- Constants ---
    const STORAGE_KEYS = {
        MEALS: 'calorieflow_meals',
        SETTINGS: 'calorieflow_settings',
    };

    const CATEGORY_EMOJIS = {
        breakfast: '🌅',
        lunch: '☀️',
        dinner: '🌙',
        snack: '🍿',
        drink: '🥤',
    };

    const DEFAULT_SETTINGS = {
        calorieGoal: 2000,
        userName: '',
    };

    // --- State ---
    let state = {
        meals: [],
        settings: { ...DEFAULT_SETTINGS },
    };

    // --- DOM Elements ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const DOM = {
        headerDate: $('#header-date'),
        ringProgress: $('#ring-progress'),
        ringCalories: $('#ring-calories'),
        ringGoal: $('#ring-goal'),
        remainingValue: $('#remaining-value'),
        consumedValue: $('#consumed-value'),
        mealsValue: $('#meals-value'),
        mealForm: $('#meal-form'),
        mealName: $('#meal-name'),
        mealCalories: $('#meal-calories'),
        mealCategory: $('#meal-category'),
        mealsList: $('#meals-list'),
        emptyState: $('#empty-state'),
        mealCountBadge: $('#meal-count-badge'),
        btnSettings: $('#btn-settings'),
        btnHistory: $('#btn-history'),
        settingsModal: $('#settings-modal'),
        historyModal: $('#history-modal'),
        btnCloseSettings: $('#btn-close-settings'),
        btnCloseHistory: $('#btn-close-history'),
        calorieGoalInput: $('#calorie-goal'),
        userNameInput: $('#user-name'),
        btnSaveSettings: $('#btn-save-settings'),
        btnClearToday: $('#btn-clear-today'),
        btnClearAll: $('#btn-clear-all'),
        weeklyChart: $('#weekly-chart'),
        historyList: $('#history-list'),
        toast: $('#toast'),
    };

    // --- Utility Functions ---
    function getTodayKey() {
        return new Date().toISOString().split('T')[0];
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });
    }

    function formatShortDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    }

    function formatTime(isoStr) {
        const date = new Date(isoStr);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    }

    function getDayName(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // --- LocalStorage ---
    function loadState() {
        try {
            const mealsData = localStorage.getItem(STORAGE_KEYS.MEALS);
            const settingsData = localStorage.getItem(STORAGE_KEYS.SETTINGS);

            if (mealsData) {
                state.meals = JSON.parse(mealsData);
            }
            if (settingsData) {
                state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) };
            }
        } catch (e) {
            console.error('Failed to load state:', e);
            state.meals = [];
            state.settings = { ...DEFAULT_SETTINGS };
        }
    }

    function saveMeals() {
        try {
            localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(state.meals));
        } catch (e) {
            console.error('Failed to save meals:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    // --- Data Helpers ---
    function getTodayMeals() {
        const today = getTodayKey();
        return state.meals.filter((m) => m.date === today);
    }

    function getTotalCaloriesToday() {
        return getTodayMeals().reduce((sum, m) => sum + m.calories, 0);
    }

    function getMealsByDate(dateStr) {
        return state.meals.filter((m) => m.date === dateStr);
    }

    function getCaloriesForDate(dateStr) {
        return getMealsByDate(dateStr).reduce((sum, m) => sum + m.calories, 0);
    }

    function getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    }

    function getUniqueDates() {
        const dates = [...new Set(state.meals.map((m) => m.date))];
        dates.sort((a, b) => b.localeCompare(a));
        return dates;
    }

    // --- Toast ---
    let toastTimeout;
    function showToast(message) {
        clearTimeout(toastTimeout);
        DOM.toast.textContent = message;
        DOM.toast.classList.add('show');
        toastTimeout = setTimeout(() => {
            DOM.toast.classList.remove('show');
        }, 2500);
    }

    // --- Render Functions ---
    function updateHeader() {
        const now = new Date();
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        DOM.headerDate.textContent = now.toLocaleDateString('en-US', options);
    }

    function updateRing() {
        const consumed = getTotalCaloriesToday();
        const goal = state.settings.calorieGoal;
        const remaining = Math.max(0, goal - consumed);
        const progress = Math.min(consumed / goal, 1);

        // Circumference = 2 * PI * r = 2 * PI * 85 ≈ 534.07
        const circumference = 2 * Math.PI * 85;
        const offset = circumference - progress * circumference;

        DOM.ringProgress.style.strokeDashoffset = offset;
        DOM.ringCalories.textContent = consumed.toLocaleString();
        DOM.ringGoal.textContent = goal.toLocaleString();
        DOM.remainingValue.textContent = remaining.toLocaleString();
        DOM.consumedValue.textContent = consumed.toLocaleString();
        DOM.mealsValue.textContent = getTodayMeals().length;

        // Color change if over goal
        if (consumed > goal) {
            DOM.ringProgress.style.stroke = '#f87171';
            DOM.ringProgress.style.filter = 'drop-shadow(0 0 8px rgba(248, 113, 113, 0.4))';
        } else {
            DOM.ringProgress.style.stroke = '';
            DOM.ringProgress.style.filter = '';
        }
    }

    function renderMealsList() {
        const todayMeals = getTodayMeals();
        DOM.mealCountBadge.textContent = todayMeals.length;

        if (todayMeals.length === 0) {
            DOM.mealsList.innerHTML = `
                <div class="empty-state" id="empty-state">
                    <span class="empty-icon">🍽️</span>
                    <p>No meals logged yet today.</p>
                    <p class="empty-sub">Add your first meal above to get started!</p>
                </div>
            `;
            return;
        }

        // Sort by timestamp descending (most recent first)
        const sorted = [...todayMeals].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        DOM.mealsList.innerHTML = sorted
            .map(
                (meal) => `
            <div class="meal-item" data-id="${meal.id}" id="meal-${meal.id}">
                <div class="meal-emoji">${CATEGORY_EMOJIS[meal.category] || '🍽️'}</div>
                <div class="meal-details">
                    <div class="meal-item-name">${escapeHTML(meal.name)}</div>
                    <div class="meal-item-meta">
                        <span>${capitalize(meal.category)}</span>
                        <span>•</span>
                        <span>${formatTime(meal.timestamp)}</span>
                    </div>
                </div>
                <div class="meal-item-calories">${meal.calories} kcal</div>
                <button class="meal-item-delete" data-id="${meal.id}" aria-label="Delete meal" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        `
            )
            .join('');
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function renderAll() {
        updateHeader();
        updateRing();
        renderMealsList();
    }

    // --- Meal Actions ---
    function addMeal(name, calories, category) {
        const meal = {
            id: generateId(),
            name: name.trim(),
            calories: parseInt(calories, 10),
            category: category,
            date: getTodayKey(),
            timestamp: new Date().toISOString(),
        };

        state.meals.push(meal);
        saveMeals();
        renderAll();
        showToast(`✅ Added "${meal.name}" — ${meal.calories} kcal`);
    }

    function deleteMeal(id) {
        const el = document.querySelector(`.meal-item[data-id="${id}"]`);
        if (el) {
            el.classList.add('removing');
            setTimeout(() => {
                state.meals = state.meals.filter((m) => m.id !== id);
                saveMeals();
                renderAll();
                showToast('🗑️ Meal removed');
            }, 300);
        } else {
            state.meals = state.meals.filter((m) => m.id !== id);
            saveMeals();
            renderAll();
        }
    }

    // --- History / Chart ---
    function renderWeeklyChart() {
        const days = getLast7Days();
        const today = getTodayKey();
        const goal = state.settings.calorieGoal;

        // Find max calories for scaling
        let maxCal = goal;
        days.forEach((d) => {
            const cal = getCaloriesForDate(d);
            if (cal > maxCal) maxCal = cal;
        });

        DOM.weeklyChart.innerHTML = days
            .map((d) => {
                const cal = getCaloriesForDate(d);
                const heightPercent = maxCal > 0 ? (cal / maxCal) * 100 : 0;
                const isToday = d === today;
                const isOverGoal = cal > goal;

                return `
                <div class="chart-bar-wrapper ${isToday ? 'today' : ''}">
                    <div class="chart-bar-cal">${cal > 0 ? cal : ''}</div>
                    <div class="chart-bar-track">
                        <div class="chart-bar ${isOverGoal ? 'over-goal' : ''}" style="height: ${heightPercent}%"></div>
                    </div>
                    <div class="chart-bar-day">${getDayName(d)}</div>
                </div>
            `;
            })
            .join('');
    }

    function renderHistoryList() {
        const dates = getUniqueDates();
        const goal = state.settings.calorieGoal;

        if (dates.length === 0) {
            DOM.historyList.innerHTML = '<div class="history-empty">No history yet. Start logging meals!</div>';
            return;
        }

        DOM.historyList.innerHTML = dates
            .slice(0, 30) // show last 30 days max
            .map((d) => {
                const cal = getCaloriesForDate(d);
                const meals = getMealsByDate(d).length;
                const isOver = cal > goal;

                return `
                <div class="history-day">
                    <div class="history-day-info">
                        <div class="history-day-date">${formatShortDate(d)}</div>
                        <div class="history-day-meals">${meals} meal${meals !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="history-day-cals ${isOver ? 'over-goal' : 'under-goal'}">${cal.toLocaleString()} kcal</div>
                </div>
            `;
            })
            .join('');
    }

    // --- Modal Management ---
    function openModal(modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    // --- Event Handlers ---
    function setupEventListeners() {
        // Meal form submission
        DOM.mealForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = DOM.mealName.value.trim();
            const calories = DOM.mealCalories.value;
            const category = DOM.mealCategory.value;

            if (!name || !calories || parseInt(calories) < 1) return;

            addMeal(name, calories, category);
            DOM.mealForm.reset();
            DOM.mealName.focus();
        });

        // Quick preset chips
        document.querySelectorAll('.preset-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                const name = chip.dataset.name;
                const cal = chip.dataset.cal;
                const cat = chip.dataset.cat;
                addMeal(name, cal, cat);
            });
        });

        // Delete meal (delegated)
        DOM.mealsList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.meal-item-delete');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                deleteMeal(id);
            }
        });

        // Settings modal
        DOM.btnSettings.addEventListener('click', () => {
            DOM.calorieGoalInput.value = state.settings.calorieGoal;
            DOM.userNameInput.value = state.settings.userName;
            openModal(DOM.settingsModal);
        });

        DOM.btnCloseSettings.addEventListener('click', () => {
            closeModal(DOM.settingsModal);
        });

        DOM.btnSaveSettings.addEventListener('click', () => {
            const newGoal = parseInt(DOM.calorieGoalInput.value, 10);
            const newName = DOM.userNameInput.value.trim();

            if (newGoal >= 500 && newGoal <= 10000) {
                state.settings.calorieGoal = newGoal;
            }
            state.settings.userName = newName;
            saveSettings();
            renderAll();
            closeModal(DOM.settingsModal);
            showToast('⚙️ Settings saved');
        });

        // Clear today
        DOM.btnClearToday.addEventListener('click', () => {
            const today = getTodayKey();
            state.meals = state.meals.filter((m) => m.date !== today);
            saveMeals();
            renderAll();
            closeModal(DOM.settingsModal);
            showToast('🧹 Today\'s log cleared');
        });

        // Clear all
        DOM.btnClearAll.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                state.meals = [];
                state.settings = { ...DEFAULT_SETTINGS };
                localStorage.removeItem(STORAGE_KEYS.MEALS);
                localStorage.removeItem(STORAGE_KEYS.SETTINGS);
                renderAll();
                closeModal(DOM.settingsModal);
                showToast('🔄 All data reset');
            }
        });

        // History modal
        DOM.btnHistory.addEventListener('click', () => {
            renderWeeklyChart();
            renderHistoryList();
            openModal(DOM.historyModal);
        });

        DOM.btnCloseHistory.addEventListener('click', () => {
            closeModal(DOM.historyModal);
        });

        // Close modals on overlay click
        [DOM.settingsModal, DOM.historyModal].forEach((modal) => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        });

        // Close modals on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (DOM.settingsModal.classList.contains('active')) {
                    closeModal(DOM.settingsModal);
                }
                if (DOM.historyModal.classList.contains('active')) {
                    closeModal(DOM.historyModal);
                }
            }
        });
    }

    // --- Initialize ---
    function init() {
        loadState();
        setupEventListeners();
        renderAll();

        // Add a subtle entrance animation delay
        document.querySelectorAll('.meal-item').forEach((item, i) => {
            item.style.animationDelay = `${i * 0.05}s`;
        });
    }

    // Boot up when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
