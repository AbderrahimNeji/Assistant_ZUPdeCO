import { Module } from '@nestjs/common';

import { SmallTalkService } from './small-talk.service';

@Module({
  providers: [SmallTalkService],
  exports: [SmallTalkService],
})
export class SmallTalkModule {}
