from pydantic import BaseModel
from typing import Optional, List

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "💬"
    color: Optional[str] = "#6366f1"

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    question_count: Optional[int] = 0

    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    category_id: int
    question_text: str
    hint: Optional[str] = ""
    difficulty: Optional[str] = "Orta"

class QuestionCreate(QuestionBase):
    pass

class QuestionResponse(QuestionBase):
    id: int
    category_name: Optional[str] = ""

    class Config:
        from_attributes = True
