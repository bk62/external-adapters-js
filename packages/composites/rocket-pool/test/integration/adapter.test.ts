import { AdapterRequest, FastifyInstance } from '@chainlink/ea-bootstrap'
import { AddressInfo } from 'net'
import nock from 'nock'
import request, { SuperTest, Test } from 'supertest'
import { server as startServer } from '../../src'
import { mockETHSuccess, mockUSDSuccess } from './fixtures'
import { ethers } from 'ethers'

jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  ethers: {
    providers: {
      JsonRpcProvider: function (): ethers.providers.JsonRpcProvider {
        return {} as ethers.providers.JsonRpcProvider
      },
    },
    Contract: function () {
      return {
        getExchangeRate: () => {
          return jest.requireActual('ethers').BigNumber.from('1040000000000000000')
        },
        decimals: () => {
          return jest.requireActual('ethers').BigNumber.from(18)
        },
      }
    },
  },
}))

jest.mock('@chainlink/contracts/ethers/v0.6/factories/AggregatorV2V3Interface__factory', () => ({
  ...jest.requireActual(
    '@chainlink/contracts/ethers/v0.6/factories/AggregatorV2V3Interface__factory',
  ),
  AggregatorV2V3Interface__factory: {
    connect: function () {
      return {
        latestAnswer: async () => {
          return jest.requireActual('ethers').BigNumber.from('129000000000')
        },
        decimals: () => {
          return jest.requireActual('ethers').BigNumber.from(8)
        },
      }
    },
  },
}))

describe('execute', () => {
  const id = '1'
  let fastify: FastifyInstance
  let req: SuperTest<Test>
  let oldEnv: NodeJS.ProcessEnv

  beforeAll(async () => {
    oldEnv = JSON.parse(JSON.stringify(process.env))

    process.env.CACHE_ENABLED = 'false'
    process.env.ETHEREUM_RPC_URL = 'http://test.rpc'
    if (process.env.RECORD) {
      nock.recorder.rec()
    }
    fastify = await startServer()
    req = request(`localhost:${(fastify.server.address() as AddressInfo).port}`)
  })

  afterAll((done) => {
    process.env = oldEnv

    if (process.env.RECORD) {
      nock.recorder.play()
    }

    nock.restore()
    nock.cleanAll()
    nock.enableNetConnect()
    fastify.close(done)
  })

  describe('reth endpoint', () => {
    it('returns rETH/ETH price with no input params', async () => {
      const data: AdapterRequest = { id, data: {} }
      mockETHSuccess()

      const response = await req
        .post('/')
        .send(data)
        .set('Accept', '*/*')
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
      expect(response.body).toMatchSnapshot()
    })

    it('returns rETH/USD price with "quote: USD" input param', async () => {
      const data: AdapterRequest = { id, data: { quote: 'USD' } }
      mockUSDSuccess()

      const response = await req
        .post('/')
        .send(data)
        .set('Accept', '*/*')
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
      expect(response.body).toMatchSnapshot()
    })
  })
})
