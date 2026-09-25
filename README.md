# MealSync

**Smart mess management for a better campus experience.**[cite: 3]

MealSync is a comprehensive web-based platform designed to bridge the gap between students and mess administrators. It aims to streamline meal operations, reduce food waste, monitor hygiene standards, and improve overall student satisfaction through real-time feedback and attendance tracking[cite: 4, 6, 7, 8].

---

## 🌟 Key Features

### For Students
*   **Student Dashboard:** Get a quick overview of today's meals, upcoming meal timings, and recent announcements[cite: 5].
*   **Weekly Menu:** View the complete daily menu for Breakfast (8:00 AM - 10:00 AM), Lunch (12:30 PM - 2:30 PM), Snacks (5:00 PM - 6:00 PM), and Dinner (7:30 PM - 9:30 PM)[cite: 2].
*   **Attendance Tracking:** Mark whether you are "Having" or "Skipping" a meal to help the mess prepare the right amount of food[cite: 5].
*   **Meal Feedback:** Rate meals based on taste, food quality, quantity, and hygiene. Add specific suggestions for improvement[cite: 8].
*   **Profile Management:** Manage dietary preferences (Vegetarian/Non-Vegetarian), notification settings, and track personal meal statistics (meals attended, skipped, and feedback given)[cite: 1].

### For Mess Administrators
*   **Meal Demand Prediction:** Calculate exact food requirements (in KG) based on registered students, expected attendance, average serving sizes, and a customizable safety buffer (e.g., 5%)[cite: 4].
*   **Food Waste Management:** Record daily food prepared vs. food wasted. Track main reasons for waste (low attendance, over-preparation, etc.) and view 7-day waste trends to optimize future cooking[cite: 7].
*   **Hygiene Audits:** Conduct daily checklist inspections for the Kitchen Area, Dining Area, and Water & Safety to generate an overall hygiene score[cite: 6].
*   **Feedback Monitoring:** View aggregated student ratings and specific meal-wise feedback to identify areas needing immediate attention[cite: 8].

---

## 📁 Project Structure

The frontend is built using standard HTML5 and CSS3 (`css/style.css`).

### Core Pages
*   `login.html` - Unified login portal for students and administrators[cite: 3].
*   `index.html` - Main student dashboard with quick actions[cite: 5].
*   `menu.html` - Detailed weekly menu breakdown[cite: 2].
*   `profile.html` - Student account details, accommodation info, and preferences[cite: 1].
*   `feedback.html` - Detailed rating form for recent meals[cite: 8].

### Admin Pages
*   `meal-demand.html` - Smart preparation planner and attendance forecaster[cite: 4].
*   `food-waste.html` - Sustainability tracker and daily waste entry form[cite: 7].
*   `hygiene.html` - Daily inspection checklist and audit history[cite: 6].

---

## 🚀 Getting Started

Since this is a frontend prototype, no complex server setup is currently required. 

1. Clone or download the repository to your local machine.
2. Ensure the `css/style.css` file is in its proper directory relative to the HTML files[cite: 1, 2].
3. Open `login.html` or `index.html` in any modern web browser to start exploring the interface.
