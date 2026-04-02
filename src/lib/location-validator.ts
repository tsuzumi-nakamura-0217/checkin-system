// Require local environment configuration for lab location

function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

// Haversine formula to calculate the distance
export function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000 // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c // Distance in m
  return d
}

export function isWithinLab(userLat: number, userLon: number): boolean {
  const LAB_LATITUDE = parseFloat(process.env.LAB_LATITUDE || "0")
  const LAB_LONGITUDE = parseFloat(process.env.LAB_LONGITUDE || "0")
  const ALLOWED_RADIUS = parseFloat(process.env.ALLOWED_RADIUS_METERS || "50")

  if (!LAB_LATITUDE || !LAB_LONGITUDE) return true // Disable validation if coords not set
  
  const distance = getDistanceFromLatLonInM(userLat, userLon, LAB_LATITUDE, LAB_LONGITUDE)
  return distance <= ALLOWED_RADIUS
}