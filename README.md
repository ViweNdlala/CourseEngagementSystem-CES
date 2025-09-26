# Mavix: Course Engagement System

Mavix is a full-stack web-based application that is designed to increase student engagement using IT-enabled technologies.

## Features

- **Geofencing:** The system is bounded by a geofence session that is created by the lecturer, with a radius of 100 metres and a custom duration (in minutes). Access to other features like quizzes, attendance, and points is restricted based on whether or not a student has joined the geofence session.

- **Role-based Access:** The system has separate interfaces for lecturers and students. The former creates geofence sessions, preparation resources, quizzes, approves the request of points, and views attendance records. The latter joins geofence sessions, consumes preparation resources, attempts quizzes, requests participation points, and submits attendances.

- **Participation Incentive - Points:** Students are incentivised to participate in class by being awarded points for participating in class, either by answering or asking questions. There is a leaderboard showing top participating students, but also students without any points.

- **Engagement Analytics:** Lecturers can view attendance records, quiz marks, and points leaderboard with drill-down functionalities. 

## System Architecture

### Backend
- **Django 5.0+** - Web framework
- **Django REST Framework** - API development
- **SQLite** - Database

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Axios** - API calls

## Requirements
- Python 3.8+
- Node.js 16+
- npm

## Installation

### Backend Setup
1. Clone the repo with:
    ```bash
   git clone https://github.com/ViweNdlala/CourseEngagementSystem-CES.git
   cd CourseEngagementSystem-CES/backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
   On Windows:
    ```bash
   venv\Scripts\activate
   ```
   On Linux/macOS:
   ```bash
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run migrations:
   ```bash
   python manage.py migrate
   ```

5. Start the server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`and the backend at`http://localhost:8000`.

## Credits
Developed by: 
- <a href="https://github.com/Maliviwe-dev">Maliviwe Zenzile</a>
- <a href ="https://github.com/ViweNdlala">Viwe Ndlala</a>
- <a href="https://github.com/X-Spencer">Xabiso Spencer</a>
