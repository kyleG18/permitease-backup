from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="BizCheckPermit AI Service")

class BusinessInfo(BaseModel):
    business_type: str
    industry_category: str
    employees: int

@app.get("/")
def read_root():
    return {"message": "Welcome to BizCheckPermit AI Service"}

@app.post("/recommend-permits")
def recommend_permits(business_info: BusinessInfo):
    # Placeholder for actual AI logic
    return {
        "recommended_permits": [
            "Barangay Clearance",
            "Mayor's Permit",
            "Fire Safety Inspection Certificate",
            "Sanitary Permit"
        ],
        "explanation": "The recommended permits are based on the business type and applicable local regulations."
    }

# Run with: uvicorn main:app --reload
