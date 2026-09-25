/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as eclipseGuests from "../eclipseGuests.js";
import type * as eclipseHistoryRecovery from "../eclipseHistoryRecovery.js";
import type * as eclipseIdentity from "../eclipseIdentity.js";
import type * as eclipseLeaderboard from "../eclipseLeaderboard.js";
import type * as eclipseLeaderboardStore from "../eclipseLeaderboardStore.js";
import type * as eclipseMaintenance from "../eclipseMaintenance.js";
import type * as eclipseMatches from "../eclipseMatches.js";
import type * as eclipsePlayerStore from "../eclipsePlayerStore.js";
import type * as eclipsePlayers from "../eclipsePlayers.js";
import type * as eclipsePublicHistory from "../eclipsePublicHistory.js";
import type * as eclipseRollback from "../eclipseRollback.js";
import type * as eclipseRooms from "../eclipseRooms.js";
import type * as eclipseUpkeepTimer from "../eclipseUpkeepTimer.js";
import type * as eclipseValidators from "../eclipseValidators.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  eclipseGuests: typeof eclipseGuests;
  eclipseHistoryRecovery: typeof eclipseHistoryRecovery;
  eclipseIdentity: typeof eclipseIdentity;
  eclipseLeaderboard: typeof eclipseLeaderboard;
  eclipseLeaderboardStore: typeof eclipseLeaderboardStore;
  eclipseMaintenance: typeof eclipseMaintenance;
  eclipseMatches: typeof eclipseMatches;
  eclipsePlayerStore: typeof eclipsePlayerStore;
  eclipsePlayers: typeof eclipsePlayers;
  eclipsePublicHistory: typeof eclipsePublicHistory;
  eclipseRollback: typeof eclipseRollback;
  eclipseRooms: typeof eclipseRooms;
  eclipseUpkeepTimer: typeof eclipseUpkeepTimer;
  eclipseValidators: typeof eclipseValidators;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
