"""End-to-end smoke test against a running backend (default http://127.0.0.1:8000).

Usage:  .venv/Scripts/python.exe scripts/smoke_test.py
Creates synthetic records and walks a complaint through the full lifecycle.
"""

import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
client = httpx.Client(base_url=BASE, timeout=20.0)
failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}" + (f" — {detail}" if detail and not condition else ""))
    if not condition:
        failures.append(label)


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


print(f"Testing {BASE}\n")

health = client.get("/api/health")
check("health endpoint", health.status_code == 200, health.text)

meta = client.get("/api/public/meta").json()
hospital_id = meta["hospital"]["id"]
categories = {c["slug"]: c for c in meta["categories"]}
check("public meta exposes 7 categories", len(categories) == 7, str(list(categories)))

anon = client.get("/api/complaints")
check("protected complaint list rejects anonymous", anon.status_code == 401, anon.text)

# --- citizen registration (Kannada, medicine shortage exactly like the demo scenario)
created = client.post(
    "/api/complaints",
    json={
        "hospital_id": hospital_id,
        "category_id": categories["medicine-availability"]["id"],
        "description": "ನನ್ನ ತಾಯಿಗೆ ಬರೆದ ಔಷಧಿ ಆಸ್ಪತ್ರೆ ಔಷಧಾಲಯದಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ ಎಂದು ಹೇಳಿದರು.",
        "language_code": "kn",
        "complainant_name": "Smoke Test Citizen",
        "contact_number": "9845098450",
        "consent_to_contact": True,
        "emergency_acknowledged": True,
    },
)
check("citizen complaint created", created.status_code == 201, created.text)
registration = created.json()
reference = registration["reference_id"]
check("reference id format", reference.startswith("JNS-CGGH-"), reference)

tracked = client.get(f"/api/public/complaints/{reference}")
check("public tracking works", tracked.status_code == 200, tracked.text)
public_payload = tracked.text
check(
    "public tracking hides private details",
    "Smoke Test Citizen" not in public_payload and "9845098450" not in public_payload,
    public_payload[:200],
)
check("public tracking exposes timeline", len(tracked.json()["timeline"]) >= 1)

invalid = client.post(
    "/api/complaints",
    json={
        "hospital_id": hospital_id,
        "category_id": categories["other"]["id"],
        "description": "short",
        "language_code": "en",
    },
)
check("validation rejects a too-short description", invalid.status_code == 422, invalid.text)

# --- staff login
admin_login = client.post("/api/auth/login", json={"email": "admin@janaseva.gov.in", "password": "Janaseva@123"})
check("admin login", admin_login.status_code == 200, admin_login.text)
admin_token = admin_login.json()["access_token"]
admin = admin_login.json()["user"]
check("admin role returned", admin["role"] == "admin")

bad_login = client.post("/api/auth/login", json={"email": "admin@janaseva.gov.in", "password": "wrong-password"})
check("wrong password rejected", bad_login.status_code == 401, bad_login.text)

me = client.get("/api/auth/me", headers=auth(admin_token))
check("auth/me", me.status_code == 200 and me.json()["email"] == "admin@janaseva.gov.in")

dashboard = client.get("/api/dashboard", headers=auth(admin_token))
check("dashboard available", dashboard.status_code == 200, dashboard.text)
summary = dashboard.json()["summary"]
check("dashboard counts the new complaint", summary["total"] >= 19, str(summary))
check("dashboard has category trend data", len(dashboard.json()["trends"]["by_category"]) > 0)

listing = client.get("/api/complaints", headers=auth(admin_token), params={"search": reference})
check("search by reference", listing.status_code == 200 and listing.json()["total"] == 1, listing.text)

detail = client.get(f"/api/complaints/{reference}", headers=auth(admin_token))
check("complaint detail", detail.status_code == 200, detail.text)

# --- assignment
officers = client.get("/api/complaints/filter-options", headers=auth(admin_token)).json()["officers"]
pharmacy_officer = next(o for o in officers if o["email"] == "pharmacy.officer@janaseva.gov.in")
assigned = client.patch(
    f"/api/complaints/{reference}/assign",
    headers=auth(admin_token),
    json={"officer_id": pharmacy_officer["id"], "note": "Routing to pharmacy for stock verification."},
)
check("assign complaint", assigned.status_code == 200, assigned.text)
check("assignment moved status", assigned.json()["status"] == "assigned", assigned.json().get("status"))
check("department routed", assigned.json()["department"] is not None)

# --- officer workflow
officer_login = client.post(
    "/api/auth/login", json={"email": "pharmacy.officer@janaseva.gov.in", "password": "Janaseva@123"}
)
check("officer login", officer_login.status_code == 200, officer_login.text)
officer_token = officer_login.json()["access_token"]

officer_list = client.get("/api/complaints", headers=auth(officer_token))
visible_refs = [item["reference_id"] for item in officer_list.json()["items"]]
check("officer sees own department queue", reference in visible_refs, str(visible_refs[:5]))

officer_assign = client.patch(
    f"/api/complaints/{reference}/assign", headers=auth(officer_token), json={"officer_id": None}
)
check("officer cannot assign", officer_assign.status_code == 403, officer_assign.text)

invalid_transition = client.patch(
    f"/api/complaints/{reference}/status",
    headers=auth(officer_token),
    json={"status": "closed", "note": "attempted direct close"},
)
check("officer cannot close directly", invalid_transition.status_code in {403, 409}, invalid_transition.text)

progress = client.patch(
    f"/api/complaints/{reference}/status",
    headers=auth(officer_token),
    json={"status": "in_progress", "note": "Stock register checked; indent raised with the store."},
)
check("officer moves to in progress", progress.status_code == 200, progress.text)

note = client.post(
    f"/api/complaints/{reference}/notes",
    headers=auth(officer_token),
    json={"note": "Internal: supplier delivery expected tomorrow morning.", "is_public": False},
)
check("officer action note stored", note.status_code == 200, note.text)

resolved = client.patch(
    f"/api/complaints/{reference}/status",
    headers=auth(officer_token),
    json={
        "status": "resolved",
        "resolution_summary": "Medicine received and issued to the patient at the pharmacy counter.",
    },
)
check("officer submits resolution", resolved.status_code == 200, resolved.text)
check("resolution timestamp set", resolved.json()["resolved_at"] is not None)

# --- admin closure
closed = client.patch(
    f"/api/complaints/{reference}/status",
    headers=auth(admin_token),
    json={"status": "closed", "note": "Citizen confirmed medicines were received. Closing."},
)
check("admin closes complaint", closed.status_code == 200, closed.text)
history = closed.json()["history"]
check("full history retained", len(history) >= 5, f"{len(history)} entries")
check(
    "private note hidden from public timeline",
    all("supplier delivery" not in (entry["action_note"] or "") for entry in client.get(
        f"/api/public/complaints/{reference}"
    ).json()["timeline"]),
)

# --- follow-ups & notifications
followups = client.get("/api/follow-ups", headers=auth(admin_token))
check("follow-up queue", followups.status_code == 200, followups.text)
check("follow-up has pending or overdue buckets", "pending" in followups.json() and "overdue" in followups.json())

pending_ref = (followups.json()["overdue"] or followups.json()["pending"])[0]["reference_id"]
reminder = client.post(
    f"/api/follow-ups/{pending_ref}/remind", headers=auth(admin_token), json={"reason": "Smoke test reminder"}
)
check("reminder recorded", reminder.status_code == 200, reminder.text)
escalation = client.post(
    f"/api/follow-ups/{pending_ref}/escalate", headers=auth(admin_token), json={"reason": "Smoke test escalation"}
)
check("escalation recorded", escalation.status_code == 201, escalation.text)

notif_test = client.post("/api/notifications/test", headers=auth(admin_token), json={"channel": "sms", "recipient": "9000000001"})
check("notification test reports demo mode honestly", notif_test.json().get("status") == "simulated", notif_test.text)

# --- voice journey
voice_session = client.post("/api/voice/sessions", json={"language_code": "kn", "caller_number": "9000000019", "consent_to_contact": True})
check("voice session starts", voice_session.status_code == 201, voice_session.text)
session_id = voice_session.json()["id"]
check("voice session labelled demo", voice_session.json()["demo_mode"] is True)

transcript = client.post(
    f"/api/voice/sessions/{session_id}/transcript",
    json={"transcript": "ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಔಷಧಿ ಸಿಗುತ್ತಿಲ್ಲ ಎಂದು ಫಾರ್ಮಸಿಯಲ್ಲಿ ಹೇಳಿದರು.", "confidence": 0.91},
)
check("voice transcript accepted", transcript.status_code == 200, transcript.text)
check("category suggested", transcript.json()["suggested_category"] is not None, transcript.text)

voice_submit = client.post(
    f"/api/voice/sessions/{session_id}/submit",
    json={"hospital_id": hospital_id, "description": transcript.json()["transcript"], "consent_to_contact": True},
)
check("voice complaint submitted", voice_submit.status_code == 200, voice_submit.text)
check("voice complaint has reference", voice_submit.json()["complaint_reference"] is not None, voice_submit.text)
voice_ref = voice_submit.json()["complaint_reference"]
check(
    "voice complaint tracked publicly with channel",
    client.get(f"/api/public/complaints/{voice_ref}").json()["submission_channel"] == "voice",
)

webhook = client.post(
    "/api/voice/webhook",
    json={"event": "call.failed", "call_id": "SMOKE-CALL-1", "language": "kn", "reason": "provider_error"},
)
check("webhook handles provider failure", webhook.status_code == 200 and webhook.json()["session_status"] == "failed", webhook.text)

# --- operator scope
op_login = client.post("/api/auth/login", json={"email": "helpdesk@janaseva.gov.in", "password": "Janaseva@123"})
operator_token = op_login.json()["access_token"]
op_complaints = client.get("/api/complaints", headers=auth(operator_token)).json()["items"]
check(
    "operator only sees own registrations",
    all(item["submission_channel"] == "assisted" for item in op_complaints),
    str([(i["reference_id"], i["submission_channel"]) for i in op_complaints[:4]]),
)
op_status = client.patch(
    f"/api/complaints/{voice_ref}/status", headers=auth(operator_token), json={"status": "acknowledged", "note": "try"}
)
check("operator cannot change status", op_status.status_code == 403, op_status.text)

# --- persistence after reload
again = client.get(f"/api/complaints/{reference}", headers=auth(admin_token))
check("data persists across requests", again.status_code == 200 and again.json()["status"] == "closed")

print("\n%d checks failed" % len(failures))
if failures:
    for item in failures:
        print(" -", item)
    sys.exit(1)
print("All smoke checks passed.")
