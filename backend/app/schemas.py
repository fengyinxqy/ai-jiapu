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
    biography: str = ""
    note: str = ""
    created_at: datetime


class PersonUpdate(BaseModel):
    name: str | None = None
    gender: Gender | None = None
    birth_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    death_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    biography: str | None = None
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


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=32)
    password: str = Field(min_length=6, max_length=64)


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=64)


FamilyRole = Literal["owner", "editor", "viewer"]


class FamilyOut(BaseModel):
    id: int
    name: str
    owner_id: int
    role: FamilyRole
    created_at: datetime


class FamilyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class FamilyMemberOut(BaseModel):
    user_id: int
    username: str
    role: FamilyRole
    created_at: datetime


class MemberRoleUpdate(BaseModel):
    role: Literal["editor", "viewer"]


class JoinRequest(BaseModel):
    code: str = Field(min_length=4, max_length=16)


class InviteOut(BaseModel):
    code: str


class StoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    title: str
    content: str
    created_at: datetime


class StoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=5000)


class StoryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    content: str | None = Field(default=None, min_length=1, max_length=5000)
