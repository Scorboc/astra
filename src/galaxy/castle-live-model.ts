// Placement shared by the actual model and the existing navigation rail.
export const LIVE_CASTLE_POSITION = [-40, -6, -68] as const;
export const LIVE_CASTLE_SCALE = .6;
export const LIVE_CASTLE_ROTATION = 90;
export const LIVE_CASTLE_FLOOR = LIVE_CASTLE_POSITION[1] + .19405565202 * LIVE_CASTLE_SCALE;
export const LIVE_CASTLE_EYE = LIVE_CASTLE_POSITION[1] + 2.65 * LIVE_CASTLE_SCALE;
export const LIVE_CASTLE_AIM = LIVE_CASTLE_POSITION[1] + 7 * LIVE_CASTLE_SCALE;
export const LIVE_CASTLE_CENTER = [-40, -.06, -68] as const;
export const LIVE_CASTLE_RADIUS = 27;
export const LIVE_CASTLE_PHONE_RADIUS = 72;
export const LIVE_CASTLE_ASSET_ROOT = '/castle-live/';
