export interface PlanSettings {
  capacity: number;
  maxWalkMeters: number;
  maxRideMinutes: number;
  minRiders: number;
  pickupWalkMeters: number;
  walkDetour: number;
  walkMetersPerMinute: number;
  driveDetour: number;
  driveMetersPerMinute: number;
  dwellMinutes: number;
  mergeBearingDegrees: number;
  walkWeight: number;
  lateShiftMinutes: number;
  foldThinSlots: boolean;
  rideWeight: number;
  turnMinutes: number;
  tripCostMinutes: number;
  fleetCostMinutes: number;
  slotMinutes: number;
  maxDeadheadMinutes: number;
}

export interface DispatchSettings {
  busyShare: number;
  quietShare: number;
  shiftMinutes: number;
  minHeadwayMinutes: number;
  freezeMinutes: number;
  linkBearingDegrees: number;
}

export interface DayOfSettings {
  maxBoardWalkMeters: number;
  maxHomeWalkMeters: number;
  boardGraceMinutes: number;
}

export const PLAN_SETTINGS: PlanSettings = {
  capacity: 28,
  maxWalkMeters: 700,
  maxRideMinutes: 60,
  minRiders: 4,
  pickupWalkMeters: 400,
  walkDetour: 1.3,
  walkMetersPerMinute: 75,
  driveDetour: 1.35,
  driveMetersPerMinute: 600,
  dwellMinutes: 1,
  mergeBearingDegrees: 45,
  walkWeight: 0.25,
  lateShiftMinutes: 10,
  foldThinSlots: true,
  rideWeight: 0.5,
  turnMinutes: 5,
  tripCostMinutes: 5,
  fleetCostMinutes: 240,
  slotMinutes: 30,
  maxDeadheadMinutes: 30,
};

export const DISPATCH_SETTINGS: DispatchSettings = {
  busyShare: 0.7,
  quietShare: 0.3,
  shiftMinutes: 15,
  minHeadwayMinutes: 10,
  freezeMinutes: 30,
  linkBearingDegrees: 45,
};

export const DAY_OF_SETTINGS: DayOfSettings = {
  maxBoardWalkMeters: 800,
  maxHomeWalkMeters: 1000,
  boardGraceMinutes: 2,
};

export function walkMinutes(meters: number, settings: Pick<PlanSettings, "walkDetour" | "walkMetersPerMinute">) {
  return Math.max(1, Math.ceil((meters * settings.walkDetour) / settings.walkMetersPerMinute));
}

export function driveMinutes(meters: number, settings: Pick<PlanSettings, "driveDetour" | "driveMetersPerMinute">) {
  return (meters * settings.driveDetour) / settings.driveMetersPerMinute;
}
