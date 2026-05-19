# 🚌 Smart Bus Timing & Route System

A full-stack web application for searching bus routes, viewing schedules, and managing buses via an admin panel.

---

## 📁 Folder Structure

```
smart-bus-system/
├── backend/
│   ├── controllers/
│   │   └── busController.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── models/
│   │   └── Bus.js
│   ├── routes/
│   │   └── busRoutes.js
│   ├── .env
│   ├── package.json
│   └── server.js
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── services/
    │   │   └── busApi.js
    │   ├── App.js
    │   ├── App.css
    │   └── index.js
    └── package.json
```

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

### 1. Backend

```bash
cd backend
npm install
# Edit .env if needed (MONGO_URI, PORT)
npm run dev
# Server: http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# App: http://localhost:3000
```

---

## 🔌 REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/buses` | Get all buses |
| GET | `/buses/search?source=X&destination=Y` | Search buses (returns outbound + return) |
| POST | `/buses/add` | Add a new bus |
| DELETE | `/buses/:id` | Delete a bus by ID |

### POST /buses/add — Request Body

```json
{
  "busNumber": "AP 9876",
  "source": "Tirupati",
  "destination": "Chennai",
  "departureTime": "06:30 AM",
  "arrivalTime": "10:45 AM",
  "stops": ["Chittoor", "Vellore"]
}
```
<img width="1284" height="500" alt="image" src="https://github.com/user-attachments/assets/5c8f48df-1f58-4738-a4db-b4aa4b7c6c96" /> 
                                                     ### <B>Admin Panel</B>
<img width="2742" height="600" alt="image" src="https://github.com/user-attachments/assets/6589c3c7-6ea5-4c89-b730-f3600cdaf039" />
                                                    ### <B>Admin Panel</B>



### GET /buses/search — Response

```json
{
  "success": true,
  "outbound": [...],
  "return": [...]
}
```

---

## 🌟 Features

- **Hero section** with animated bus illustration and overlay search bar
- **Outbound & Return** bus results shown separately
- **Bus cards** with number, route, timing, and stop badges
- **Admin Panel** with stats, add-bus form, and delete table
- **Responsive** on all screen sizes
- **Modern blue + white** design with Google Fonts
