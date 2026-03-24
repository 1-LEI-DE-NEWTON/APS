import { Module } from '@nestjs/common';
import { EditaisController } from './editais.controller';
import { EditaisService } from './services/editais.service';
import { OpsModule } from '../ops/ops.module';

@Module({
  imports: [OpsModule],
  controllers: [EditaisController],
  providers: [EditaisService],
})
export class EditaisModule {}
