import { Module } from '@nestjs/common';
import { DiscordModule } from './bot-discord/discord.module';

@Module({
  imports: [DiscordModule],
})
export class V1Module {}
