import datetime
import os
import time

import requests as http_req

# Live USD/NPR rate from Nepal Rastra Bank's public forex API (app prices are
# in NPR, Stripe settles in USD). Falls back to NPR_TO_USD_FALLBACK_RATE if
# the API is unreachable. Cached in-memory since NRB only republishes once a day.
NRB_FOREX_API            = os.getenv('NRB_FOREX_API', 'https://www.nrb.org.np/api/forex/v1/rates')
NPR_TO_USD_FALLBACK_RATE = float(os.getenv('NPR_TO_USD_FALLBACK_RATE', '133'))
FX_RATE_CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours

_fx_rate_cache = {'rate': None, 'fetched_at': 0.0}


def get_npr_to_usd_rate() -> float:
    """Latest USD/NPR mid-rate (average of NRB buy/sell), cached for FX_RATE_CACHE_TTL_SECONDS."""
    now = time.time()
    if _fx_rate_cache['rate'] and (now - _fx_rate_cache['fetched_at']) < FX_RATE_CACHE_TTL_SECONDS:
        return _fx_rate_cache['rate']

    today = datetime.date.today()
    from_date = today - datetime.timedelta(days=6)
    try:
        resp = http_req.get(
            NRB_FOREX_API,
            params={'page': 1, 'per_page': 10, 'from': from_date.isoformat(), 'to': today.isoformat()},
            timeout=8,
        )
        payload = resp.json()['data']['payload']
        if not payload:
            raise ValueError('NRB returned no forex data')
        latest = payload[-1]['rates']
        usd_rate = next(r for r in latest if r['currency']['iso3'] == 'USD')
        rate = round((float(usd_rate['buy']) + float(usd_rate['sell'])) / 2, 4)
    except Exception:
        return NPR_TO_USD_FALLBACK_RATE

    _fx_rate_cache['rate'] = rate
    _fx_rate_cache['fetched_at'] = now
    return rate


def npr_to_usd_cents(amount_npr: float):
    """Convert an NPR amount to (usd_amount, usd_cents, rate) using the live NPR→USD rate."""
    rate = get_npr_to_usd_rate()
    usd_amount = round(amount_npr / rate, 2)
    return usd_amount, int(round(usd_amount * 100)), rate
