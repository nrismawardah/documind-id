
import json

from backend.app.services import gemini_service


def test_generate_answer_with_sources_accepts_valid_indices(monkeypatch):
    monkeypatch.setattr(
        gemini_service,
        "_generate_content",
        lambda prompt: json.dumps(
            {
                "answer": "Fitur yang disebutkan adalah age dan sex.",
                "source_indices": [0, 1],
            },
        ),
    )

    result = gemini_service.generate_answer_with_sources(
        question="Apa saja fiturnya?",
        context="[SOURCE 0] age\n[SOURCE 1] sex\n[SOURCE 2] daftar pustaka",
        candidate_count=3,
    )

    assert result["answer"] == "Fitur yang disebutkan adalah age dan sex."
    assert result["source_indices"] == [0, 1]


def test_generate_answer_with_sources_removes_invalid_indices(monkeypatch):
    monkeypatch.setattr(
        gemini_service,
        "_generate_content",
        lambda prompt: json.dumps(
            {
                "answer": "Informasi ditemukan.",
                "source_indices": [1, 99, -1, "0", True, 1],
            },
        ),
    )

    result = gemini_service.generate_answer_with_sources(
        question="Apa jawabannya?",
        context="[SOURCE 0] A\n[SOURCE 1] B",
        candidate_count=2,
    )

    assert result["source_indices"] == [1]


def test_generate_answer_with_sources_rejects_answer_without_sources(monkeypatch):
    monkeypatch.setattr(
        gemini_service,
        "_generate_content",
        lambda prompt: json.dumps(
            {
                "answer": "Jawaban yang tidak didukung.",
                "source_indices": [],
            },
        ),
    )

    result = gemini_service.generate_answer_with_sources(
        question="Apa jawabannya?",
        context="[SOURCE 0] Teks dokumen",
        candidate_count=1,
    )

    assert result["answer"] == gemini_service.NOT_FOUND_MARKER
    assert result["source_indices"] == []


def test_generate_answer_with_sources_handles_invalid_json(monkeypatch):
    monkeypatch.setattr(
        gemini_service,
        "_generate_content",
        lambda prompt: "ini bukan JSON",
    )

    result = gemini_service.generate_answer_with_sources(
        question="Apa jawabannya?",
        context="[SOURCE 0] Teks dokumen",
        candidate_count=1,
    )

    assert result["answer"] == gemini_service.NOT_FOUND_MARKER
    assert result["source_indices"] == []


def test_generate_answer_with_sources_handles_not_found_marker(monkeypatch):
    monkeypatch.setattr(
        gemini_service,
        "_generate_content",
        lambda prompt: json.dumps(
            {
                "answer": gemini_service.NOT_FOUND_MARKER,
                "source_indices": [0],
            },
        ),
    )

    result = gemini_service.generate_answer_with_sources(
        question="Siapa presiden pertama menurut dokumen?",
        context="[SOURCE 0] Teks yang tidak relevan",
        candidate_count=1,
    )

    assert result["answer"] == gemini_service.NOT_FOUND_MARKER
    assert result["source_indices"] == []
