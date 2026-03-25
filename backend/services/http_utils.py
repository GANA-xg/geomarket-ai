import asyncio
from typing import Any, Callable

import httpx


class ExternalAPIError(Exception):
    pass


async def request_json_with_retries(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 3.0,
    retries: int = 2,
    validate: Callable[[Any], bool] | None = None,
) -> Any:
    last_error: Exception | None = None

    for attempt in range(retries + 1):
        try:
            response = await client.request(
                method=method,
                url=url,
                params=params,
                headers=headers,
                timeout=timeout,
            )
            response.raise_for_status()
            payload = response.json()
            if validate and not validate(payload):
                raise ExternalAPIError("Invalid response payload")
            return payload
        except (
            httpx.TimeoutException,
            httpx.NetworkError,
            httpx.HTTPStatusError,
            ValueError,
            ExternalAPIError,
        ) as exc:
            last_error = exc
            if attempt >= retries:
                break
            await asyncio.sleep(0.15 * (2**attempt))

    raise ExternalAPIError(str(last_error) if last_error else "External API request failed")
