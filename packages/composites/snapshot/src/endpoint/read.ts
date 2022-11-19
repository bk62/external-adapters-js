import { ExecuteWithConfig, InputParameters, Requester, Validator, AdapterInputError, AdapterCustomError } from '@chainlink/ea-bootstrap'
import { Config, NAME as AdapterName, SNAPSHOT_GRAPHQL_ENDPOINT } from '../config'
import { getGraphQLEAResult } from '../dataProvider'

export const supportedEndpoints = ['read']

export const endpointResultPaths = {
  data: 'data',
}

export interface ResponseSchema {
  Response?: string // for errors
  data: {
    // Some data
    
  }
}

// const customError = (data: ResponseSchema) => data.Response === 'Error'

// The inputParameters object must be present for README generation.
export type TInputParameters = { ipfs: string; id: string, space: string, author: string, final: boolean }
export const inputParameters: InputParameters<TInputParameters> = {
  // See InputParameters type for more config options
  ipfs: {
    aliases: ['ipfsCID', 'CID', 'proposalIpfsCID', 'proposalCID'],
    description: 'IPFS CID of the proposal metadata JSON file created by Snapshot that tniquely identifies the proposal.',
    type: "string",
    required: false,
  },
  id: {
    aliases: ['proposalId', 'proposalID'],
    description: 'Snapshot MySQL ID of the proposal that uniquely identifies the proposal. Either the ID or the IPFS CID is required.',
    type: "string",
    required: false,
  },
  space: {
    aliases: ['snapshotSpace', 'ENS'],
    description: 'Snapshot space name.',
    type: "string",
    required: false,
  },
  author: {
    aliases: ['proposalAuthor', 'createdBy'],
    description: 'Address of proposal author.',
    type: "string",
    required: false
  },
  final: {
    aliases: ['closed', 'votingClosed', 'finalScores'],
    description: 'Whether to only get final scores from closed proposals. Throws error if voting has not finished when set to true.',
    type: 'boolean',
    required: false
  }
}

export const execute: ExecuteWithConfig<Config> = async (request, context, config) => {
  const validator = new Validator(request, inputParameters)

  const jobRunID = validator.validated.id

  const ipfs = validator.overrideSymbol(AdapterName, validator.validated.data.ipfs)
  const id = validator.overrideSymbol(AdapterName, validator.validated.data.id)
  const space = validator.overrideSymbol(AdapterName, validator.validated.data.space)
  const author = validator.overrideSymbol(AdapterName, validator.validated.data.author)
  const final = validator.validated.data.final || false

  if (!id && !ipfs) {
    throw new AdapterInputError({
      message: 'Request is missing both "id" and "ipfs". One is required.',
    })
  }

  // const resultPath = validator.validated.data.resultPath

  const query = `
    query Proposal($id: String, $ipfs: String, $space: String, $author: String)  {
      proposals(
        first: 1,
        skip: 0,
        where: {
          space: $space,
          # state: "closed"
          ipfs: $ipfs
          id: $id,
          author: $author
        },
        orderBy: "created",
        orderDirection: desc
      ) {
        id
        choices
        # start
        # end
        # snapshot
        state
        # author
        scores
        # scores_total
        # scores_updated
        scores_state
        votes
        quorum
      }
    }
  `
  const variables = {
    id: id || "",
    ipfs: ipfs || "",
    space: space || "",
    author: author || ""
  };

  // Retrieve data from another external adapter
  const graphqlResult = await getGraphQLEAResult(jobRunID, query, variables, config.graphqlEndpoint || SNAPSHOT_GRAPHQL_ENDPOINT, context)


  // Perform logic to transform results

  if (final) {
    // throw error if final flag is true, but voting is still open on snapshot
    if (graphqlResult.scores_state !== "final" || graphqlResult.state !== "closed") {
      throw new AdapterCustomError({ message: `(Proposal state, Scores state): (${graphqlResult.state}, ${graphqlResult.scores_state})` })
    }
  }


  // Note: API seems to return scores, choices in descending order
  // but not relying on it
  const scores = graphqlResult.scores as number[];
  const winningChoiceIx = scores.indexOf(Math.max.apply(null, scores));
  const winningChoice = (graphqlResult.choices as string[])[winningChoiceIx];
  const winningScore = scores[winningChoiceIx];

  const data = {
    data: {
      // as expected by Requester.success method
      result: {
        winningChoice, winningScore,
        ...graphqlResult
      }
    }
  }

  return Requester.success(jobRunID, data, config.verbose)
}
