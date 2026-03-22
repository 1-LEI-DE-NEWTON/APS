import { Module } from '@nestjs/common';
import { EditaisController } from './editais.controller';
import { EditaisService } from './services/editais.service';

@Module({
  controllers: [EditaisController],
  providers: [EditaisService],
})
export class EditaisModule {}
