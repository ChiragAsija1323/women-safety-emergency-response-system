# 🛡️ Women Safety & Emergency Response System

A full-stack web application for managing women's safety incidents, responders, and emergency contacts.

## 🚀 Setup Instructions (XAMPP)

### 1. Install XAMPP
Download from https://www.apachefriends.org and install.

### 2. Start XAMPP
Open XAMPP Control Panel → Start **Apache** and **MySQL**.

### 3. Import the Database
1. Open your browser → go to `http://localhost/phpmyadmin`
2. Click **New** in the left sidebar
3. Create a database named `women_safety`
4. Click on `women_safety` → go to **Import** tab
5. Click **Choose File** → select `women_safety.sql`
6. Click **Go** to import

### 4. Install Node Dependencies
```bash
npm install
```

### 5. Run the Server
```bash
node server.js
```

### 6. Open the App
Visit `http://localhost:3000` in your browser.

---

## 📁 Project Structure
```
women-safety/
├── server.js          ← Node.js + Express backend
├── package.json       ← Dependencies
├── women_safety.sql   ← MySQL database (import into XAMPP)
├── README.md
└── public/
    └── index.html     ← Frontend (HTML + CSS + JS)
```

## 🗄️ Database Tables
| Table | Description |
|---|---|
| USER | Registered users (victims, responders, admins) |
| LOCATION | Geographic location data |
| INCIDENT | Reported safety incidents |
| RESPONDER | Police, NGO, Medical responders |
| INCIDENT_RESPONDER | Bridge: which responder handles which incident |
| RESPONDER_CONTACT | Phone numbers for each responder |
| EMERGENCY_CONTACT | Emergency contacts for each user |
| EMERGENCY_CONTACT_PHONE | Phone numbers for emergency contacts |
| RESPONSE_LOG | Audit trail of responder actions |

## ⚙️ Environment Variables (optional for deployment)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=women_safety
```

## 📦 Dependencies
```bash
npm install express mysql2 cors
```
