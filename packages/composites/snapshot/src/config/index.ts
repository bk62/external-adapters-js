import { Config as BaseConfig, Requester } from '@chainlink/ea-bootstrap'

export const NAME = 'SNAPSHOT'
export const DEFAULT_ENDPOINT = 'read'
export const SNAPSHOT_GRAPHQL_ENDPOINT = `https://hub.snapshot.org/graphql`;


export type Config = BaseConfig & {
  // Adapter specific configs
  graphqlEndpoint?: string
}

export const makeConfig = (prefix?: string): Config => {
  return {
    ...Requester.getDefaultConfig(prefix),
    defaultEndpoint: DEFAULT_ENDPOINT,
    graphqlEndpoint: SNAPSHOT_GRAPHQL_ENDPOINT
  }
}
