import { forwardRef, Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [HttpModule, forwardRef(() => UserModule)],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
