import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Re-fetch a resource with the caller bearer. Never widen on 403/401.
 */
export async function assertAccessible<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    if (error instanceof ForbiddenException) {
      throw new ForbiddenException('You cannot access that resource.');
    }
    if (error instanceof NotFoundException) {
      throw new NotFoundException('Resource not found.');
    }
    throw new ForbiddenException('You cannot access that resource.');
  }
}
