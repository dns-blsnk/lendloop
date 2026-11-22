/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit_tables from "../audit/tables.js";
import type * as functions from "../functions.js";
import type * as lib_errors from "../lib/errors.js";
import type * as loans_tables from "../loans/tables.js";
import type * as tools_tables from "../tools/tables.js";
import type * as users_index from "../users/index.js";
import type * as users_internal from "../users/internal.js";
import type * as users_model from "../users/model.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as users_tables from "../users/tables.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "audit/tables": typeof audit_tables;
  functions: typeof functions;
  "lib/errors": typeof lib_errors;
  "loans/tables": typeof loans_tables;
  "tools/tables": typeof tools_tables;
  "users/index": typeof users_index;
  "users/internal": typeof users_internal;
  "users/model": typeof users_model;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  "users/tables": typeof users_tables;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
