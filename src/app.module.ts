import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsModule } from './agents/agents.module';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    AgentsModule,
    HttpModule,
  ],
  controllers: [AppController, AgentsController],
  providers: [AppService, AgentsService],
})
export class AppModule {}
