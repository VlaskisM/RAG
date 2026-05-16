from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    from src.models import User, UserSettings

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        user = await session.get(User, 1)
        if user is None:
            user = User(
                id=1,
                name="Анна Морозова",
                email="anna.morozova@company.ru",
                role="Product Operations Lead",
                department="Operations",
            )
            session.add(user)
            await session.flush()
            session.add(UserSettings(user_id=user.id))
            await session.commit()
