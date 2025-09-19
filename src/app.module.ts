import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsModule } from './agents/agents.module';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    AgentsModule,
    HttpModule,
  ],
  controllers: [AppController, AiController],
  providers: [AppService, AiService],
})
export class AppModule {}
