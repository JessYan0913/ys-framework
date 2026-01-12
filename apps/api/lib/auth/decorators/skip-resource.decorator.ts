import { SetMetadata } from '@nestjs/common';

export const SKIP_RESOURCE_KEY = 'skip-resource';
export const SkipResource = () => SetMetadata(SKIP_RESOURCE_KEY, true);
