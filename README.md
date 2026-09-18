# CivicSense

An AI-Powered Civic Issue Management Platform allowing citizens to report local issues (potholes, garbage, road damage) and administrators to track their resolution.

## Live Demo
*Pending Deployment*

## Tech Stack
* **Frontend:** React, Vite, Tailwind CSS, React Router, Axios
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Atlas), Mongoose
* **Storage:** Cloudinary (Image uploads)
* **Authentication:** JWT, bcrypt

## Features
* **Role-Based Access Control:** Distinct experiences for Citizens and Admins/Officers.
* **Complaint Tracking:** Users can upload images and descriptions of civic issues.
* **Strict State Machine:** Complaints follow a strict resolution path (SUBMITTED → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED).
* **Status History:** Complete audit trail of who changed a complaint status and when.

## Local Setup
1. Clone the repository.
2. Run `npm install` inside both the `client/` and `server/` directories.
3. Create a `.env` file in the `server/` directory based on `.env.example`.
4. Start the backend: `cd server && npm run dev`
5. Start the frontend: `cd client && npm run dev`

## Demo Credentials (Local)
**Citizen Account:**
* Email: demo-citizen@civicsense.com
* Password: password123

**Officer Account:**
* Email: demo-officer@civicsense.com
* Password: password123