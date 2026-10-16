# DocuMind ID

DocuMind ID is a document question-answering application designed to help users find information from Indonesian PDF documents with evidence-based answers and verifiable citations.

## Project Goals

- Answer questions based on uploaded PDF documents.
- Provide source citations, including page references where available.
- Avoid unsupported answers when the available evidence is insufficient.
- Provide a simple and accessible user interface.

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Python
- FastAPI
- Pytest

### Planned Components

- Supabase Authentication and PostgreSQL
- PDF text extraction with pypdf
- Vector search using pgvector
- Embeddings and a language model for retrieval-augmented generation (RAG)

_Planned components are subject to implementation and validation._

## Project Structure

```text
documind-id/
|-- frontend/     # Next.js application
|-- backend/      # FastAPI application
|-- .gitignore
|-- README.md
```

## Getting Started

### Frontend

Open a terminal in the `frontend` directory and run:

```bash
npm install
npm run dev
```

The development server is available at `http://localhost:3000`.

### Backend

Open a terminal in the `backend` directory, activate the Python virtual environment, and run:

```bash
python -m uvicorn main:app --reload
```

The API is available at `http://127.0.0.1:8000`.

- Health check: `http://127.0.0.1:8000/health`
- API documentation: `http://127.0.0.1:8000/docs`

### Backend Tests

With the backend virtual environment activated, run:

```bash
python -m pytest -v
```

## Project Status

The initial frontend and backend setup is complete. Further development will follow the project roadmap.
