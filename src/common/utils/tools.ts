export const tools = [
  {
    function: {
      name: 'get_top_holders',
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
    type: 'function' as const,
  },
  {
    function: {
      name: 'get_token_data',
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
      name: 'get_graduated_tokens',
      description: 'Fetch recently graduated or newly bonded Pump.fun tokens',
      parameters: { type: 'object', properties: {} },
    },
    type: 'function' as const,
  },
  {
    function: {
      name: 'get_solana_wallet_swap_history',
      description:
        'Get swap transactions of a Solana wallet address with the provided wallet address.',
      parameters: {
        type: 'object',
        properties: {
          wallet: { type: 'string', description: 'Wallet address' },
          limit: { type: 'number', description: 'Number of swaps to fetch' },
        },
        required: ['wallet'],
      },
    },
    type: 'function' as const,
  },
];
