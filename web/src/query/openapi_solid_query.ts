import {
  createMutation,
  createQuery,
  createInfiniteQuery,
  type CreateQueryOptions,
  type SkipToken,
  type QueryClient,
  type CreateQueryResult,
  type CreateInfiniteQueryOptions,
  type InfiniteData,
  type CreateInfiniteQueryResult,
  type CreateMutationOptions,
  type CreateMutationResult,
  type SolidQueryOptions,
} from "@tanstack/solid-query"
import { number } from "arktype/internal/keywords/number.ts"
import {
  type FetchResponse,
  type MaybeOptionalInit,
  type Client as FetchClient,
} from "openapi-fetch"
import {
  type HttpMethod,
  type MediaType,
  type PathsWithMethod,
  type RequiredKeysOf,
} from "openapi-typescript-helpers"
import { type Accessor } from "solid-js"
import { SafeOmit } from "~/utils/type"

type InferSelectReturnType<TData, TSelect> =
  TSelect extends (data: TData) => infer R ? R : TData
type InitWithUnknowns<Init> = Init & Record<string, unknown>
export type QueryKey<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init = MaybeOptionalInit<Paths[Path], Method>,
> =
  Init extends undefined ? readonly [Method, Path]
  : readonly [Method, Path, Init]

export type QueryOptionsFunction<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>,
  Options extends Omit<
    SolidQueryOptions<
      Response["data"],
      Response["error"],
      InferSelectReturnType<Response["data"], Options["select"]>,
      QueryKey<Paths, Method, Path>
    >,
    "queryKey" | "queryFn"
  >,
>(
  method: Method,
  path: Path,
  ...[init, options]: RequiredKeysOf<Init> extends never ?
    [InitWithUnknowns<Init>?, Options?]
  : [InitWithUnknowns<Init>, Options?]
) => NoInfer<
  Omit<
    SolidQueryOptions<
      Response["data"],
      Response["error"],
      InferSelectReturnType<Response["data"], Options["select"]>,
      QueryKey<Paths, Method, Path>
    >,
    "queryFn"
  > & {
    queryFn: Exclude<
      SolidQueryOptions<
        Response["data"],
        Response["error"],
        InferSelectReturnType<Response["data"], Options["select"]>,
        QueryKey<Paths, Method, Path>
      >["queryFn"],
      SkipToken | undefined
    >
  }
>
export type CreateQueryMethod<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>,
  Options extends Omit<
    SolidQueryOptions<
      Response["data"],
      Response["error"],
      InferSelectReturnType<Response["data"], Options["select"]>,
      QueryKey<Paths, Method, Path>
    >,
    "queryKey" | "queryFn"
  >,
>(
  method: Method,
  url: Path,
  ...[init, options, queryClient]: RequiredKeysOf<Init> extends never ?
    [InitWithUnknowns<Init>?, Accessor<Options>?, Accessor<QueryClient>?]
  : [InitWithUnknowns<Init>, Accessor<Options>?, Accessor<QueryClient>?]
) => CreateQueryResult<
  InferSelectReturnType<Response["data"], Options["select"]>,
  Response["error"]
>
export type CreateInfiniteQueryMethod<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>,
  Options extends Omit<
    CreateInfiniteQueryOptions<
      Response["data"],
      Response["error"],
      InfiniteData<Response["data"]>,
      QueryKey<Paths, Method, Path>
    >,
    "queryKey" | "queryFn"
  > & {
    pageParamName?: string
  },
>(
  method: Method,
  url: Path,
  init: InitWithUnknowns<Init>,
  options: Options,
  queryClient?: Accessor<QueryClient>,
) => CreateInfiniteQueryResult<
  InfiniteData<Response["data"]>,
  Response["error"]
>

export type CreateMutationMethod<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>,
  Options extends Omit<
    CreateMutationOptions<Response["data"], Response["error"], Init>,
    "mutationKey" | "mutationFn"
  >,
>(
  method: Method,
  url: Path,
  options?: Options,
  queryClient?: Accessor<QueryClient>,
) => CreateMutationResult<Response["data"], Response["error"], Init>

export interface OpenapiQueryClient<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType = MediaType,
> {
  queryOptions: QueryOptionsFunction<Paths, Media>
  createQuery: CreateQueryMethod<Paths, Media>
  createInfiniteQuery: CreateInfiniteQueryMethod<Paths, Media>
  createMutation: CreateMutationMethod<Paths, Media>
}
export type MethodResponse<
  CreatedClient extends OpenapiQueryClient<
    Record<string, Record<HttpMethod, {}>>
  >,
  Method extends HttpMethod,
  Path extends CreatedClient extends (
    OpenapiQueryClient<infer Paths, infer _Media>
  ) ?
    PathsWithMethod<Paths, Method>
  : never,
  Options = {},
> =
  CreatedClient extends (
    OpenapiQueryClient<
      infer Paths extends Record<string, Record<HttpMethod, {}>>,
      infer Media extends MediaType
    >
  ) ?
    NonNullable<FetchResponse<Paths[Path][Method], Options, Media>["data"]>
  : never

export default function createClient<
  Paths extends {},
  Media extends MediaType = MediaType,
>(client: FetchClient<Paths, Media>): OpenapiQueryClient<Paths, Media> {
  const queryFn: ReturnType<
    QueryOptionsFunction<Paths, Media>
  >["queryFn"] = async ({ queryKey: [method, path, init], signal }) => {
    type Method = Uppercase<typeof method>
    const mth = method.toUpperCase() as Method
    const fn = client[mth]
    const { data, error } = await fn(path, { signal, ...init })
    if (error) {
      throw error
    }
    return data
  }
  const queryOptions: QueryOptionsFunction<Paths, Media> = (
    method,
    path,
    ...[init, options]
  ) => ({
    queryKey: init === undefined ? [method, path] : [method, path, init],
    queryFn,
    ...options,
  })

  return {
    queryOptions,
    createQuery: (method, path, ...[init, options, queryClient]) => {
      return createQuery(
        () => queryOptions(method, path, init, options),
        queryClient,
      )
    },

    createInfiniteQuery: (method, path, init, options, queryClient) => {
      const { pageParamName = "cursor", ...restOptions } = options
      const { queryKey } = queryOptions(method, path, init)
      return createInfiniteQuery(
        {
          queryKey,
          queryFn: async ({
            queryKey: [method, path, init],
            pageParam = 0,
            signal,
          }) => {
            const mth = method.toUpperCase()
            const fn = client[mth]
            const mergedInit = {
              ...init,
              signal,
              params: {
                ...init?.params,
                query: {
                  ...init?.params?.query,
                  [pageParamName]: pageParam,
                },
              },
            }
            const { data, error } = await fn(path, mergedInit)
            if (error) {
              throw error
            }
            return data
          },
          ...restOptions,
        },
        queryClient,
      )
    },
    createMutation: (method, path, options, queryClient) =>
      createMutation(
        {
          mutationKey: [method, path],
          mutationFn: async (init) => {
            const mth = method.toUpperCase()
            const fn = client[mth]
            const { data, error } = await fn(path, init)
            if (error) {
              throw error
            }
            return data
          },
          ...options,
        },
        queryClient,
      ),
  }
}
