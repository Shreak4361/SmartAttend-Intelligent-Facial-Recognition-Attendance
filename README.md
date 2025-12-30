# SmartAttend-Intelligent-Facial-Recognition-Attendance
📸 AI-Powered Attendance Management System

An end-to-end smart attendance system that automates attendance marking using face recognition from group photos.
The system integrates a Node.js + Express backend with a FastAPI-based AI microservice for face detection, recognition, and attendance updates.

🚀 Project Overview

Traditional attendance systems are manual, time-consuming, and error-prone.
This project solves that by enabling:

User registration & authentication

Uploading multiple user images for face encoding

Uploading session group photos

Automatic face recognition

Attendance marking linked to sessions

Role-based admin controls

Cloud-based image storage



✨ Key Features
👤 User Features

Secure user registration & login (JWT + cookies)

Upload multiple personal photos for better face recognition

View attendance percentage

View attended session details

Like and review sessions

🛠️ Admin Features

Admin-only login & dashboard

Upload session details with group photo

Automatic attendance marking via AI

Grant admin access to users (with password verification)

🤖 AI / ML Features

Face detection & encoding using face-recognition

Average face encoding per user for robustness

Attendance marking from group photos

Duplicate prevention via encoding tracking

🧱 Architecture
Browser (EJS)
     |
Node.js + Express (Backend)
     |
Axios (HTTP calls)
     |
FastAPI Face Recognition Service
     |
MongoDB (Users + Attendance)
     |
Cloudinary (Image Storage)

🛠️ Tech Stack
Backend

Node.js

Express.js

MongoDB + Mongoose

JWT Authentication

bcrypt

Axios

EJS (Server-Side Rendering)

AI / ML Service

FastAPI

face-recognition

OpenCV

NumPy

MongoDB (PyMongo)

Cloud & Storage

Cloudinary

Multer

📁 Project Structure
attendance_Sys/
│
├── src/
│   ├── config/          # DB & Cloudinary config
│   ├── models/          # Mongoose schemas
│   ├── middlewares/     # Auth & upload middleware
│   ├── services/        # Face recognition service calls
│   ├── views/           # EJS templates
│   └── app.js           # Express app (routes + logic)
│
├── public/              # Static assets
├── server.js            # Server entry point
├── face_service.py      # FastAPI ML microservice
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables
└── README.md

🔐 Environment Variables

Create a .env file:

PORT=3000
MONGO_URI=mongodb://localhost:27017/attendanceSys
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx

⚙️ Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/Shreak4361/SmartAttend-Intelligent-Facial-Recognition-Attendance
cd attendance-system

2️⃣ Install Node.js Dependencies
npm install

3️⃣ Install Python Dependencies
pip install -r requirements.txt


⚠️ Important (Windows Users)
face-recognition requires dlib.
Install Visual Studio Build Tools if it fails.

4️⃣ Run MongoDB
mongod

5️⃣ Start FastAPI Face Recognition Service
uvicorn face_service:app --reload --port 8000

6️⃣ Start Node.js Server
node server.js


Visit:

http://localhost:3000

📷 Image Flow
User Image Upload

User uploads multiple photos

Stored in Cloudinary

URLs saved in MongoDB

AI service extracts face encodings

Average encoding stored per user

Session Group Photo Upload

Admin uploads group photo

Stored in Cloudinary

FastAPI detects faces

Matches with stored encodings

Attendance updated automatically

🧠 Attendance Logic

Each user has:

present_dates

sessions_attended

days_present

Attendance is updated only when a face match is found

Uses distance-based face matching with tolerance

📊 Screens & Pages

Home Page

User Login / Register

User Dashboard (attendance %)

Session Details Page

Admin Dashboard

Session Upload Page

📸 Screenshots can be added here

/screenshots/
  ├── login.png
  ├── dashboard.png
  ├── admin.png

🔒 Security Practices

Password hashing using bcrypt

JWT stored in HTTP-only cookies

Role-based access control (User / Admin)

Protected routes via middleware

Admin privilege verification before role changes

📌 Future Enhancements

Live camera attendance

Face spoofing detection

Attendance analytics dashboard

Dockerized deployment

AWS / GCP hosting

Notification system

👨‍💻 Author

Shreyansh Srivastava
AI | Backend 
Built as a real-world, production-oriented project.




