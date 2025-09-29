# Mavix: Course Engagement System

Mavix is a full-stack web-based application that is designed to increase student engagement using IT-enabled technologies.

## Features

- **Geofencing:** The system is bounded by a geofence session that is created by the lecturer, with a radius of 100 metres and a custom duration (in minutes). Access to other features like quizzes, attendance, and points is restricted based on whether or not a student has joined the geofence session.

- **Role-based Access:** The system has separate interfaces for lecturers and students. The former creates geofence sessions, preparation resources, quizzes, approves the request of points, and views attendance records. The latter joins geofence sessions, consumes preparation resources, attempts quizzes, requests participation points, and submits attendances.

- **Participation Incentive - Points:** Students are incentivised to participate in class by being awarded points for participating in class, either by answering or asking questions. There is a leaderboard showing top participating students, but also students without any points.

- **Engagement Analytics:** Lecturers can view attendance records, quiz marks, and points leaderboard with drill-down functionalities. 

## System Architecture

### Backend
- **Django** - Web framework
- **Django REST Framework** - API development
- **SQLite** - Database

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Axios** - API calls

## Project Structure
```
CourseEngagementSystem-CES/
├── backend/           # Django REST API
│   ├── accounts/      # User authentication
│   ├── courses/       # Course & geofencing
│   ├── attendance/    # Attendance tracking
│   ├── points/        # Points & leaderboard
│   ├── quizzes/       # Quiz management
│   └── preparation/   # Learning resources
└── frontend/          # React application
    ├── src/
    │   ├── components/    # Shared components
    │   ├── student/       # Student interface
    │   ├── lecturer/      # Lecturer interface
    │   └── contexts/      # Global state management
    └── public/
```

## Requirements
- Python 3.8+
- Node.js 16+
- npm

## Installation

### Personal Access Token (PAT) Generation and Repo Clone
1. Go to Settings on your Github profile
2. Then go to Developer Settings
3. Click on Personal Access Tokens (classic)
4. Then click on Generate new token and check the "repo" option
5. Scroll down then press Generate token
6. Copy the generated PAT
7. Then clone the repository with:
   ```bash
   git clone https://<username>:<PAT>@github.com/ViweNdlala/CourseEngagementSystem-CES.git
   ```

### Backend Setup
1. Clone the repo with:
    ```bash
   git clone https://github.com/ViweNdlala/CourseEngagementSystem-CES.git
   cd CourseEngagementSystem-CES
   ```

2. Create and acitvate a virtual environment:
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
   cd backend
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

## Deployment
The application is deployed and accessible at: **[https://ces-2.cs.uct.ac.za/](https://ces-2.cs.uct.ac.za/)**

## Login Details
### Lecturers
- email: Maliviwe@gmail.com, password: mali1015
- email: viwe@gmail.com, password: viwe2025

### Students
- email: james@gmail.com, password: 2468
- email: Xabiso@myuct.ac.za, password: Xab2025
- email: johndoe@gmail.com, password: john1234
- email: janedoe@gmail.com, password: jane1234
- email: melo22@gmail.com, password: melo1234
- email: taytay@gmail.com, password: its_tay_03
- email: teddy@gmail.com, password: theo567
- email: vivian47@gmail.com, password: viv123
- email: karabo13@gmail.comm, password: krabs1010
- email: kathy23@gmail.com, password: kathy567
- email: mickey123@gmail.com, password: himothy01
- email: ahja09@gmail.com, password: ahjCFC007
- email: johannes99@gmail.com, password: johan65
- email: hlogo6@gmail.com, password: lehlo900
- email: ron77@gmail.com, password: ronnyboi
- email: khwezi8@gmail.com, password: ronnyboi
- email: ron77@gmail.com, password: shooter47
- email: rose@gmail.com, password: rr1234


## Credits
Developed by: 
- <a href="https://github.com/Maliviwe-dev">Maliviwe Zenzile</a>
- <a href ="https://github.com/ViweNdlala">Viwe Ndlala</a>
- <a href="https://github.com/X-Spencer">Xabiso Spencer</a>
