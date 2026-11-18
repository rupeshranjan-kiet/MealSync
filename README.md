# MealSync

**Smart mess management for a better campus experience.**

MealSync is a comprehensive web-based platform designed to bridge the gap between students and mess administrators. It aims to streamline meal operations, reduce food waste, monitor hygiene standards, and improve overall student satisfaction through real-time feedback and attendance tracking.

---

## 🌟 Key Features

### For Students
*   **Student Dashboard:** Get a quick overview of today's meals, upcoming meal timings, and recent announcements.
*   **Weekly Menu:** View the complete daily menu for Breakfast (8:00 AM - 10:00 AM), Lunch (12:30 PM - 2:30 PM), Snacks (5:00 PM - 6:00 PM), and Dinner (7:30 PM - 9:30 PM).
*   **Attendance Tracking:** Mark whether you are "Having" or "Skipping" a meal to help the mess prepare the right amount of food.
*   **Meal Feedback:** Rate meals based on taste, food quality, quantity, and hygiene. Add specific suggestions for improvement.
*   **Profile Management:** Manage dietary preferences (Vegetarian/Non-Vegetarian), notification settings, and track personal meal statistics (meals attended, skipped, and feedback given).

### For Mess Administrators
*   **Meal Demand Prediction:** Calculate exact food requirements (in KG) based on registered students, expected attendance, average serving sizes, and a customizable safety buffer (e.g., 5%).
*   **Food Waste Management:** Record daily food prepared vs. food wasted. Track main reasons for waste (low attendance, over-preparation, etc.) and view 7-day waste trends to optimize future cooking.
*   **Hygiene Audits:** Conduct daily checklist inspections for the Kitchen Area, Dining Area, and Water & Safety to generate an overall hygiene score.
*   **Feedback Monitoring:** View aggregated student ratings and specific meal-wise feedback to identify areas needing immediate attention.

---

## 📁 Project Structure

The frontend is built using standard HTML5, CSS3 (`css/style.css`), and JavaScript (`js/main.js`).

### Core Pages
*   `login.html` - Unified login portal for students and administrators.
*   `index.html` - Main student dashboard with quick actions.
*   `menu.html` - Detailed weekly menu breakdown.
*   `profile.html` - Student account details, accommodation info, and preferences.
*   `feedback.html` - Detailed rating form for recent meals.

### Admin Pages
*   `meal-demand.html` - Smart preparation planner and attendance forecaster.
*   `food-waste.html` - Sustainability tracker and daily waste entry form.
*   `hygiene.html` - Daily inspection checklist and audit history.

### JavaScript & Database Architecture
*   `js/config.example.js` - Configuration template for Supabase project credentials. Copy to `js/config.js` for local or deployment setup (untracked in Git for security).
*   `js/supabase-client.js` - Supabase client integration, authentication state management, role-based route guard, and database CRUD services.
*   `js/main.js` - Handles client-side interactivity, live attendance tracking and storage, meal demand estimation, food waste auto-calculation, real-time hygiene audit scoring, complaint ticket generation, student streaks, and user preferences.

---

## 🚀 Getting Started

Since this is a frontend web application with cloud database integration, no complex build server is required:

1. Clone or download the repository to your local machine.
2. Configure your Supabase credentials securely:
   ```bash
   cp js/config.example.js js/config.js
   ```
   Open `js/config.js` and insert your Supabase Project URL and Anon Public Key. (Note: `js/config.js` is automatically excluded by `.gitignore` so your keys are never committed).
3. Open `login.html` or `index.html` in any modern web browser or run with a local static server (e.g. `npx serve` or Python `http.server`).
