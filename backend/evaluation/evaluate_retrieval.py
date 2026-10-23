
import csv
import getpass
import json
import sys
from collections import defaultdict
from pathlib import Path

import httpx


EVALUATION_DIR = Path(__file__).resolve().parent
QUESTIONS_FILE = EVALUATION_DIR / "baseline_questions.json"
OUTPUT_CSV = EVALUATION_DIR / "retrieval_results.csv"
OUTPUT_SUMMARY = EVALUATION_DIR / "retrieval_summary.json"

API_URL = "http://127.0.0.1:8000"
DOCUMENT_ID = "1689dce4-0b8d-4afd-83cf-78d20c17d8da"
MATCH_COUNT = 20
MATCH_THRESHOLD = 0.0
TOP_K_VALUES = (1, 3, 5)


def load_questions():
    with QUESTIONS_FILE.open("r", encoding="utf-8-sig") as file:
        questions = json.load(file)

    if not isinstance(questions, list) or not questions:
        raise ValueError("Dataset pertanyaan kosong atau tidak valid.")

    required_fields = {
        "id", "category", "question", "gold_pages", "answerable"
    }

    for question in questions:
        missing = required_fields - question.keys()
        if missing:
            raise ValueError(
                f"Pertanyaan {question.get('id', '?')} kehilangan field: "
                f"{', '.join(sorted(missing))}"
            )

    return questions


def first_relevant_rank(results, gold_pages):
    gold_pages = {int(page) for page in gold_pages}

    for rank, result in enumerate(results, start=1):
        page = result.get("page_number")
        if page is not None and int(page) in gold_pages:
            return rank

    return None


def summarize(subset):
    count = len(subset)

    if count == 0:
        return {
            "questions": 0,
            "hit_at_1": None,
            "hit_at_3": None,
            "hit_at_5": None,
            "mrr": None,
        }

    metrics = {"questions": count}

    for k in TOP_K_VALUES:
        hits = sum(
            row["first_relevant_rank"] is not None
            and row["first_relevant_rank"] <= k
            for row in subset
        )
        metrics[f"hit_at_{k}"] = round(hits / count, 4)

    reciprocal_ranks = [
        1 / row["first_relevant_rank"]
        if row["first_relevant_rank"] is not None
        else 0.0
        for row in subset
    ]
    metrics["mrr"] = round(sum(reciprocal_ranks) / count, 4)

    return metrics


def calculate_metrics(rows):
    answerable = [row for row in rows if row["answerable"]]
    unanswerable = [row for row in rows if not row["answerable"]]

    by_category = defaultdict(list)
    for row in rows:
        by_category[row["category"]].append(row)

    return {
        "total_questions": len(rows),
        "all_questions": summarize(rows),
        "answerable_questions": summarize(answerable),
        "unanswerable_questions": summarize(unanswerable),
        "by_category": {
            category: summarize(items)
            for category, items in sorted(by_category.items())
        },
        "interpretation_note": (
            "Metrik mengukur kecocokan halaman retrieval, bukan kebenaran "
            "jawaban LLM. Untuk pertanyaan unanswerable, kecocokan halaman "
            "tidak membuktikan bahwa jawaban tersedia di dokumen."
        ),
    }


def main():
    with QUESTIONS_FILE.open("r", encoding="utf-8") as file:
        questions = load_questions()

    token = getpass.getpass(
        "Masukkan access token Supabase (input tersembunyi): "
    ).strip()

    if not token:
        print("Token kosong. Evaluasi dibatalkan.", file=sys.stderr)
        return 1

    rows = []

    try:
        with httpx.Client(
            base_url=API_URL,
            headers={"Authorization": f"Bearer {token}"},
            timeout=60.0,
        ) as client:
            for index, question in enumerate(questions, start=1):
                payload = {
                    "query": question["question"],
                    "match_count": MATCH_COUNT,
                    "match_threshold": MATCH_THRESHOLD,
                    "document_id": DOCUMENT_ID,
                }

                response = client.post("/search", json=payload)

                if response.status_code != 200:
                    print(
                        f"Gagal pada {question['id']}: HTTP "
                        f"{response.status_code}. Evaluasi dihentikan."
                    )
                    print(
                        "Periksa status API atau autentikasi. "
                        "Respons server tidak ditampilkan."
                    )
                    return 1

                results = response.json().get("results", [])
                rank = first_relevant_rank(results, question["gold_pages"])

                rows.append({
                    "id": question["id"],
                    "category": question["category"],
                    "question": question["question"],
                    "answerable": bool(question["answerable"]),
                    "gold_pages": ",".join(
                        str(page) for page in question["gold_pages"]
                    ),
                    "result_count": len(results),
                    "retrieved_pages": ",".join(
                        str(result.get("page_number", ""))
                        for result in results
                    ),
                    "first_relevant_rank": rank,
                    "hit_at_1": int(rank is not None and rank <= 1),
                    "hit_at_3": int(rank is not None and rank <= 3),
                    "hit_at_5": int(rank is not None and rank <= 5),
                    "top_similarity": (
                        results[0].get("similarity") if results else None
                    ),
                })

                status = (
                    "hit@5"
                    if rank is not None and rank <= 5
                    else "miss@5"
                )
                print(f"[{index}/{len(questions)}] {question['id']}: {status}")

    except httpx.RequestError:
        print(
            f"Tidak dapat terhubung ke API {API_URL}. "
            "Pastikan backend berjalan."
        )
        return 1
    finally:
        token = None

    with OUTPUT_CSV.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    summary = calculate_metrics(rows)
    summary["document_id"] = DOCUMENT_ID
    summary["match_count"] = MATCH_COUNT
    summary["match_threshold"] = MATCH_THRESHOLD

    with OUTPUT_SUMMARY.open("w", encoding="utf-8") as file:
        json.dump(summary, file, ensure_ascii=False, indent=2)

    print("\n=== HASIL EVALUASI RETRIEVAL ===")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"\nDetail hasil: {OUTPUT_CSV}")
    print(f"Ringkasan: {OUTPUT_SUMMARY}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
