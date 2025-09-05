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
import type * as engine_combat from "../engine/combat.js";
import type * as gameState from "../gameState.js";
import type * as helpers_match from "../helpers/match.js";
import type * as helpers_ready from "../helpers/ready.js";
import type * as rooms from "../rooms.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "engine/combat": typeof engine_combat;
  gameState: typeof gameState;
  "helpers/match": typeof helpers_match;
  "helpers/ready": typeof helpers_ready;
  rooms: typeof rooms;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
