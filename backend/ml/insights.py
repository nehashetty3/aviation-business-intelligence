"""
Automated insight narratives — Claude generates a 2-sentence "so what"
for each chart based on the chart's data. Results are cached in memory.
"""
import os, json, hashlib
from typing import Any

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY","")
_cache: dict = {}

INSIGHT_SYSTEM = """You are a senior aviation MRO business analyst. Given raw chart data,
write exactly 2 clear, specific sentences explaining the most important finding and its
business implication. Be concrete — reference actual numbers. Do not use bullet points.
Do not say "the data shows" or "as we can see". Just state the insight directly."""

def generate_insight(chart_name: str, data: Any, context: str = "") -> str:
    if not ANTHROPIC_API_KEY:
        return ""

    cache_key = hashlib.md5(f"{chart_name}{json.dumps(data,default=str)[:500]}".encode()).hexdigest()
    if cache_key in _cache:
        return _cache[cache_key]

    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"Chart: {chart_name}\n"
    if context:
        prompt += f"Context: {context}\n"
    prompt += f"Data (summary): {json.dumps(data, default=str)[:1200]}"

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=120,
            system=INSIGHT_SYSTEM,
            messages=[{"role":"user","content": prompt}],
        )
        insight = msg.content[0].text.strip()
    except Exception:
        insight = ""

    _cache[cache_key] = insight
    return insight
