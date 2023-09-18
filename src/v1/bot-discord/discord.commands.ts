import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { LengthDto } from './dtos/length.dto';

@Injectable()
export class AppCommands {
  @SlashCommand({ name: 'ping', description: 'Test PING Koneksi' })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Semangat 👀' });
  }

  @SlashCommand({ name: 'length', description: 'Mendapatkan panjang teks' })
  public async onLength(
    @Context() [interaction]: SlashCommandContext,
    @Options() { text }: LengthDto,
  ) {
    return interaction.reply({ content: `Jumlah teks nya ${text.length}` });
  }
}
