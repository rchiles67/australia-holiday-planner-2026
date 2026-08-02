from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Planning-Not_App"
DESTINATION = ROOT / "public" / "images" / "wa-supplied"

PHOTO_FILES = {
    "2002_-_View_across_Shelley_Beach_to_West_Cape_Howe,_WA_-_panoramio.jpg": "west-cape-howe-shelley.jpg",
    "Albany - Bald Head Walk Trail - Wikipedia.jpg": "albany-bald-head-walk.jpg",
    "Albany_Gap,_Western_Australia.jpg": "albany-gap.jpg",
    "Blossoms Beach - Bushtrax.jpg": "bremer-blossoms.jpg",
    "Bluff Kmoll - Wikipedia.jpg": "stirling-bluff-knoll.jpg",
    "Bremer Bay high point - Bushtrax.jpg": "bremer-high-point.jpg",
    "cape-arid-beach-walk - Tripadvisor.jpg": "cape-arid-beach-walk.jpg",
    "Elephant Rocks - Western australia Travel.JPG": "denmark-elephant-rocks.jpg",
    "Fitzgerald Coast.jpg": "fitzgerald-coast.jpg",
    "hellfire-bay-cape-le-grand-national-park-tourism-wa-1.jpg": "cape-le-grand-hellfire.jpg",
    "High_Street,_Fremantle,_Western_Australia - wikipedia By Richard Keeler.jpg": "fremantle-high-street.jpg",
    "Hopetoun - Fitzgerald Coast Tourism.jpg": "hopetoun-foreshore.jpg",
    "Kings Park and Botanic Garden - WA Tourism - Tourist Places.jpg": "perth-kings-park.jpg",
    "Naturaliste_lighthouse_gnangarra_16 - Wikipedia.JPG": "cape-naturaliste-lighthouse-portrait.jpg",
    "Perth-Sunset-from-Kings-Park-1024x576 - Perth Weekend.jpg": "perth-sunset-kings-park.jpg",
    "Pink Lake - Australia Tourism.jpg": "esperance-pink-lake.jpg",
    "Smiths_Beach - Wikipedia.JPG": "yallingup-smiths-beach.jpg",
    "stirling Range - Tripadvisor.jpg": "stirling-range-panorama.jpg",
    "tagon-coastal-trail-cape-arid-national-park-bronwyn-wells - Explore Parks WA.jpg": "cape-arid-tagon-trail.jpg",
    "Torndirrup_Peninsula_to_Bald_Head - Wikipedia.JPG": "torndirrup-bald-head.jpg",
    "Two_Peoples_Bay_2 - Wkipedia.jpg": "two-peoples-bay-lake.jpg",
    "Two_Peoples_Bay_4 - Wikipedia.jpg": "two-peoples-bay-coast.jpg",
    "Valley of the Giants and Tree Top Walk Day Tour from Perth - Viator.jpg": "valley-giants-walk.jpg",
    "Wave rock - Expedia.jpg": "wave-rock-expedia.jpg",
    "West Cape Howe National Park - Explore Oz.jpg": "west-cape-howe-cliffs.jpg",
    "wharton-beach- Bush and Bay.jpg": "wharton-4wd.jpg",
    "Yallingup_gnangarra_ Wikipedia.JPG": "yallingup-road.jpg",
    "yeagerup - Roaming Down Under.jpg": "yeagarup-dunes.jpg",
}


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    source_photos = {path.name for path in SOURCE.iterdir() if path.suffix.lower() in {".jpg", ".jpeg", ".png"}}
    missing_from_map = source_photos - PHOTO_FILES.keys()
    missing_from_folder = PHOTO_FILES.keys() - source_photos
    if missing_from_map or missing_from_folder:
        raise RuntimeError(
            f"Photo mapping mismatch. Unmapped: {sorted(missing_from_map)}; missing: {sorted(missing_from_folder)}"
        )

    for source_name, destination_name in PHOTO_FILES.items():
        with Image.open(SOURCE / source_name) as source_image:
            image = ImageOps.exif_transpose(source_image).convert("RGB")
            image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            image.save(DESTINATION / destination_name, format="JPEG", quality=84, optimize=True, progressive=True)

    print(f"Prepared {len(PHOTO_FILES)} supplied photographs in {DESTINATION}")


if __name__ == "__main__":
    main()
