import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { firstValueFrom } from 'rxjs';
import { fetchSolanaWallet } from 'src/common/utils/solanaWallet';
import { Holders, TopHolders } from 'src/common/utils/topHolders';
import { tools } from 'src/common/utils/tools';

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
  address: string;
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
  private modelName: string;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      baseURL: process.env.FIREWORKS_BASEURL,
      apiKey: process.env.FIREWORKS_AI_API_KEY,
    });
    this.modelName = process.env.FIREWORKS_MODEL_NAME || '';
  }

  async askAgent(question: string) {
    const systemPrompt = `
You are DMJ, a sharp, helpful crypto agent that helps users check solana token stats, top holders, new launches, and wallet activity.
You can chat normally with the user AND you can use tools for crypto-specific queries.

AVAILABLE TOOLS:
1. 'getTokenData(ca)' — ONLY if the user asks for token stats (price, FDV, symbol, volume). Requires a valid token/contract address.
2. 'getTopHolders(address, limit)' — ONLY if the user explicitly asks for top holders of a token. Requires a valid token address.
3. 'getGraduatedTokens()' — ONLY if the user explicitly asks about new tokens, fresh launches, or recently bonded tokens. No input required.
4. 'getSolanaWalletSwapHistory(wallet, limit)' — ONLY if the user explicitly asks for wallet activity, buys, sells, or swaps. Requires a valid wallet address.

🚨 VERY IMPORTANT RULES:
- Do NOT call any tool unless the user explicitly requests one of the above crypto actions.
- For questions like "what can you do?", greetings, or general chat, reply naturally — DO NOT use tools.
- If a required parameter (like token address) is missing, politely ask for it instead of guessing.
- Never fabricate answers. Always rely on tools for real-time data.
- Always treat Solana addresses as case-sensitive (32–44 characters).
- For Regular Chat: Keep responses short, confident, and user-friendly.
- For Tool Results: DO NOT output raw JSON. instead convert the output
  git add .into clear, AI-style responses.
- Never explain tool logic or mention tools unless you’re calling one.

`;

    const completion = await this.openai.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      tools,
      tool_choice: 'auto',
    });

    const message = completion.choices[0].message;

    if (message.tool_calls) {
      for (const call of message.tool_calls ?? []) {
        if (call.type === 'function') {
          const { name, arguments: argsJson } = call.function as {
            name: string;
            arguments: string;
          };

          try {
            let toolResponse: any;
            const args = JSON.parse(argsJson) as string | Record<string, any>;
            switch (name) {
              case 'getTopHolders':
                {
                  const { address, limit } = args as {
                    address: string;
                    limit?: number;
                  };

                  toolResponse = await this.getTopHolders(address, limit ?? 10);
                }
                break;
              case 'getTokenData':
                {
                  const { ca } = args as { ca: string };

                  toolResponse = await this.getTokenData(ca);
                }
                break;
              case 'getGraduatedTokens':
                {
                  toolResponse = await this.getGraduatedTokens();
                }
                break;
              case 'getSolanaWalletSwapHistory':
                {
                  const { wallet, limit } = args as {
                    wallet: string;
                    limit?: number;
                  };

                  toolResponse = await this.getSolanaWalletSwapHistory(
                    wallet,
                    limit ?? 10,
                  );
                }
                break;
              default:
                return { error: `Unknown tool: ${name}` };
            }
            const followUp = await this.openai.chat.completions.create({
              model: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: question },
                message,
                {
                  role: 'tool',
                  tool_call_id: call.id,
                  content: JSON.stringify(toolResponse),
                },
              ],
            });
            return followUp.choices[0].message.content;
          } catch (error) {
            return {
              error: `Error using tool ${name}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            };
          }
        }
      }
    }
    if (message.content?.includes('<think>')) {
      return this.cleanThinkResponse(message.content);
    } else if (message.content?.includes('<tool>')) {
      return this.cleanToolResponse(message.content);
    }
    return message.content;
  }

  async streamAgent(question: string) {
    const systemPrompt = `
You are DMJ, a sharp, helpful crypto agent that helps users check solana token stats, top holders, new launches, and wallet activity.
You can chat normally with the user AND you can use tools for crypto-specific queries.

AVAILABLE TOOLS:
1. 'getTokenData(ca)' — ONLY if the user asks for token stats (price, FDV, symbol, volume). Requires a valid token/contract address.
2. 'getTopHolders(address, limit)' — ONLY if the user explicitly asks for top holders of a token. Requires a valid token address.
3. 'getGraduatedTokens()' — ONLY if the user explicitly asks about new tokens, fresh launches, or recently bonded tokens. No input required.
4. 'getSolanaWalletSwapHistory(wallet, limit)' — ONLY if the user explicitly asks for wallet activity, buys, sells, or swaps. Requires a valid wallet address.

🚨 VERY IMPORTANT RULES:
- Do NOT call any tool unless the user explicitly requests one of the above crypto actions.
- For questions like "what can you do?", greetings, or general chat, reply naturally — DO NOT use tools.
- If a required parameter (like token address) is missing, politely ask for it instead of guessing.
- Never fabricate answers. Always rely on tools for real-time data.
- Always treat Solana addresses as case-sensitive (32–44 characters).
- For Regular Chat: Keep responses short, confident, and user-friendly.
- For Tool Results: DO NOT output raw JSON. instead convert the output
  git add .into clear, AI-style responses.
- Never explain tool logic or mention tools unless you’re calling one.

`;
    const stream = await this.openai.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      tools,
      tool_choice: 'auto',
      stream: true,
      // store: true,
    });

    // const streamChunks = [];
    let buffer: string = '';
    let insideThink: boolean = false;
    for await (const chunk of stream) {
      const message = chunk.choices[0]?.delta?.content || '';
      const content = chunk.choices[0]?.delta;

      // console.log('Chunk:', content);
      if (!message) continue;
      buffer += message;

      if (content?.tool_calls) {
        console.log('Tool Call:', content.tool_calls);
      }

      if (message.includes('<think>')) insideThink = true;

      if (message.includes('</think>')) {
        insideThink = false;
        buffer = this.cleanThinkResponse(buffer);
      }

      if (!insideThink && buffer.trim()) {
        const cleanContent = buffer.trim();

        console.log('Stream:', cleanContent);
        return cleanContent;
      }
    }
  }

  getHello(): string {
    return '👋 Hello from DMJ!. <br /> <br /> DegenXpert is a Solana-focused AI crypto agent. It interacts with users to retrieve real-time token stats, top holder data, wallet tracking, and new token launches for degen traders.';
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
      return String(error);
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
        contract_address: token.address || token.logo?.split('_')?.[1] || 'N/A',
        name: token.name,
        symbol: token.symbol,
        priceUsd: `$${token.priceUsd}`,
        liquidity: token.liquidity ?? 'N/A',
        fdv: token.fullyDilutedValuation ?? 'N/A',
        // logo: token.logo ?? null,
        graduatedAt: new Date(token.graduatedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));
    } catch (error) {
      return String(error);
    }
  }

  async getSolanaWalletSwapHistory(wallet: string, limit: number) {
    try {
      return await fetchSolanaWallet(this.httpService, wallet, limit);
    } catch (error) {
      console.error('Error in getHistory:', error);
      return String(error);
    }
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

  private cleanThinkResponse(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }
  private cleanToolResponse(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/tool>/g, '').trim();
  }
}
