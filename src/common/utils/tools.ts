export const tools = [
  {
    name: 'getTopHolders',
    description: 'Fetch top holders of a Solana token given contract address',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Contract address' },
        limit: { type: 'number', description: 'Number of holders to fetch' },
      },
      required: ['address'],
    },
  },
  {
    name: 'tokenData',
    description: 'Look up live data of a crypto token',
    parameters: {
      type: 'object',
      properties: {
        ca: { type: 'string', description: 'Contract address of token' },
      },
      required: ['ca'],
    },
  },
  {
    name: 'getGraduatedTokens',
    description: 'Fetch recently graduated Pump.fun tokens',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getSolanaWalletSwapHistory',
    description: 'Get swap transactions of a Solana wallet',
    parameters: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address' },
        limit: { type: 'number', description: 'Number of swaps to fetch' },
      },
      required: ['wallet'],
    },
  },
];
