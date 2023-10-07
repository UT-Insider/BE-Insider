import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { LengthDto } from './dtos/length.dto';

@Injectable()
export class AppCommands {
  @SlashCommand({ name: 'ping', description: 'Ping bot connection' })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    interaction.reply(
      `UT Insider heartbeat: ${Date.now() - interaction.createdTimestamp}ms.`,
    );
  }

  @SlashCommand({ name: 'versi', description: 'Versi BOT' })
  public async onVersion(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: '0.1.4.1' });
  }

  @SlashCommand({ name: 'length', description: 'Mendapatkan panjang teks' })
  public async onLength(
    @Context() [interaction]: SlashCommandContext,
    @Options() { text }: LengthDto,
  ) {
    return interaction.reply({ content: `Jumlah teks nya ${text.length}` });
  }

  @SlashCommand({ name: 'restart', description: 'Restart BOT' })
  public async restart(@Context() [interaction]: SlashCommandContext) {
    // Cek apakah message dari admin
    if (interaction.user.tag === 'dimarhanung') {
      await interaction.channel.send('Restarting...');
      process.exit(1);
    } else {
      await interaction.reply('Kamu nggak punya izin untuk restart bot!');
    }
  }
}
