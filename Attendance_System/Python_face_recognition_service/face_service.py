# ================================
# Imports
# ================================
import cv2
import face_recognition
import numpy as np
import requests
from pymongo import MongoClient
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
import matplotlib.pyplot as plt



app = FastAPI()


client = MongoClient("mongodb://localhost:27017/")
db = client["attendanceSys"]
users = db["users"]


# Utility: Download Image

def download_image(url):
    try:
        response = requests.get(url, timeout=10)
        image_array = np.frombuffer(response.content, np.uint8)
        return cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"❌ Error downloading image: {e}")
        return None


def get_face_encoding(image):
    if image is None:
        return None

    rgb_img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    boxes = face_recognition.face_locations(rgb_img)

    if not boxes:
        print("⚠️ No face detected.")
        return None

    encodings = face_recognition.face_encodings(rgb_img, boxes)
    return encodings[0] if encodings else None

def compute_average_encoding(encodings):
    if not encodings:
        return None
    return np.mean(np.array(encodings), axis=0).tolist()

#
def update_user_encodings(email):
    user = users.find_one({"email": email})
    if not user:
        print("❌ User not found:", email)
        return

    photo_links = user.get("photo_links", [])
    photo_data = user.get("photo_data", [])

    processed_urls = {p["url"] for p in photo_data if "url" in p}
    new_photos = [url for url in photo_links if url not in processed_urls]

    if not new_photos:
        print("✅ No new photos for", email)
        return

    encodings = []

    print(f"🔄 Processing {len(new_photos)} photos for {email}")

    for url in new_photos:
        img = download_image(url)
        encoding = get_face_encoding(img)

        if encoding is None:
            continue

        encoding = list(encoding)
        photo_data.append({"url": url, "encoding": encoding})
        encodings.append(encoding)

    if not encodings:
        print("❌ No encodings extracted.")
        return

    avg_encoding = compute_average_encoding(encodings)

    users.update_one(
        {"email": email},
        {"$set": {
            "photo_data": photo_data,
            "average_encoding": avg_encoding
        }}
    )

    print(f"✅ Encodings updated for {email}")


def update_all_users_encodings():
    for user in users.find():
        email = user.get("email")
        if email:
            update_user_encodings(email)


def load_known_encodings():
    encodings, emails, names = [], [], []

    for user in users.find({"average_encoding": {"$ne": None}}):
        encodings.append(np.array(user["average_encoding"]))
        emails.append(user["email"])
        names.append(user["name"])

    return encodings, emails, names


from datetime import datetime
def update_attendance(email, session_date: datetime):
    user = users.find_one({"email": email})
    if not user:
        return

    if not user.get("attendance"):
        users.update_one(
            {"email": email},
            {
                "$push": {
                    "attendance": {
                        "present_dates": [session_date],
                        "absentdates": [],
                        "sessions_attended": [],
                        "days_present": 1
                    }
                }
            }
        )
    else:
        users.update_one(
            {"email": email},
            {
                "$inc": {"attendance.0.days_present": 1},
                "$push": {
                    "attendance.0.present_dates": session_date
                }
            }
        )


def mark_attendance_from_group_image(image_url, session_date: datetime, tolerance=0.5):

    image = download_image(image_url)
    if image is None:
        return {"error": "Image download failed"}

    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    face_locations = face_recognition.face_locations(rgb_image)
    face_encodings = face_recognition.face_encodings(rgb_image, face_locations)

    known_encodings, known_emails, known_names = load_known_encodings()
    matched_users = []

    for face_encoding in face_encodings:
        distances = face_recognition.face_distance(known_encodings, face_encoding)
        if len(distances) == 0:
            continue

        best_match = np.argmin(distances)
        if distances[best_match] < tolerance:
            email = known_emails[best_match]
            update_attendance(email, session_date)
            matched_users.append(email)

    return {
        "total_faces": len(face_encodings),
        "matched_users": matched_users
    }
def draw_and_show(image, face_locations, matched):
    matched_ids = {m[0] for m in matched}

    for i, (top, right, bottom, left) in enumerate(face_locations):
        if i in matched_ids:
            name = next(n for idx, n in matched if idx == i)
            color = (0, 255, 0)
        else:
            name = "Unknown"
            color = (0, 0, 255)

        cv2.rectangle(image, (left, top), (right, bottom), color, 2)
        cv2.putText(image, name, (left, top - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    plt.figure(figsize=(12, 8))
    plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    plt.axis("off")
    plt.show()


# --------- API MODELS ----------

class EmailRequest(BaseModel):
    email: str

class GroupPhotoRequest(BaseModel):
    image_url: str
    session_date: str


# --------- API ROUTES ----------


@app.post("/update-encodings")
def api_update_encodings(req: EmailRequest):
    update_user_encodings(req.email)
    return {"status": "success"}



@app.post("/mark-attendance")
def api_mark_attendance(req: GroupPhotoRequest):
    session_date = datetime.strptime(req.session_date, "%Y-%m-%d")

    result = mark_attendance_from_group_image(
        image_url=req.image_url,
        session_date=session_date
    )

    return result