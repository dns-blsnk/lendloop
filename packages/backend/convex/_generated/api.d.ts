/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit_index from "../audit/index.js";
import type * as audit_model from "../audit/model.js";
import type * as audit_tables from "../audit/tables.js";
import type * as crons from "../crons.js";
import type * as domain_availability from "../domain/availability.js";
import type * as functions from "../functions.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_today from "../lib/today.js";
import type * as loans_index from "../loans/index.js";
import type * as loans_internal from "../loans/internal.js";
import type * as loans_model from "../loans/model.js";
import type * as loans_mutations from "../loans/mutations.js";
import type * as loans_queries from "../loans/queries.js";
import type * as loans_tables from "../loans/tables.js";
import type * as tools_index from "../tools/index.js";
import type * as tools_model from "../tools/model.js";
import type * as tools_mutations from "../tools/mutations.js";
import type * as tools_queries from "../tools/queries.js";
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
  "audit/index": typeof audit_index;
  "audit/model": typeof audit_model;
  "audit/tables": typeof audit_tables;
  crons: typeof crons;
  "domain/availability": typeof domain_availability;
  functions: typeof functions;
  "lib/errors": typeof lib_errors;
  "lib/today": typeof lib_today;
  "loans/index": typeof loans_index;
  "loans/internal": typeof loans_internal;
  "loans/model": typeof loans_model;
  "loans/mutations": typeof loans_mutations;
  "loans/queries": typeof loans_queries;
  "loans/tables": typeof loans_tables;
  "tools/index": typeof tools_index;
  "tools/model": typeof tools_model;
  "tools/mutations": typeof tools_mutations;
  "tools/queries": typeof tools_queries;
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
