export const COMMUNITY_JOIN_MARKER_DATE = new Date("1970-01-01T00:00:00.000Z")
const COMMUNITY_JOIN_MARKER_CUTOFF = new Date("1971-01-01T00:00:00.000Z")

type ContributionMarker = {
  lastLoginDate: Date | null
  lastCheckinDate: Date | null
}

function isMarkerDate(value: Date | null) {
  return Boolean(value && value.getTime() < COMMUNITY_JOIN_MARKER_CUTOFF.getTime())
}

export function isCommunityJoinedContribution(contribution: ContributionMarker | null) {
  if (!contribution) return false
  return isMarkerDate(contribution.lastLoginDate) || isMarkerDate(contribution.lastCheckinDate)
}

export function buildCommunityParticipantWhere(goalId: string) {
  return {
    goalId,
    OR: [
      { lastLoginDate: { lt: COMMUNITY_JOIN_MARKER_CUTOFF } },
      { lastCheckinDate: { lt: COMMUNITY_JOIN_MARKER_CUTOFF } },
    ],
  }
}
