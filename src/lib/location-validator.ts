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
  const latStr = process.env.LAB_LATITUDE
  const lonStr = process.env.LAB_LONGITUDE
  const radStr = process.env.ALLOWED_RADIUS_METERS

  if (!latStr || !lonStr) {
    console.error("Environment variables LAB_LATITUDE or LAB_LONGITUDE are not set!")
    return false // If not set, fail secure instead of allowing anyone to check in
  }

  const labLat = parseFloat(latStr)
  const labLon = parseFloat(lonStr)
  const allowedRadius = parseFloat(radStr || "100")

  const distance = getDistanceFromLatLonInM(userLat, userLon, labLat, labLon)
  console.log(`User distance from lab: ${distance} meters (allowed: ${allowedRadius}m)`)
  
  return distance <= allowedRadius
}

/**
 * Check if the user's IP address belongs to the lab network.
 * Used as a fallback when GPS/geolocation is unavailable (e.g. indoors).
 */
export function isLabNetwork(clientIp: string | null): boolean {
  if (!clientIp) return false

  const allowedIps = process.env.ALLOWED_LAB_IPS
  if (!allowedIps) {
    console.error("Environment variable ALLOWED_LAB_IPS is not set!")
    return false
  }

  const ipList = allowedIps.split(",").map((ip) => ip.trim())
  const isAllowed = ipList.includes(clientIp)
  console.log(`IP check: ${clientIp} → ${isAllowed ? "allowed" : "denied"} (allowed: ${ipList.join(", ")})`)
  return isAllowed
}