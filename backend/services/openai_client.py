import json
from openai import AsyncOpenAI
from config import settings

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def chat_json(system: str, user: str, model: str = "gpt-4o") -> dict:
    """Call OpenAI and expect a JSON object back."""
    client = get_client()
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
    )
    raw = response.choices[0].message.content
    return json.loads(raw)


async def chat_text(system: str, user: str, model: str = "gpt-4o") -> str:
    """Call OpenAI and return plain text."""
    client = get_client()
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.5,
    )
    return response.choices[0].message.content


async def chat_vision(
    system: str,
    user_text: str,
    images: list[dict],   # each: {"media_type": str, "data": str (base64), "name": str}
    model: str = "gpt-4o",
) -> dict:
    """Call GPT-4o with vision (images + text prompt) and return a JSON object."""
    client = get_client()
    content: list = [{"type": "text", "text": user_text}]
    for img in images:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{img['media_type']};base64,{img['data']}",
                "detail": "high",
            },
        })
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": content},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    return json.loads(response.choices[0].message.content)
