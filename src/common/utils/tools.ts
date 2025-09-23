export const tools = [
  {
    function: {
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
      strict: true,
    },
    type: 'function' as const,
  },
  {
    function: {
      name: 'getTokenData',
      description: 'Look up a solana token stats by its contract address',
      parameters: {
        type: 'object',
        properties: {
          ca: { type: 'string', description: 'Contract address of token' },
        },
        required: ['ca'],
        strict: true,
      },
    },
    type: 'function' as const,
  },
  {
    function: {
      name: 'getGraduatedTokens',
      description: 'Fetch recently graduated or newly bonded Pump.fun tokens',
      parameters: { type: 'object', properties: {} },
      strict: true,
    },
    type: 'function' as const,
  },
  {
    function: {
      name: 'getSolanaWalletSwapHistory',
      description:
        'Get swap transactions of a Solana wallet address with the provided wallet address.',
      parameters: {
        type: 'object',
        properties: {
          wallet: { type: 'string', description: 'Wallet address' },
          limit: { type: 'number', description: 'Number of swaps to fetch' },
        },
        required: ['wallet'],
        strict: true,
      },
    },
    type: 'function' as const,
  },
];
