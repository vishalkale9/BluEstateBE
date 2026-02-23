# BluEstate Backend

Premium Backend Service for BluEstate Application.

## 🚀 Features

- **MVC Architecture**: Clean separation of concerns.
- **Scalable Structure**: Ready for high-growth applications.
- **Security First**: Middleware-driven security and validation.
- **RESTful API**: Following industry best practices.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: (Planned/To be implemented)
- **Authentication**: (Planned/To be implemented)

## 📦 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment variables:
   ```bash
   cp .env.example .env
   ```
   (Update the valves in `.env`)

### Running the App

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📂 Project Structure

- `config/`: Configuration files (database, environment).
- `controllers/`: Request handlers.
- `middlewares/`: Custom Express middlewares.
- `models/`: Database schemas.
- `routes/`: API route definitions.
- `services/`: Business logic.
- `utils/`: Helper functions.
- `tests/`: Unit and integration tests.

## 📜 License

ISC
