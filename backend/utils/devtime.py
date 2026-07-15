"""
Dev/testing helper: lets the whole app treat a simulated day as "today"
once the real current day has already been ended, so End Meal Today can be
clicked repeatedly to advance day-by-day (dashboard, meal logging, exercise,
water — everything keyed off "today") without waiting for real time to pass.

Active only when MODE=dev in backend/.env — every function here is a no-op
passthrough to the real calendar date otherwise.
"""
import os
import datetime
from dotenv import load_dotenv

load_dotenv()

DEV_MODE = os.getenv("MODE", "production").strip().lower() == "dev"


def get_effective_today(cursor, user_id):
    """Return the date this user's "today" should be treated as.

    In dev mode, once a daily_meal_summaries row exists for today (or
    later), the effective day advances one past the most recently saved
    summary. Requires a dictionary cursor."""
    today = datetime.date.today()
    if not DEV_MODE:
        return today
    cursor.execute(
        "SELECT MAX(summary_date) AS last_date FROM daily_meal_summaries WHERE user_id=%s",
        (user_id,)
    )
    row = cursor.fetchone()
    last_date = row["last_date"] if row else None
    if last_date and last_date >= today:
        return last_date + datetime.timedelta(days=1)
    return today
