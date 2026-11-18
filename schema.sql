-- 1. PROFILES TABLE
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    full_name text not null default '',
    email text not null default '',
    role text not null default 'student',
    student_id text default 'MS2026001',
    course text default 'MCA • Semester 1',
    hostel text default 'Hostel A',
    room_number text default 'A-204',
    mess_name text default 'Main Campus Mess',
    phone text default '+91 98765 43210',
    diet_preference text default 'vegetarian',
    notification_preference text default 'all',
    streak_count integer default 5,
    streak_target integer default 7,
    last_attendance_date date default null,
    voucher_status text default 'available',
    voucher_code text default 'MEALSYNC-STREAK-2OFF',
    voucher_redeemed_date date default null,
    voucher_reference text default null,
    created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (true);

-- Auto create profile on auth signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, student_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    'MS-' || upper(substring(new.id::text from 1 for 6))
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill any existing users into profiles
insert into public.profiles (id, full_name, email, role, student_id)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
  email, 
  coalesce(raw_user_meta_data->>'role', 'student'),
  'MS-' || upper(substring(id::text from 1 for 6))
from auth.users
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role;

-- 2. MENU ITEMS TABLE
create table if not exists public.menu_items (
    id uuid default gen_random_uuid() primary key,
    day text not null,
    meal_type text not null,
    meal_name text not null,
    timing text not null,
    description text default '',
    created_at timestamp with time zone default now()
);

alter table public.menu_items enable row level security;
drop policy if exists "Menu items are viewable by everyone" on public.menu_items;
create policy "Menu items are viewable by everyone" on public.menu_items for select using (true);
drop policy if exists "Menu items are editable by authenticated users" on public.menu_items;
create policy "Menu items are editable by authenticated users" on public.menu_items for all using (true);

-- Seed Initial Weekly Menu
truncate public.menu_items;
insert into public.menu_items (day, meal_type, meal_name, timing, description) values
('Monday', 'Breakfast', 'Poha, Tea & Banana', '8:00 AM - 10:00 AM', 'Freshly steamed poha with roasted peanuts, hot tea and banana'),
('Monday', 'Lunch', 'Dal, Rice, Roti, Mix Veg & Salad', '12:30 PM - 2:30 PM', 'Toor dal, steamed basmati rice, hot rotis, seasonal mix veg and fresh salad'),
('Monday', 'Snacks', 'Samosa & Tea', '5:00 PM - 6:00 PM', 'Crispy potato samosas with green chutney and special masala tea'),
('Monday', 'Dinner', 'Paneer Butter Masala, Dal, Roti & Rice', '7:30 PM - 9:30 PM', 'Creamy paneer butter masala, yellow dal fry, fresh phulkas and jeera rice'),
('Tuesday', 'Breakfast', 'Idli, Sambar & Coconut Chutney', '8:00 AM - 10:00 AM', 'Steamed soft idlis served with vegetable sambar and fresh coconut chutney'),
('Tuesday', 'Lunch', 'Rajma, Chawal, Roti & Boondi Raita', '12:30 PM - 2:30 PM', 'Special Punjabi rajma masala with steamed rice, rotis and spiced curd raita'),
('Tuesday', 'Snacks', 'Veg Cutlet & Coffee', '5:00 PM - 6:00 PM', 'Crispy breaded vegetable cutlets with filtered coffee'),
('Tuesday', 'Dinner', 'Aloo Gobi, Dal Tadka, Roti & Kheer', '7:30 PM - 9:30 PM', 'Spiced aloo gobi, homestyle dal tadka, hot rotis and sweet rice kheer'),
('Wednesday', 'Breakfast', 'Aloo Paratha with Curd & Pickle', '8:00 AM - 10:00 AM', 'Whole wheat parathas stuffed with spiced potatoes, served with fresh curd'),
('Wednesday', 'Lunch', 'Chole, Bhature / Rice & Mixed Pickle', '12:30 PM - 2:30 PM', 'Amritsari chole with fragrant rice, rotis and onion salad'),
('Wednesday', 'Snacks', 'Biscuits & Masala Chai', '5:00 PM - 6:00 PM', 'Assorted bakery biscuits with freshly brewed ginger masala chai'),
('Wednesday', 'Dinner', 'Mix Veg Curry, Dal Makhani, Naan & Rice', '7:30 PM - 9:30 PM', 'Rich dal makhani, seasonal vegetable curry, butter naan and rice'),
('Thursday', 'Breakfast', 'Upma, Coconut Chutney & Tea', '8:00 AM - 10:00 AM', 'Semolina upma with mustard seeds and curry leaves with coconut chutney'),
('Thursday', 'Lunch', 'Kadhi Pakora, Rice, Roti & Aloo Bhujia', '12:30 PM - 2:30 PM', 'Tangy yogurt kadhi with soft gram flour pakoras, steamed rice and crispy aloo bhujia'),
('Thursday', 'Snacks', 'Bread Pakora & Green Chutney', '5:00 PM - 6:00 PM', 'Spiced potato stuffed bread fritters with tangy mint coriander chutney'),
('Thursday', 'Dinner', 'Matar Mushroom, Dal, Roti & Jeera Rice', '7:30 PM - 9:30 PM', 'Tender mushrooms and green peas in spiced gravy, dal, rotis and rice'),
('Friday', 'Breakfast', 'Methi Thepla with Pickle & Curd', '8:00 AM - 10:00 AM', 'Gujarati style fenugreek flatbreads with mango pickle and curd'),
('Friday', 'Lunch', 'Dal Panchmel, Baati, Churma & Rice', '12:30 PM - 2:30 PM', 'Authentic Rajasthani dal baati churma with steamed rice'),
('Friday', 'Snacks', 'Poha Chivda & Lemon Tea', '5:00 PM - 6:00 PM', 'Crunchy roasted chivda with refreshing lemon tea'),
('Friday', 'Dinner', 'Shahi Paneer, Dal Fry, Roti & Pulao', '7:30 PM - 9:30 PM', 'Royal cottage cheese curry with dry fruits, dal fry, phulkas and peas pulao'),
('Saturday', 'Breakfast', 'Uttapam with Sambar & Tomato Chutney', '8:00 AM - 10:00 AM', 'Thick rice pancakes topped with onions and tomatoes, with hot sambar'),
('Saturday', 'Lunch', 'Veg Biryani, Mirchi Ka Salan & Raita', '12:30 PM - 2:30 PM', 'Aromatic spiced dum vegetable biryani with salan gravy and cucumber raita'),
('Saturday', 'Snacks', 'Kachori & Sweet Chutney', '5:00 PM - 6:00 PM', 'Flaky moong dal kachoris with sweet tamarind dates chutney'),
('Saturday', 'Dinner', 'Dum Aloo Kashmiri, Dal, Roti & Rice', '7:30 PM - 9:30 PM', 'Baby potatoes simmered in Kashmiri red gravy, yellow dal, rotis and rice'),
('Sunday', 'Breakfast', 'Puri Bhaji & Halwa', '8:00 AM - 10:00 AM', 'Sunday special puffed puris with spicy potato curry and sooji halwa'),
('Sunday', 'Lunch', 'Special Thali: Paneer Lababdar, Dal Tadka, Pulao & Gulab Jamun', '12:30 PM - 2:30 PM', 'Grand weekend feast thali with special sweets and refreshments'),
('Sunday', 'Snacks', 'Grilled Sandwich & Hot Coffee', '5:00 PM - 6:00 PM', 'Crispy toasted vegetable sandwich with brewed coffee'),
('Sunday', 'Dinner', 'Light Khichdi, Kadhi, Papad & Gajar Halwa', '7:30 PM - 9:30 PM', 'Wholesome moong dal khichdi, tempered kadhi, roasted papad and warm gajar ka halwa');

-- 3. ATTENDANCE TABLE
create table if not exists public.attendance (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    user_email text default '',
    user_name text default '',
    meal_type text not null,
    status text not null,
    date date not null default current_date,
    time text default '12:30 PM',
    created_at timestamp with time zone default now()
);

alter table public.attendance enable row level security;
drop policy if exists "Attendance viewable by everyone" on public.attendance;
create policy "Attendance viewable by everyone" on public.attendance for select using (true);
drop policy if exists "Attendance insertable by authenticated users" on public.attendance;
create policy "Attendance insertable by authenticated users" on public.attendance for insert with check (true);
drop policy if exists "Attendance updatable by authenticated users" on public.attendance;
create policy "Attendance updatable by authenticated users" on public.attendance for update using (true);

-- 4. FEEDBACK TABLE
create table if not exists public.feedback (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    user_name text default '',
    meal_type text not null,
    taste text default 'Good',
    quality text default 'Good',
    quantity text default 'Good',
    hygiene text default 'Good',
    overall_rating numeric default 4,
    suggestion text default '',
    date date default current_date,
    created_at timestamp with time zone default now()
);

alter table public.feedback enable row level security;
drop policy if exists "Feedback viewable by everyone" on public.feedback;
create policy "Feedback viewable by everyone" on public.feedback for select using (true);
drop policy if exists "Feedback insertable by authenticated users" on public.feedback;
create policy "Feedback insertable by authenticated users" on public.feedback for insert with check (true);

insert into public.feedback (user_name, meal_type, taste, quality, quantity, hygiene, overall_rating, suggestion, date) values
('Pratham Arora', 'Lunch', 'Excellent', 'Good', 'Good', 'Good', 4.5, 'Paneer quality was great today!', current_date),
('Ananya Sharma', 'Breakfast', 'Good', 'Good', 'Good', 'Excellent', 4.2, 'Poha was hot and fresh.', current_date),
('Rahul Verma', 'Dinner', 'Good', 'Average', 'Good', 'Good', 3.8, 'Rotis were a bit cold by 8:30 PM.', current_date - 1);

-- 5. COMPLAINTS TABLE
create table if not exists public.complaints (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade,
    user_name text default '',
    category text not null,
    meal_type text default '',
    priority text default 'Medium',
    description text not null,
    status text default 'Under Review',
    created_date text default 'Today',
    created_at timestamp with time zone default now()
);

alter table public.complaints enable row level security;
drop policy if exists "Complaints viewable by everyone" on public.complaints;
create policy "Complaints viewable by everyone" on public.complaints for select using (true);
drop policy if exists "Complaints insertable by authenticated users" on public.complaints;
create policy "Complaints insertable by authenticated users" on public.complaints for insert with check (true);
drop policy if exists "Complaints updatable by authenticated users" on public.complaints;
create policy "Complaints updatable by authenticated users" on public.complaints for update using (true);

insert into public.complaints (id, user_name, category, meal_type, priority, description, status, created_date) values
('#MS1024', 'Pratham Arora', 'Food Quantity', 'Lunch', 'Medium', 'Lunch quantity was insufficient and many students had to wait for additional servings.', 'Under Review', '22 Aug 2026'),
('#MS1023', 'Aman Singh', 'Mess Timing', 'Breakfast', 'Low', 'Breakfast service started 15 minutes late today.', 'Resolved', '20 Aug 2026'),
('#MS1022', 'Priya Roy', 'Hygiene', 'Dinner', 'High', 'Water cooler filter near dining hall entrance needs cleaning.', 'Resolved', '18 Aug 2026');

-- 6. FOOD WASTE TABLE
create table if not exists public.food_waste (
    id uuid default gen_random_uuid() primary key,
    date date default current_date,
    meal_type text not null,
    prepared_kg numeric not null default 0,
    served_kg numeric not null default 0,
    wasted_kg numeric not null default 0,
    waste_percentage numeric not null default 0,
    reason text default 'Low Attendance',
    notes text default '',
    created_at timestamp with time zone default now()
);

alter table public.food_waste enable row level security;
drop policy if exists "Food waste viewable by everyone" on public.food_waste;
create policy "Food waste viewable by everyone" on public.food_waste for select using (true);
drop policy if exists "Food waste editable by everyone" on public.food_waste;
create policy "Food waste editable by everyone" on public.food_waste for all using (true);

insert into public.food_waste (date, meal_type, prepared_kg, served_kg, wasted_kg, waste_percentage, reason, notes) values
(current_date, 'Breakfast', 60, 56, 4.0, 6.7, 'Low Attendance', 'Less crowd due to early lab exams'),
(current_date, 'Lunch', 105, 96, 9.0, 8.6, 'Over Preparation', 'Rain in the afternoon reduced mess footfall'),
(current_date - 1, 'Dinner', 95, 89, 6.0, 6.3, 'Taste Preference', 'Normal waste level'),
(current_date - 2, 'Lunch', 110, 102, 8.0, 7.2, 'Low Attendance', 'Weekend outing by hostelers');

-- 7. HYGIENE AUDITS TABLE
create table if not exists public.hygiene_audits (
    id uuid default gen_random_uuid() primary key,
    date date default current_date,
    score_percent numeric not null default 92,
    rating text not null default 'Excellent',
    inspector text default 'Chief Mess Inspector',
    notes text default 'All inspection checks passed with high hygiene standards.',
    created_at timestamp with time zone default now()
);

alter table public.hygiene_audits enable row level security;
drop policy if exists "Hygiene audits viewable by everyone" on public.hygiene_audits;
create policy "Hygiene audits viewable by everyone" on public.hygiene_audits for select using (true);
drop policy if exists "Hygiene audits editable by everyone" on public.hygiene_audits;
create policy "Hygiene audits editable by everyone" on public.hygiene_audits for all using (true);

insert into public.hygiene_audits (date, score_percent, rating, notes) values
(current_date, 92, 'Excellent', 'All food storage, dishwashing and dining surfaces properly sanitized.'),
(current_date - 1, 88, 'Good', 'Minor water stagnation cleared near dishwashing zone.'),
(current_date - 3, 95, 'Excellent', 'Weekly deep cleaning of cold storage and dining hall completed.');

-- 8. ANNOUNCEMENTS TABLE
create table if not exists public.announcements (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    category text default 'GENERAL',
    content text not null,
    is_important boolean default false,
    date text default '23 Aug 2026',
    icon text default '📢',
    created_at timestamp with time zone default now()
);

alter table public.announcements enable row level security;
drop policy if exists "Announcements viewable by everyone" on public.announcements;
create policy "Announcements viewable by everyone" on public.announcements for select using (true);
drop policy if exists "Announcements editable by everyone" on public.announcements;
create policy "Announcements editable by everyone" on public.announcements for all using (true);

insert into public.announcements (title, category, content, is_important, date, icon) values
('Dinner timing changed today', 'IMPORTANT', 'Dinner will be served from 7:30 PM to 9:30 PM today due to kitchen equipment maintenance work.', true, 'Today', '📢'),
('Special Sunday Menu', 'MENU', 'A special Sunday lunch feast featuring Paneer Lababdar, Gulab Jamun and Pulao will be served this weekend.', false, '22 Aug 2026', '🍽️'),
('Water Cooler Maintenance', 'MAINTENANCE', 'Drinking water facilities near the dining hall will be under maintenance from 3 PM to 5 PM.', false, '21 Aug 2026', '💧'),
('Monthly Menu Feedback Poll', 'SURVEY', 'Vote on next month''s Sunday dessert and evening snacks selection in the MealSync app.', false, '20 Aug 2026', '⭐');
