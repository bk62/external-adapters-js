import { AdapterContext, Requester } from '@chainlink/ea-bootstrap'
import * as GraphQLSourceAdapter from '@chainlink/graphql-adapter'

export const getGraphQLEAResult = async (
  id: string,
  query: string,
  variables: Record<string, string | number | boolean> | undefined,
  graphqlEndpoint: string,
  context: AdapterContext,
): Promise<Record<string, unknown>> => {


  const input = {
    id,
    data: {
      query,
      variables,
      graphqlEndpoint
    },
  }

  const graphqlExecute = GraphQLSourceAdapter.makeExecute(GraphQLSourceAdapter.makeConfig())
  const response = await graphqlExecute(input, context)

  const result = Requester.getResultFromObject(response.result || {}, "data.proposals.0");
  return result as Record<string, unknown>;
}
