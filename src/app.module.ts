import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsModule } from './agents/agents.module';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './guards/api-key.guards';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    AgentsModule,
    HttpModule,
  ],
  controllers: [AppController, AgentsController],
  providers: [
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    AppService,
    AgentsService,
  ],
})
export class AppModule {}
