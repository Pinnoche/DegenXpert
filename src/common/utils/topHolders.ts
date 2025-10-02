import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface Holders {
  balance: string;
  balanceFormatted: string;
  isContract: boolean;
  ownerAddress: string;
  usdValue: string;
  percentageRelativeToTotalSupply: number;
}
export async function TopHolders(
  httpService: HttpService,
  address: string,
  limit = 10,
) {
  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) throw new Error('Missing API_KEY in environment variables');
  try {
    const url = `https://solana-gateway.moralis.io/token/mainnet/${address}/top-holders?limit=${limit}`;
    const res = await firstValueFrom(
      httpService.get(url, {
        headers: { accept: 'application/json', 'X-API-Key': apiKey },
      }),
    );
    const data = res.data as { result: Holders[] };
    return data.result;
  } catch (error) {
    throw new Error(
      `Failed to fetch top holders: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
