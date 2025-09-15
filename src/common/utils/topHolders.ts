export async function TopHolders(address: string, limit = 10) {
  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey)
    throw new Error('Missing MORALIS_API_KEY in environment variables');

  const url = `https://solana-gateway.moralis.io/token/mainnet/${address}/top-holders?limit=${limit}`;
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'X-API-Key': apiKey },
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `Failed to fetch top holders: ${res.status} - ${errorBody}`,
    );
  }

  const data = await res.json();
  return data.result;
}
