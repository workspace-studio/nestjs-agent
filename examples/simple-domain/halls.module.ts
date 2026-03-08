import { Module } from '@nestjs/common';
import { HallsController } from './halls.controller';
import { HallsService } from './halls.service';
import { HallsRepository } from './halls.repository';

@Module({
  controllers: [HallsController],
  providers: [HallsService, HallsRepository],
  exports: [HallsService],
})
export class HallsModule {}
