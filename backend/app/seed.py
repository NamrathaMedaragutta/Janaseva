"""Idempotent demo seed. All records are clearly synthetic.

Run with:  python -m app.seed
"""

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.database.session import Base, SessionLocal, engine
from app.models import (
    Category,
    Complaint,
    ComplaintHistory,
    ComplaintStatus,
    Department,
    Escalation,
    Hospital,
    Role,
    SubmissionChannel,
    User,
)
from app.services.common import now_utc
from app.services.complaints import create_complaint

DEPARTMENTS = [
    ("General Medicine", "GENMED", "Doctors, nursing and clinical staff availability"),
    ("Pharmacy", "PHARM", "Medicine stock, dispensing and drug availability"),
    ("Housekeeping & Sanitation", "HOUSE", "Cleanliness, hygiene, water and sanitation"),
    ("Facilities & Maintenance", "FACIL", "Beds, wards, lifts, electricity and building upkeep"),
    ("Patient Relations", "PATREL", "General service concerns and citizen assistance"),
]

CATEGORIES = [
    (
        "staff-availability",
        "Staff availability",
        "ಸಿಬ್ಬಂದಿ ಲಭ್ಯತೆ",
        "Doctor or nursing staff not available during duty hours",
        "GENMED",
        "doctor,nurse,staff,duty,absent,ವೈದ್ಯ,ನರ್ಸ,ಸಿಬ್ಬಂದಿ",
    ),
    (
        "medicine-availability",
        "Medicine availability",
        "ಔಷಧ ಲಭ್ಯತೆ",
        "Prescribed medicine not available at the hospital pharmacy",
        "PHARM",
        "medicine,tablet,pharmacy,stock,ಔಷಧ,ಮಾತ್ರೆ",
    ),
    (
        "cleanliness-hygiene",
        "Cleanliness and hygiene",
        "ಸ್ವಚ್ಛತೆ ಮತ್ತು ನೈರ್ಮಲ್ಯ",
        "Ward, corridor or toilet cleanliness",
        "HOUSE",
        "dirty,clean,toilet,garbage,hygiene,ಸ್ವಚ್ಛತೆ,ಕೊಳಕು,ಕಸ",
    ),
    (
        "water-sanitation",
        "Drinking water and sanitation",
        "ಕುಡಿಯುವ ನೀರು ಮತ್ತು ನೈರ್ಮಲ್ಯ",
        "Drinking water supply, taps and sanitation",
        "HOUSE",
        "water,drinking,tap,drainage,ನೀರು,ನಲ್ಲಿ,ಚರಂಡಿ",
    ),
    (
        "beds-facilities",
        "Beds and basic facilities",
        "ಹಾಸಿಗೆ ಮತ್ತು ಮೂಲ ಸೌಕರ್ಯ",
        "Bed availability, stretchers, wheelchairs and waiting areas",
        "FACIL",
        "bed,ward,stretcher,wheelchair,ಬೆಡ್,ಹಾಸಿಗೆ,ವಾರ್ಡ್",
    ),
    (
        "infrastructure-maintenance",
        "Infrastructure maintenance",
        "ಮೂಲಸೌಕರ್ಯ ನಿರ್ವಹಣೆ",
        "Lifts, electricity, fans, leaks and building repairs",
        "FACIL",
        "lift,electricity,light,fan,broken,repair,ಲಿಫ್ಟ್,ವಿದ್ಯುತ್,ಫ್ಯಾನ್",
    ),
    (
        "other",
        "Other service-related issue",
        "ಇತರೆ ಸೇವಾ ಸಮಸ್ಯೆ",
        "Any other non-emergency hospital service concern",
        "PATREL",
        "other,ಇತರೆ",
    ),
]

STAFF = [
    ("Dr. Ananya Rao", "admin@janaseva.gov.in", Role.ADMIN, None, "+91 80 2222 1000"),
    ("Shivakumar B. Gowda", "pharmacy.officer@janaseva.gov.in", Role.OFFICER, "PHARM", "+91 80 2222 1011"),
    ("Lakshmi Devi N.", "housekeeping.officer@janaseva.gov.in", Role.OFFICER, "HOUSE", "+91 80 2222 1012"),
    ("Ramesh Acharya", "facilities.officer@janaseva.gov.in", Role.OFFICER, "FACIL", "+91 80 2222 1013"),
    ("Sunil Kumar M.", "nursing.officer@janaseva.gov.in", Role.OFFICER, "GENMED", "+91 80 2222 1014"),
    ("Priya Shetty", "helpdesk@janaseva.gov.in", Role.OPERATOR, None, "+91 80 2222 1020"),
]

# (description, language, channel, category slug, days_ago, status, officer email, name, phone, consent, resolution)
DEMO_COMPLAINTS = [
    (
        "The prescribed BP tablets were not available at the pharmacy counter. I was asked to buy them outside.",
        "en", SubmissionChannel.WEB, "medicine-availability", 1, ComplaintStatus.SUBMITTED, None,
        "Synthetic citizen A", "9000000001", True, None,
    ),
    (
        "ನನ್ನ ತಾಯಿಗೆ ಬರೆದ ಔಷಧಿ ಆಸ್ಪತ್ರೆ ಔಷಧಾಲಯದಲ್ಲಿ ಇರಲಿಲ್ಲ. ಹೊರಗೆ ಖರೀದಿಸಲು ಹೇಳಿದರು.",
        "kn", SubmissionChannel.VOICE, "medicine-availability", 1, ComplaintStatus.ASSIGNED,
        "pharmacy.officer@janaseva.gov.in", "Synthetic citizen B", "9000000002", True, None,
    ),
    (
        "The second floor ward toilet has not been cleaned for two days and there is no water in the tap.",
        "en", SubmissionChannel.ASSISTED, "cleanliness-hygiene", 3, ComplaintStatus.IN_PROGRESS,
        "housekeeping.officer@janaseva.gov.in", "Synthetic citizen C", "9000000003", True, None,
    ),
    (
        "ಎರಡನೇ ಮಹಡಿಯ ಶೌಚಾಲಯವು ತುಂಬಾ ಕೊಳಕು ಇದೆ. ನೀರಿನ ನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ.",
        "kn", SubmissionChannel.VOICE, "cleanliness-hygiene", 4, ComplaintStatus.IN_PROGRESS,
        "housekeeping.officer@janaseva.gov.in", "Synthetic citizen D", "9000000004", True, None,
    ),
    (
        "No doctor was available in the outpatient department between 11 am and 1 pm. Patients were waiting.",
        "en", SubmissionChannel.ASSISTED, "staff-availability", 2, ComplaintStatus.ASSIGNED,
        "nursing.officer@janaseva.gov.in", "Synthetic citizen E", "9000000005", False, None,
    ),
    (
        "The lift near the emergency block has been out of order since last week. Elderly patients are struggling.",
        "en", SubmissionChannel.WEB, "infrastructure-maintenance", 6, ComplaintStatus.IN_PROGRESS,
        "facilities.officer@janaseva.gov.in", "Synthetic citizen F", "9000000006", True, None,
    ),
    (
        "ಡಾ. ಅವರು ಒಳರೋಗಿ ವಾರ್ಡ್‌ಗೆ ಬಂದು ಪರಿಶೀಲಿಸಲಿಲ್ಲ. ನರ್ಸ್‌ಗಳು ಮಾಹಿತಿ ನೀಡಲಿಲ್ಲ.",
        "kn", SubmissionChannel.VOICE, "staff-availability", 7, ComplaintStatus.NEEDS_REVIEW,
        None, None, "9000000007", True, None,
    ),
    (
        "Only two stretchers were available near the casualty entrance and one of them was broken.",
        "en", SubmissionChannel.WEB, "beds-facilities", 8, ComplaintStatus.RESOLVED,
        "facilities.officer@janaseva.gov.in", "Synthetic citizen G", "9000000008", True,
        "Two additional stretchers were moved to the casualty entrance and the damaged one was replaced.",
    ),
    (
        "Drinking water cooler in the waiting hall has not been working for four days.",
        "en", SubmissionChannel.ASSISTED, "water-sanitation", 10, ComplaintStatus.CLOSED,
        "housekeeping.officer@janaseva.gov.in", "Synthetic citizen H", "9000000009", True,
        "Cooler repaired and sanitised; water quality checked by the housekeeping supervisor.",
    ),
    (
        "ಕುಡಿಯುವ ನೀರಿನ ಸೌಲಭ್ಯ ಇಲ್ಲ. ಕುಳಿತುಕೊಳ್ಳುವ ಸ್ಥಳದಲ್ಲಿ ನೀರು ಸಿಗುತ್ತಿಲ್ಲ.",
        "kn", SubmissionChannel.VOICE, "water-sanitation", 9, ComplaintStatus.RESOLVED,
        "housekeeping.officer@janaseva.gov.in", None, "9000000010", False,
        "Water dispenser installed in the waiting hall and refilled twice daily.",
    ),
    (
        "The pharmacy did not have the prescribed insulin and asked us to come the next day.",
        "en", SubmissionChannel.WEB, "medicine-availability", 12, ComplaintStatus.CLOSED,
        "pharmacy.officer@janaseva.gov.in", "Synthetic citizen I", "9000000011", True,
        "Insulin stock received and issued to the patient. Indent process reviewed.",
    ),
    (
        "Fan in ward 12 is not working and the room is very hot in the afternoon.",
        "en", SubmissionChannel.ASSISTED, "infrastructure-maintenance", 3, ComplaintStatus.ASSIGNED,
        "facilities.officer@janaseva.gov.in", "Synthetic citizen J", None, False, None,
    ),
    (
        "ವಾರ್ಡ್ 8 ರಲ್ಲಿ ಸ್ವಚ್ಛತೆ ಸರಿಯಾಗಿಲ್ಲ. ಕಸ ತುಂಬಿದೆ.",
        "kn", SubmissionChannel.VOICE, "cleanliness-hygiene", 5, ComplaintStatus.REOPENED,
        "housekeeping.officer@janaseva.gov.in", "Synthetic citizen K", "9000000013", True,
        "Ward cleaned on the same day, but the citizen reported the issue again the next morning.",
    ),
    (
        "Staff at the help desk were not available in the evening to guide us to the correct counter.",
        "en", SubmissionChannel.WEB, "staff-availability", 2, ComplaintStatus.SUBMITTED,
        None, "Synthetic citizen L", "9000000014", True, None,
    ),
    (
        "No wheelchairs were available near the outpatient gate for my father who cannot walk.",
        "en", SubmissionChannel.ASSISTED, "beds-facilities", 11, ComplaintStatus.RESOLVED,
        "facilities.officer@janaseva.gov.in", "Synthetic citizen M", "9000000015", True,
        "Three wheelchairs placed at the outpatient gate with an attendance register.",
    ),
    (
        "ಸ್ಟ್ರೆಚರ್ ಸಿಗಲಿಲ್ಲ. ರೋಗಿಯನ್ನು ಕೈಯಲ್ಲಿ ಎತ್ತಿಕೊಂಡು ಸಾಗಿಸಬೇಕಾಯಿತು.",
        "kn", SubmissionChannel.VOICE, "beds-facilities", 14, ComplaintStatus.CLOSED,
        "facilities.officer@janaseva.gov.in", "Synthetic citizen N", None, False,
        "Two new stretchers procured and casualty staff instructed on availability.",
    ),
    (
        "There is a water leak near the pharmacy corridor and the floor is always wet.",
        "en", SubmissionChannel.WEB, "infrastructure-maintenance", 15, ComplaintStatus.CLOSED,
        "facilities.officer@janaseva.gov.in", "Synthetic citizen O", "9000000017", True,
        "Leaking pipe replaced and the corridor floor repaired.",
    ),
    (
        "Staff were polite but the medicine counter closed early without notice.",
        "en", SubmissionChannel.WEB, "other", 4, ComplaintStatus.NEEDS_REVIEW,
        None, "Synthetic citizen P", "9000000018", True, None,
    ),
]


def _ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)


def seed(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(Hospital)) > 0:
        print("Seed skipped: hospitals already exist.")
        return

    hospital = Hospital(
        name="Chinnaswamy Government General Hospital",
        code="CGGH",
        district="Bengaluru Urban",
        address="Sampangi Rama Nagar, Bengaluru 560027",
        phone="+91 80 2222 1000",
        followup_hours=48,
        escalation_hours=96,
    )
    db.add(hospital)
    db.flush()

    departments: dict[str, Department] = {}
    for name, code, description in DEPARTMENTS:
        department = Department(hospital_id=hospital.id, name=name, code=code, description=description)
        db.add(department)
        departments[code] = department
    db.flush()

    categories: dict[str, Category] = {}
    for index, (slug, name_en, name_kn, description, dept_code, keywords) in enumerate(CATEGORIES):
        category = Category(
            slug=slug,
            name_en=name_en,
            name_kn=name_kn,
            description=description,
            default_department_id=departments[dept_code].id,
            keywords=keywords,
            sort_order=index,
        )
        db.add(category)
        categories[slug] = category
    db.flush()

    users: dict[str, User] = {}
    for full_name, email, role, dept_code, phone in STAFF:
        user = User(
            full_name=full_name,
            email=email,
            phone=phone,
            hashed_password=hash_password(settings.demo_password),
            role=role,
            hospital_id=hospital.id,
            department_id=departments[dept_code].id if dept_code else None,
        )
        db.add(user)
        users[email] = user
    db.flush()

    operator = users["helpdesk@janaseva.gov.in"]
    db.commit()

    now = now_utc()
    for index, row in enumerate(DEMO_COMPLAINTS):
        (
            description, language, channel, slug, days_ago, status, officer_email,
            citizen_name, phone, consent, resolution,
        ) = row
        complaint = create_complaint(
            db,
            hospital_id=hospital.id,
            category_id=categories[slug].id,
            description=description,
            language_code=language,
            submission_channel=channel,
            complainant_name=citizen_name,
            contact_number=phone,
            consent_to_contact=consent,
            created_by=operator if channel == SubmissionChannel.ASSISTED else None,
        )
        created_at = now - timedelta(days=days_ago, hours=index % 7)
        complaint.created_at = created_at
        complaint.updated_at = created_at
        officer = users[officer_email] if officer_email else None
        complaint.assigned_officer_id = officer.id if officer else None
        if officer and officer.department_id:
            complaint.department_id = officer.department_id
        complaint.status = status
        complaint.acknowledged_at = created_at + timedelta(hours=2) if status != ComplaintStatus.SUBMITTED else None
        complaint.resolution_summary = resolution
        if status in {ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED}:
            complaint.resolved_at = created_at + timedelta(hours=20, minutes=30)
        if status == ComplaintStatus.CLOSED:
            complaint.closed_at = created_at + timedelta(hours=26)
        db.add(
            ComplaintHistory(
                complaint_id=complaint.id,
                old_status=ComplaintStatus.SUBMITTED,
                new_status=status,
                event_type="status_change",
                action_note=(
                    resolution
                    or {
                        ComplaintStatus.ASSIGNED: "Routed to the responsible department officer.",
                        ComplaintStatus.IN_PROGRESS: "Officer acknowledged the complaint and site inspection is under way.",
                        ComplaintStatus.NEEDS_REVIEW: "Awaiting administrative review before routing.",
                        ComplaintStatus.REOPENED: "Citizen reported that the issue persists; complaint reopened.",
                        ComplaintStatus.SUBMITTED: "Complaint received at the hospital grievance desk.",
                        ComplaintStatus.ACKNOWLEDGED: "Complaint acknowledged by the help desk.",
                    }.get(status, "Status updated.")
                ),
                updated_by_id=officer.id if officer else operator.id,
                updated_by_name=officer.full_name if officer else operator.full_name,
                is_public=status != ComplaintStatus.NEEDS_REVIEW,
                created_at=created_at + timedelta(hours=3),
            )
        )
        # Overdue active complaints are intentionally included for the demo queue.
        if days_ago >= 5 and status in {
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.REOPENED,
        }:
            complaint.updated_at = created_at + timedelta(hours=4)
        db.commit()

        if index == 3:
            db.add(
                Escalation(
                    complaint_id=complaint.id,
                    level=1,
                    trigger="overdue",
                    reason="Pending beyond the configured follow-up threshold (synthetic demo escalation).",
                    raised_by_id=users["admin@janaseva.gov.in"].id,
                    target_user_id=users["admin@janaseva.gov.in"].id,
                    created_at=created_at + timedelta(hours=50),
                )
            )
            db.commit()

    print(
        f"Seeded hospital '{hospital.name}' with {len(DEPARTMENTS)} departments, "
        f"{len(CATEGORIES)} categories, {len(STAFF)} staff accounts and {len(DEMO_COMPLAINTS)} synthetic complaints."
    )
    print(f"Demo staff password: {settings.demo_password}")


def main() -> None:
    _ensure_schema()
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    main()
