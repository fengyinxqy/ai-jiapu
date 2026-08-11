"""API 请求/响应模型。"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Gender = Literal["male", "female", "unknown"]
RelationshipType = Literal["spouse", "parent_child"]
Role = Literal["user", "assistant"]


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    gender: Gender = "unknown"
    birth_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    death_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    note: str = ""
    created_at: datetime


class PersonUpdate(BaseModel):
    name: str | None = None
    gender: Gender | None = None
    birth_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    death_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    note: str | None = None


class RelationshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: RelationshipType
    person_a_id: int
    person_b_id: int


class TreeOut(BaseModel):
    persons: list[PersonOut] = []
    relationships: list[RelationshipOut] = []


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str
    tree: TreeOut


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: Role
    content: str
