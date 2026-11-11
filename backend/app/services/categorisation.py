"""Deterministic, explainable complaint categorisation.

A transparent keyword/rule scorer is used for the prototype (FR-13 is a "could").
An NLP/LLM provider can be plugged in later behind the same return contract:
-> (suggested_category, confidence 0..1)
No external credentials are required for this stage.
"""

import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category

REVIEW_THRESHOLD = 0.34

# Weighted hints for each category slug. Kannada hints are written in Kannada script.
KEYWORD_HINTS: dict[str, dict[str, float]] = {
    "staff-availability": {
        "doctor": 0.9, "nurse": 0.8, "staff": 0.6, "duty": 0.6, "absent": 0.8, "no one": 0.6,
        "attendant": 0.5, "consult": 0.5, "ವೈದ್ಯ": 1.0, "ಡಾಕ್ಟರ್": 1.0, "ನರ್ಸ": 0.9, "ಸಿಬ್ಬಂದಿ": 0.7,
        "ಸ್ಟಾಫ್": 0.7, "ಬಂದಿಲ್ಲ": 0.7, "ಇಲ್ಲ": 0.4, "ಕರ್ತವ್ಯ": 0.6,
    },
    "medicine-availability": {
        "medicine": 1.0, "medicines": 1.0, "tablet": 0.8, "drug": 0.7, "pharmacy": 0.9, "stock": 0.6,
        "prescribed": 0.8, "dose": 0.5, "ಔಷಧ": 1.0, "ಮಾತ್ರೆ": 0.9, "ಮಾತ್ರೆಗಳು": 0.9, "ಫಾರ್ಮಸಿ": 0.9,
        "ಔಷಧಿ": 1.0, "ಲಭ್ಯವಿಲ್ಲ": 0.7,
    },
    "cleanliness-hygiene": {
        "clean": 0.9, "dirty": 1.0, "hygiene": 1.0, "toilet": 0.8, "garbage": 0.9, "waste": 0.7,
        "sanitise": 0.6, "sweeping": 0.7, "ಸ್ವಚ್ಛ": 1.0, "ಸ್ವಚ್ಛತೆ": 1.0, "ಕೊಳಕು": 1.0, "ಗಲೀಜು": 1.0,
        "ಕಸ": 0.9, "ಶೌಚಾಲಯ": 0.8,
    },
    "water-sanitation": {
        "water": 1.0, "drinking": 0.9, "tap": 0.6, "washroom": 0.6, "drainage": 0.8, "sink": 0.6,
        "ನೀರು": 1.0, "ಕುಡಿಯುವ": 0.9, "ನಲ್ಲಿ": 0.7, "ಚರಂಡಿ": 0.8,
    },
    "beds-facilities": {
        "bed": 1.0, "beds": 1.0, "ward": 0.7, "stretcher": 0.8, "wheelchair": 0.6, "waiting": 0.5,
        "ಬೆಡ್": 1.0, "ಹಾಸಿಗೆ": 1.0, "ವಾರ್ಡ್": 0.7, "ಸ್ಟ್ರೆಚರ್": 0.8, "ಗಾಲಿ": 0.5,
    },
    "infrastructure-maintenance": {
        "lift": 0.9, "elevator": 0.9, "electricity": 0.9, "light": 0.7, "fan": 0.7, "leak": 0.8,
        "broken": 0.9, "repair": 0.8, "building": 0.6, "roof": 0.6, "ac": 0.6,
        "ಲಿಫ್ಟ್": 0.9, "ವಿದ್ಯುತ್": 0.9, "ಬೆಳಕು": 0.7, "ಫ್ಯಾನ್": 0.7, "ಕಟ್ಟಡ": 0.6, "ರಿಪೇರಿ": 0.8,
        "ಮುರಿದ": 0.9,
    },
    "other": {"other": 0.4, "ಇತರೆ": 0.4},
}


@dataclass
class Suggestion:
    category: Category | None
    confidence: float
    matched_terms: list[str]
    needs_review: bool


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def suggest_category(db: Session, description: str) -> Suggestion:
    text = _normalise(description)
    categories = list(db.scalars(select(Category).where(Category.is_active.is_(True))))
    by_slug = {category.slug: category for category in categories}

    scores: dict[str, float] = {}
    matched: dict[str, list[str]] = {}
    for slug, hints in KEYWORD_HINTS.items():
        if slug not in by_slug:
            continue
        score = 0.0
        terms: list[str] = []
        for keyword, weight in hints.items():
            if keyword in text:
                score += weight
                terms.append(keyword)
        # Category-specific keywords stored in the database are also honoured.
        db_keywords = by_slug[slug].keywords or ""
        for keyword in [k.strip().lower() for k in db_keywords.split(",") if k.strip()]:
            if keyword in text:
                score += 0.95
                terms.append(keyword)
        if score:
            scores[slug] = score
            matched[slug] = terms

    if not scores:
        return Suggestion(category=None, confidence=0.0, matched_terms=[], needs_review=True)

    best_slug = max(scores, key=scores.get)
    best_score = scores[best_slug]
    if best_slug == "other" and len(scores) > 1:
        alternative = max((s for k, s in scores.items() if k != "other"), default=0)
        if alternative > 0:
            best_slug = max((k for k in scores if k != "other"), key=scores.get)
            best_score = scores[best_slug]

    confidence = round(min(0.97, best_score / (best_score + 1.15)), 2)
    return Suggestion(
        category=by_slug[best_slug],
        confidence=confidence,
        matched_terms=matched.get(best_slug, []),
        needs_review=confidence < REVIEW_THRESHOLD,
    )
