import os
import sys

from geopy.geocoders import Nominatim

sys.path.insert(0, "/app")

from models.schema import GeoMarker

class GeoMapper:
    def __init__(self):
        try:
            self.geolocator = Nominatim(user_agent="geomarket-ai-agent")
        except Exception:
            self.geolocator = None

    def map_entities(self, entities: list[dict], news_event_id: int) -> list[GeoMarker]:
        """
        Takes entities extracted from a news event, finds coordinates,
        and translates them into GeoMarkers to be saved to DB.
        """
        markers = []
        if not self.geolocator:
            return markers
            
        locations = [ent['text'] for ent in entities if ent['label'] in ["GPE", "LOC"]]

        for loc in set(locations): # unique locations only
            try:
                location = self.geolocator.geocode(loc)
                if location:
                    # Determine impact color by context normally, default 'yellow'
                    marker = GeoMarker(
                        news_event_id=news_event_id,
                        lat=location.latitude,
                        lng=location.longitude,
                        country=loc, # Using original text as country/location
                        impact_color="yellow", 
                        affected_sectors_json=["General"]
                    )
                    markers.append(marker)
            except Exception as e:
                # Catch geocoding exceptions (rate limits etc)
                print(f"Error mapping {loc}: {e}")

        return markers

geo_mapper = GeoMapper()
