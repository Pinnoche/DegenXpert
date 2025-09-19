import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { firstValueFrom } from 'rxjs';
import { fetchSolanaWallet } from 'src/common/utils/solanaWallet';
import { Holders, TopHolders } from 'src/common/utils/topHolders';
// import { tools } from 'src/common/utils/tools';

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
  private openai: OpenAI;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      baseURL: process.env.FIREWORKS_BASEURL,
      apiKey: process.env.FIREWORKS_AI_API_KEY,
    });
  }

  async askAgent(question: string) {
    const systemPrompt = `
   You are DMJ, a sharp, helpful crypto agent that helps users check solana token stats, top holders, new launches, and wallet activity.
    You have access to the following tools:
'tokenData(ca)' tool — when user asks for token price, FDV, symbol, volume, or address-based lookup. Requires a contract/token address → returns token live data and risk analysis.
 'getTopHolders(address, limit)' tool — to list top holders for a token. If the token address is missing, ask the user for it → returns top token holders.
 'graduatedTokens()' tool — when user asks for new tokens, fresh launches, or newly bonded/graduated tokens. This tool requires no input, and you must **never ask user for any contract/wallet address** for this action. Just call the tool immediately → returns recently bonded Pump.fun tokens.
'getWalletSwaps(wallet, limit)' tool — to get swap history for a specific wallet (buys/sells). Requires a wallet address → returns wallet swap history.
Use the tools to answer user questions. Always check if you have all required parameters for a tool before using it. If any required parameter is missing, ask the user for it. Always treat contract addresses as case-sensitive (no transformations). Solana addresses are 32–44 characters.

---
Here are some SMART RULES to follow:

- Never auto-generate response to questions that's not greeting, if unsure, ask to clarify
- Only give answers to crypto or degen related questions that you can use tools for
- Never disclose your methods or show any related code or functions
- Always treat token/contract addresses as case-sensitive (no transformations).
- Solana addresses are 32–44 characters.
- If you’re unsure which tool to use, ask the user to clarify.
- Give friendly user related error message if any of the tools returns an error.
- Keep responses short, useful, and formatted (show token address, price, FDV, market cap where relevant).
- Always use the tools to get real-time data, never make up data.
Respond confidently. Be concise but informative.
    `;

    const completion = await this.openai.chat.completions.create({
      model: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      // tools: tools.map((tool) => ({
      //   type: 'function',
      //   function: tool,
      // })),
      // tool_choice: 'auto',
    });

    return completion.choices[0].message;
  }

  getHello(): string {
    return '👋 Hello from Sentient Agent API!';
  }

  async getTopHolders(address: string, limit: number) {
    const holders = await TopHolders(this.httpService, address, limit);

    return holders.map((data) => ({
      ownerAddress: data.ownerAddress,
      balanceFormatted: Number(data.balanceFormatted).toLocaleString(),
      percentageRelativeToTotalSupply: data.percentageRelativeToTotalSupply,
    }));
  }

  async getTokenData(ca: string) {
    try {
      const dexscreenerUrl = `https://api.dexscreener.com/latest/dex/search/?q=${ca}`;
      const res = await firstValueFrom(this.httpService.get(dexscreenerUrl));

      const data = res.data as DexscreenerResponse;

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

      const holders = await TopHolders(this.httpService, baseToken.address, 10);

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
    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            accept: 'application/json',
            'X-API-Key': apiKey ?? '',
          } as Record<string, string>,
        }),
      );
      const data = res.data as { result: Token[] };
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
    } catch (error) {
      throw new Error(
        `Failed to fetch graduated tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSolanaWalletSwapHistory(wallet: string, limit: number) {
    try {
      return await fetchSolanaWallet(wallet, limit);
    } catch (error) {
      console.error('Error in getHistory:', error);
      throw new InternalServerErrorException({
        message: 'Failed to fetch history data',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    // return { message: `History for ${address} with limit ${limit}` };
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
