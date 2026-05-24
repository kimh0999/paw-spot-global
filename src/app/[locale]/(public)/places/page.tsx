import { getPlaces } from "@/lib/places/queries";
import PlacesClient from "./PlacesClient";

export default async function PlacesPage() {
  const places = await getPlaces();
  return <PlacesClient initialPlaces={places} />;
}
