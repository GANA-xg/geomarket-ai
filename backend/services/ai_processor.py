import json
import os
import re
from typing import Any

 # sys.path.insert(0, "/app")

try:
    import spacy
except Exception:
    spacy = None

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

try:
    from transformers import pipeline
except Exception:
    pipeline = None


class AIProcessor:
    def __init__(self):
        self.finbert = None
        self.enable_finbert = os.getenv("ENABLE_FINBERT", "0").strip() in {"1", "true", "TRUE"}
        if pipeline and self.enable_finbert:
            try:
                self.finbert = pipeline("text-classification", model="ProsusAI/finbert", truncation=True)
            except Exception:
                self.finbert = None

        self.nlp = None
        if spacy:
            for model_name in ("en_core_web_lg", "en_core_web_sm"):
                try:
                    self.nlp = spacy.load(model_name)
                    break
                except Exception:
                    continue

        self.openai_client = None
        api_key = os.getenv("OPENAI_API_KEY", "")
        if OpenAI and api_key:
            try:
                self.openai_client = OpenAI(api_key=api_key)
            except Exception:
                self.openai_client = None

    @staticmethod
    def _normalize_finbert_label(label: str) -> str:
        label = (label or "").upper()
        if "POS" in label:
            return "POSITIVE"
        if "NEG" in label:
            return "NEGATIVE"
        return "NEUTRAL"

    def analyze_finbert(self, headline: str, body: str) -> dict[str, Any]:
        text = f"{headline or ''} {body or ''}"[:4096]
        if self.finbert:
            try:
                result = self.finbert(text[:2048])[0]
                label = self._normalize_finbert_label(result.get("label", "NEUTRAL"))
                confidence = float(result.get("score", 0.0))
                score = 0.0
                if label == "POSITIVE":
                    score = confidence
                elif label == "NEGATIVE":
                    score = -confidence
                return {
                    "sentiment_label": label,
                    "sentiment_score": max(-1.0, min(1.0, score)),
                    "confidence": max(0.0, min(1.0, confidence)),
                }
            except Exception:
                pass

        lowered = text.lower()
        positive_hits = sum(token in lowered for token in ["rally", "growth", "beat", "profit", "optimism"])
        negative_hits = sum(token in lowered for token in ["crisis", "war", "cut", "fall", "loss", "inflation"])
        raw = (positive_hits - negative_hits) / 5.0
        score = max(-1.0, min(1.0, raw))
        label = "NEUTRAL"
        if score > 0.15:
            label = "POSITIVE"
        elif score < -0.15:
            label = "NEGATIVE"
        return {
            "sentiment_label": label,
            "sentiment_score": score,
            "confidence": min(1.0, abs(score) + 0.2),
        }

    def extract_entities(self, text: str) -> list[dict[str, str]]:
        if not self.nlp:
            return []
        allowed = {"ORG", "GPE", "MONEY", "PERCENT", "DATE", "PRODUCT"}
        entities: list[dict[str, str]] = []
        doc = self.nlp(text[:10000])
        for ent in doc.ents:
            if ent.label_ in allowed:
                entities.append({"text": ent.text, "label": ent.label_})
        return entities

    @staticmethod
    def _safe_json_extract(content: str) -> dict[str, Any]:
        if not content:
            return {}
        content = content.strip()
        try:
            return json.loads(content)
        except Exception:
            pass

        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                return {}
        return {}

    @staticmethod
    def _safe_json_array_extract(content: str) -> list[dict[str, Any]]:
        if not content:
            return []
        text = content.strip()
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [item for item in parsed if isinstance(item, dict)]
        except Exception:
            pass

        # Handle code fences and partial completions.
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, list):
                    return [item for item in parsed if isinstance(item, dict)]
            except Exception:
                return []
        return []

    @staticmethod
    def _fallback_geo_coordinates(location: str) -> tuple[float, float] | None:
        mapping = {
            "india": (20.5937, 78.9629),
            "middle east": (29.2985, 42.5510),
            "saudi arabia": (23.8859, 45.0792),
            "uae": (23.4241, 53.8478),
            "iran": (32.4279, 53.6880),
            "israel": (31.0461, 34.8516),
            "iraq": (33.2232, 43.6793),
            "europe": (54.5260, 15.2551),
            "asia": (34.0479, 100.6197),
            "china": (35.8617, 104.1954),
            "russia": (61.5240, 105.3188),
            "united states": (37.0902, -95.7129),
            "usa": (37.0902, -95.7129),
            "uk": (55.3781, -3.4360),
            "united kingdom": (55.3781, -3.4360),
            "global": (20.0, 0.0),
        }
        return mapping.get((location or "").strip().lower())

    def extract_geo_locations(self, article_text: str) -> list[dict[str, Any]]:
        if not article_text:
            return []

        if not self.openai_client:
            return []

        system_prompt = (
            "Extract ALL geopolitical locations from this news.\n\n"
            "STRICT RULES:\n"
            "- Minimum 3 locations if any global topic exists\n"
            "- Expand regions: 'Middle East' -> Saudi Arabia, UAE, Iran, Israel, Iraq\n"
            "- Always include India if economic/global impact\n"
            "- Assign: lat (accurate), lng (accurate), impact (0 to 1), sentiment (-1 to +1)\n\n"
            "RETURN STRICT JSON:\n"
            "[\n"
            "  {\n"
            "    \"location\": \"string\",\n"
            "    \"lat\": number,\n"
            "    \"lng\": number,\n"
            "    \"impact\": number,\n"
            "    \"sentiment\": number\n"
            "  }\n"
            "]\n\n"
            "NEVER return empty array unless completely irrelevant.\n"
            "Return only JSON array. No markdown, no explanation."
        )

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.0,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": article_text[:6000]},
                ],
            )
            content = response.choices[0].message.content if response.choices else ""
            parsed = self._safe_json_array_extract(content or "")
        except Exception:
            return []

        normalized: list[dict[str, Any]] = []
        for item in parsed:
            location = str(item.get("location", "")).strip()
            if not location:
                continue

            lat = item.get("lat")
            lng = item.get("lng")
            if lat is None or lng is None:
                fallback = self._fallback_geo_coordinates(location)
                if fallback:
                    lat, lng = fallback

            try:
                lat_f = float(lat)
                lng_f = float(lng)
                impact = max(0.0, min(1.0, float(item.get("impact", 0.0))))
                sentiment = max(-1.0, min(1.0, float(item.get("sentiment", 0.0))))
            except (TypeError, ValueError):
                continue

            if not (-90 <= lat_f <= 90 and -180 <= lng_f <= 180):
                continue

            normalized.append(
                {
                    "location": location,
                    "lat": lat_f,
                    "lng": lng_f,
                    "impact": impact,
                    "sentiment": sentiment,
                }
            )

        print(f"[geo-extraction] locations={normalized}")
        return normalized

    def analyze_sector_impact(self, headline: str, body: str) -> dict[str, Any]:
        default_json = {
            "event_type": "Economic Policy",
            "primary_region": "Global",
            "affected_sectors": ["Banking"],
            "market_impact_direction": 0,
            "impact_magnitude": "LOW",
            "india_specific_impact": "Limited direct impact on India. Monitor sector-specific developments.",
            "affected_indian_stocks": [],
        }
        if not self.openai_client:
            return default_json

        system_prompt = (
            "You are a senior financial analyst specialising in Indian stock markets. "
            "Analyse the given news and return ONLY a JSON object with these fields:\n"
            "{\n"
            "  event_type: string (War/Conflict/Economic Policy/Interest Rate/Tech/Energy/Currency/Trade/Political/Natural Disaster),\n"
            "  primary_region: string (country or region name),\n"
            "  affected_sectors: array of strings (choose from: Energy, IT, Banking, FMCG, Auto, Pharma, Metals, Infra, Defence, Paint, Telecom, Realty, Aviation),\n"
            "  market_impact_direction: integer (-1, 0, or 1),\n"
            "  impact_magnitude: string (LOW/MEDIUM/HIGH),\n"
            "  india_specific_impact: string (2 sentences max explaining impact on India),\n"
            "  affected_indian_stocks: array of NSE ticker strings (max 5)\n"
            "}\n"
            "Return ONLY the JSON. No explanation. No markdown."
        )
        user_prompt = f"Headline: {headline}\n\nBody: {(body or '')[:1000]}"

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.1,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            content = response.choices[0].message.content if response.choices else ""
            parsed = self._safe_json_extract(content or "")
            return {**default_json, **parsed}
        except Exception:
            return default_json

    @staticmethod
    def aggregate_sentiment(finbert_score: float, llm_direction: int, llm_magnitude: str, entity_count: int) -> dict[str, Any]:
        magnitude_map = {"HIGH": 1.0, "MEDIUM": 0.5, "LOW": 0.2}
        llm_base = magnitude_map.get((llm_magnitude or "LOW").upper(), 0.2)
        llm_magnitude_score = llm_base * (-1.0 if llm_direction == -1 else 1.0 if llm_direction == 1 else 0.0)
        entity_count_score = min(entity_count / 10.0, 1.0)

        combined = (finbert_score * 0.4) + (llm_magnitude_score * 0.4) + (entity_count_score * 0.2)

        impact_color = "YELLOW"
        if combined > 0.3:
            impact_color = "GREEN"
        elif combined < -0.3:
            impact_color = "RED"

        return {
            "combined_sentiment_score": combined,
            "llm_magnitude_score": llm_magnitude_score,
            "entity_count_score": entity_count_score,
            "impact_color": impact_color,
        }

    def process_article(self, headline: str, body: str) -> dict[str, Any]:
        finbert_result = self.analyze_finbert(headline, body)
        entities = self.extract_entities(f"{headline or ''} {body or ''}")
        llm_result = self.analyze_sector_impact(headline, body)
        aggregate = self.aggregate_sentiment(
            finbert_result["sentiment_score"],
            int(llm_result.get("market_impact_direction", 0) or 0),
            str(llm_result.get("impact_magnitude", "LOW") or "LOW"),
            len(entities),
        )

        return {
            "sentiment_label": finbert_result["sentiment_label"],
            "sentiment_score": finbert_result["sentiment_score"],
            "confidence": finbert_result["confidence"],
            "entities": entities,
            "llm": llm_result,
            **aggregate,
        }


ai_processor = AIProcessor()
