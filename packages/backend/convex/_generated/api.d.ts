/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_model from "../admin/model.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as audit_index from "../audit/index.js";
import type * as audit_model from "../audit/model.js";
import type * as audit_tables from "../audit/tables.js";
import type * as automation_delivery from "../automation/delivery.js";
import type * as automation_events from "../automation/events.js";
import type * as automation_index from "../automation/index.js";
import type * as automation_n8n from "../automation/n8n.js";
import type * as automation_outbox from "../automation/outbox.js";
import type * as automation_signed_endpoint from "../automation/signed_endpoint.js";
import type * as automation_tables from "../automation/tables.js";
import type * as automation_write_backs from "../automation/write_backs.js";
import type * as crons from "../crons.js";
import type * as domain_availability from "../domain/availability.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_today from "../lib/today.js";
import type * as loans_index from "../loans/index.js";
import type * as loans_internal from "../loans/internal.js";
import type * as loans_model from "../loans/model.js";
import type * as loans_mutations from "../loans/mutations.js";
import type * as loans_queries from "../loans/queries.js";
import type * as loans_tables from "../loans/tables.js";
import type * as loans_views from "../loans/views.js";
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
  "admin/model": typeof admin_model;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "audit/index": typeof audit_index;
  "audit/model": typeof audit_model;
  "audit/tables": typeof audit_tables;
  "automation/delivery": typeof automation_delivery;
  "automation/events": typeof automation_events;
  "automation/index": typeof automation_index;
  "automation/n8n": typeof automation_n8n;
  "automation/outbox": typeof automation_outbox;
  "automation/signed_endpoint": typeof automation_signed_endpoint;
  "automation/tables": typeof automation_tables;
  "automation/write_backs": typeof automation_write_backs;
  crons: typeof crons;
  "domain/availability": typeof domain_availability;
  functions: typeof functions;
  http: typeof http;
  "lib/env": typeof lib_env;
  "lib/errors": typeof lib_errors;
  "lib/today": typeof lib_today;
  "loans/index": typeof loans_index;
  "loans/internal": typeof loans_internal;
  "loans/model": typeof loans_model;
  "loans/mutations": typeof loans_mutations;
  "loans/queries": typeof loans_queries;
  "loans/tables": typeof loans_tables;
  "loans/views": typeof loans_views;
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
