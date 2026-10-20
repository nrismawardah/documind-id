# DocuMind ID

DocuMind ID is an AI-powered document question-answering application for Indonesian PDF documents. It retrieves relevant information and generates evidence-based answers with page-level source citations.

## Features

- **Authentication:** Sign up, log in, and manage sessions using Supabase.
- **PDF upload:** Upload PDF files with validation and a 10 MB size limit.
- **Document processing:** Extract text, split content into chunks, and generate embeddings.
- **Hybrid retrieval:** Retrieve relevant chunks using vector similarity and keyword matching.
- **AI-powered Q&A:** Ask questions about uploaded documents using Google Gemini.
- **Source citations:** Display supporting document references and page numbers.
- **Document management:** List, view, and delete uploaded documents.
- **Evidence-based answers:** Handle questions when the available document evidence is insufficient.

## Technology Stack

**Frontend**
- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase JavaScript Client

**Backend**
- Python
- FastAPI
- Pytest
- pypdf
- Google Gen AI SDK
- PyMuPDF, Pillow, and pytesseract

**Database and Infrastructure**
- Supabase Authentication
- PostgreSQL
- pgvector
- SQL migrations and PostgreSQL RPC functions

## Architecture

1. Users authenticate through the Next.js frontend.
2. The frontend sends authenticated requests to the FastAPI backend.
3. The backend validates and processes uploaded PDF files.
4. Extracted text is divided into chunks and converted into embeddings.
5. Search combines semantic similarity and keyword-based retrieval.
6. Google Gemini generates answers based on retrieved evidence.
7. The backend returns the answer and supporting source references.

## Project Structure

```text
documind-id/
├── frontend/
│   └── src/
│       └── app/
│           ├── globals.css
│           ├── layout.tsx
│           └── page.tsx
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   └── services/
│   ├── migrations/
│   ├── tests/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3.11
- A Supabase project with the required database migrations applied
- A Google Gemini API key
- The dependencies required for PDF processing, including Tesseract OCR if OCR functionality is used

### 1. Clone the Repository

```bash
git clone https://github.com/nrismawardah/documind-id.git
cd documind-id
```

### 2. Configure Environment Variables

Create `frontend/.env.local` with the following variables:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Create `backend/.env` based on `backend/.env.example`:

```dotenv
APP_NAME=DocuMind ID API
APP_ENV=development

EMBEDDING_MODEL_NAME=intfloat/multilingual-e5-base
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL_NAME=gemini-3.5-flash-lite

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Replace the placeholders with your own configuration values. Never commit API keys, service-role keys, or other secrets to Git.

### 3. Install Frontend Dependencies

```powershell
npm --prefix .\frontend install
```

### 4. Set Up the Backend

Create and activate a Python virtual environment if you do not already have one:

```powershell
python -m venv .venv-embedding
.\.venv-embedding\Scripts\Activate.ps1
```

Install backend dependencies:

```powershell
python -m pip install -r .\backend\requirements.txt
```

### 5. Start the Backend

From the repository root:

```powershell
python -m uvicorn backend.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

- Health check: `http://127.0.0.1:8000/health`
- Supabase health check: `http://127.0.0.1:8000/health/supabase`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

### 6. Start the Frontend

Open another terminal at the repository root:

```powershell
npm --prefix .\frontend run dev
```

The frontend runs at `http://localhost:3000`.

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Root endpoint |
| GET | `/health` | Backend health check |
| GET | `/health/supabase` | Supabase connectivity check |
| GET | `/auth/me` | Get the current authenticated user |
| GET | `/documents` | List documents |
| POST | `/documents` | Upload a PDF document |
| GET | `/documents/{id}` | Get document details |
| POST | `/documents/{id}/process` | Process an uploaded document |
| DELETE | `/documents/{id}` | Delete a document |
| POST | `/search` | Search document content |
| POST | `/search/ask` | Ask a question about documents |

See `/docs` while the backend is running for request schemas and additional API details.

## Running Tests

Run backend tests:

```powershell
python -m pytest .\backend\tests -v
```

Run the frontend lint check:

```powershell
npm --prefix .\frontend run lint
```

Create a production build:

```powershell
npm --prefix .\frontend run build
```

## Project Status

DocuMind ID includes an implemented frontend and backend workflow for authenticated PDF uploads, document management, hybrid retrieval, and AI-assisted question answering with source references.

Further work includes end-to-end validation, security review, error handling, and deployment readiness.