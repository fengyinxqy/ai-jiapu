"""SQLite 数据模型。"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Person(Base):
    __tablename__ = "persons"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    gender: Mapped[str] = mapped_column(String(10), default="unknown")
    birth_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    death_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    # 预留多用户/多家谱升级字段（v1 不使用）
    owner_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    family_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    relationships_as_a: Mapped[list["Relationship"]] = relationship(
        foreign_keys="Relationship.person_a_id",
        back_populates="person_a",
    )
    relationships_as_b: Mapped[list["Relationship"]] = relationship(
        foreign_keys="Relationship.person_b_id",
        back_populates="person_b",
    )


class Relationship(Base):
    __tablename__ = "relationships"
    __table_args__ = (
        UniqueConstraint("type", "person_a_id", "person_b_id", name="uq_relationship"),
        Index("ix_relationship_persons", "person_a_id", "person_b_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(20))  # spouse | parent_child
    person_a_id: Mapped[int] = mapped_column(
        ForeignKey("persons.id", ondelete="CASCADE")
    )
    person_b_id: Mapped[int] = mapped_column(
        ForeignKey("persons.id", ondelete="CASCADE")
    )
    owner_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    family_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    person_a: Mapped["Person"] = relationship(
        foreign_keys=[person_a_id],
        back_populates="relationships_as_a",
    )
    person_b: Mapped["Person"] = relationship(
        foreign_keys=[person_b_id],
        back_populates="relationships_as_b",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    family_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
