import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditaisController } from './editais.controller';
import { EditaisService } from './services/editais.service';
import { OpsModule } from '../ops/ops.module';
import { Edital } from './entities/edital.entity';
import { UserFavorite } from '../user/entities/user-favorite.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Edital, UserFavorite]),
    OpsModule,
  ],
  controllers: [EditaisController],
  providers: [EditaisService],
})
export class EditaisModule {}
