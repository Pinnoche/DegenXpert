import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TopHolders } from 'src/common/utils/topHolders';

interface Holders {
  balance: string;
  balanceFormatted: string;
  isContract: boolean;
  ownerAddress: string;
  usdValue: string;
  percentageRelativeToTotalSupply: number;
}

interface DexscreenerResponse {
  pairs: [
    {
      baseToken: {
        address: string;
        name: string;
        symbol: string;
        decimals: number;
      };
      priceUsd: string;
      priceNative: string;
      liquidity: {
        usd: number;
        native: number;
        token: number;
      };
      volume: {
        h1: number;
        h6: number;
        h12: number;
        h24: number;
        d7: number;
        d30: number;
      };
      priceChange: {
        h1: number;
        h6: number;
        h12: number;
        h24: number;
        d7: number;
        d30: number;
      };
      txns: {
        h1: { buys: number; sells: number };
        h6: { buys: number; sells: number };
        h12: { buys: number; sells: number };
        h24: { buys: number; sells: number };
        d7: { buys: number; sells: number };
        d30: { buys: number; sells: number };
      };
      fdv: number;
      marketCap: number;
      info: {
        logos: string[];
        websites: { name: string; url: string }[];
        socials: { type: string; url: string }[];
        description: string;
      };
    },
  ];
}

interface Token {
  tokenAddress: string;
  name: string;
  symbol: string;
  priceUsd: string;
  graduatedAt: string;
  liquidity: string;
  fullyDilutedValuation: string;
  logo?: string;
}

@Injectable()
export class AgentsService {
  constructor(private readonly configService: ConfigService) {}
  getHello(): string {
    return '👋 Hello from Sentient Agent API!';
  }

  async getTopHolders(address: string, limit: number) {
    console.log('Executing Top holders.....');
    console.log(address);

    const holders = (await TopHolders(address, limit)) as Holders[];

    return holders.map((data: Holders) => ({
      ownerAddress: data.ownerAddress,
      balanceFormatted: Number(data.balanceFormatted).toLocaleString(),
      percentageRelativeToTotalSupply: data.percentageRelativeToTotalSupply,
    }));
  }

  async getTokenData(ca: string) {
    try {
      console.log('Executing Token Data.....');

      const dexscreenerUrl = `https://api.dexscreener.com/latest/dex/search/?q=${ca}`;
      const res = await fetch(dexscreenerUrl);

      if (!res.ok) {
        throw new Error(`Dexscreener fetch failed: ${res.status}`);
      }

      const data = (await res.json()) as DexscreenerResponse;
      console.log('Data:', data);
      const tokenData = data?.pairs?.[0];

      if (!tokenData) {
        throw new Error(`Token with address or query "${ca}" not found.`);
      }

      const {
        baseToken,
        priceUsd,
        priceNative,
        liquidity,
        volume,
        priceChange,
        txns,
        fdv,
        marketCap,
        info,
      } = tokenData;

      // Justification
      const justification = this.getTradeJustification({
        priceChange24h: priceChange.h24,
        buys: txns.h24.buys,
        sells: txns.h24.sells,
        liquidityUsd: liquidity.usd,
      });

      // Fetch holders using Moralis
      //   const apiKey = this.configService.get<string>('MORALIS_API_KEY');
      const holders = (await TopHolders(baseToken.address, 10)) as Holders[];

      const topHolders = holders.map((data: Holders) => ({
        ownerAddress: data.ownerAddress,
        balanceFormatted: Number(data.balanceFormatted).toLocaleString(),
        percentageRelativeToTotalSupply: data.percentageRelativeToTotalSupply,
      }));

      const riskCheck = topHolders.some(
        (h) => h.percentageRelativeToTotalSupply > 20,
      );

      const lpStatus = this.getLpStatus(liquidity.usd);
      const rugScore = this.computeRugScore({
        liquidityUsd: Number(liquidity.usd),
        priceChange24h: Number(priceChange.h24),
        buys: Number(txns.h24.buys),
        sells: Number(txns.h24.sells),
        riskCheck,
      });

      return {
        address: baseToken.address,
        token: `${baseToken.name} (${baseToken.symbol})`,
        priceUsd: `$${priceUsd}`,
        priceNative: `${priceNative} SOL`,
        liquidityUsd: `$${liquidity.usd.toLocaleString()}`,
        volume24h: `$${volume.h24.toLocaleString()}`,
        priceChange24h: `${priceChange.h24}%`,
        buysVsSells24h: `${txns.h24.buys} buys / ${txns.h24.sells} sells`,
        website: info?.websites?.[0]?.url ?? 'N/A',
        twitter:
          info?.socials?.find((s: { type: string }) => s.type === 'twitter')
            ?.url ?? 'N/A',
        fdvUsd: `$${fdv.toLocaleString()}`,
        marketCapUsd: `$${marketCap.toLocaleString()}`,
        topHolders,
        justification,
        security: {
          rugScore: `${rugScore}/10`,
          lpStatus,
        },
      };
    } catch (error) {
      console.error('Error in getTokenData:', error);
      throw new InternalServerErrorException({
        message: 'Failed to fetch token data',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getGraduatedTokens(limit = 20) {
    const apiKey = this.configService.get<string>('MORALIS_API_KEY');
    const url = `https://solana-gateway.moralis.io/token/mainnet/exchange/pumpfun/graduated?limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        'X-API-Key': apiKey ?? '',
      } as Record<string, string>,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `Failed to fetch graduated tokens: ${res.status} - ${errorBody}`,
      );
    }

    const data = await res.json();

    return data.result.map((token: Token) => ({
      address: token.tokenAddress,
      name: token.name,
      symbol: token.symbol,
      priceUsd: `$${token.priceUsd}`,
      liquidity: token.liquidity ?? 'N/A',
      fdv: token.fullyDilutedValuation ?? 'N/A',
      logo: token.logo ?? null,
      graduatedAt: new Date(token.graduatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  }

  private getTradeJustification({
    priceChange24h,
    buys,
    sells,
    liquidityUsd,
  }: {
    priceChange24h: number;
    buys: number;
    sells: number;
    liquidityUsd: number;
  }): string {
    if (priceChange24h > 20 && buys > sells && liquidityUsd > 100000) {
      return '📈 Up only vibes. Smart apes loading bags. Might be a solid entry 🦍🚀';
    } else if (priceChange24h < -15 && sells > buys) {
      return '🔻 Heavy sell pressure. Could be mid-rug energy. Stay sharp, degen.';
    } else if (liquidityUsd < 10000) {
      return '💧 Liquidity looking sus. Might be exit scam season. Proceed with caution.';
    }
    return '🤔 Mixed signals. Might wanna wait for confirmation or check LP lock.';
  }

  private getLpStatus(liquidityUsd: number): string {
    if (liquidityUsd > 100000)
      return 'Possibly Locked or burned (Getting Safe) ✅';
    if (liquidityUsd < 50000) return 'Possibly unlocked and Risky';
    return 'Unknown ❓';
  }

  private computeRugScore({
    liquidityUsd,
    priceChange24h,
    buys,
    sells,
    riskCheck,
  }: {
    liquidityUsd: number;
    priceChange24h: number;
    buys: number;
    sells: number;
    riskCheck: boolean;
  }): number {
    let score = 10;

    if (riskCheck) score -= 8;
    if (liquidityUsd < 10000) score -= 4;
    if (sells > buys * 1.5) score -= 3;
    if (priceChange24h < -25) score -= 2;

    return Math.max(score, 1);
  }
}
