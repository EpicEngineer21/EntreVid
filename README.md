# EntreVid - Entrepreneur Video Directory

EntreVid is a full-stack directory application built with Node.js and Express. It provides a secure platform for verified entrepreneurs to share their YouTube pitches, presentations, and product showcases with the world. 

## Features
- **Modern UI**: Fully static HTML/CSS/JS frontend styled with Tailwind CSS, utilizing a slick glassmorphism dark theme.
- **API-Driven Architecture**: Clean JSON-based API powering the frontend, completely decoupled from EJS server-rendering.
- **Role-Based Access**: Multi-tier user system (User, Verified Entrepreneur, Admin).
- **Secure Authentication**: Encrypted passwords (bcrypt), secure HTTP-only sessions, and comprehensive account lockout/rate limiting policies.
- **Password Recovery & Email Verification**: Secure OTP email flows via SMTP.
- **Audit Logging & Security**: Strict CSRF tokens, CSP headers, rate-limiters, and comprehensive audit trails for critical actions.
- **File Persistence**: Atomically written JSON data stores ensuring lightweight and non-corruptible persistence without needing a traditional database engine.

## Tech Stack
- Frontend: Vanilla HTML/JS, Tailwind CSS, Heroicons.
- Backend: Node.js, Express, `express-session`, `express-rate-limit`, Helmet.
- Data Layer: Atomic JSON file persistence.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` (or create a `.env` file) and provide values for session secrets and your email transport.
   
3. **Run the server:**
   ```bash
   npm run dev    # For development (with nodemon)
   npm start      # For production
   ```

4. **Access the application:**
   The server will start on port 3000 by default. Visit `http://localhost:3000` to interact with the directory.

## File Structure
- `/public`: Static frontend files (HTML pages, CSS, client-side scripts).
- `/data`: JSON databases (videos.json, users.json, etc.).
- `/src`: Tailwind input styling.
- `app.js`: Main Express API server.
