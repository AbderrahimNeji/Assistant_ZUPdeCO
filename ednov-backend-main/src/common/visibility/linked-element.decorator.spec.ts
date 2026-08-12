import { Reflector } from '@nestjs/core';
import { LinkedElement, LinkedElementMeta } from './linked-element.decorator';
import { LINKED_ELEMENT_KEY } from './visibility-scope.types';

/**
 * Applies a method decorator and returns a reflector-compatible handler function.
 * The decorator is applied to a dummy method on a dummy class so that NestJS's
 * Reflector.get() can retrieve the metadata in the same way the interceptor does.
 */
function applyDecorator(
  elementId: string,
  interfaceName: string,
): { handler: (...args: unknown[]) => unknown; meta: LinkedElementMeta | undefined } {
  class DummyController {}

  const descriptor: PropertyDescriptor = {
    value: function handler() {
      return undefined;
    },
  };

  // Apply the decorator as NestJS would
  LinkedElement(elementId, interfaceName)(
    DummyController.prototype,
    'handler',
    descriptor,
  );

  // Use Reflector to read back the metadata (same mechanism as the interceptor)
  const reflector = new Reflector();
  const meta = reflector.get<LinkedElementMeta>(LINKED_ELEMENT_KEY, descriptor.value);

  return { handler: descriptor.value as (...args: unknown[]) => unknown, meta };
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('LinkedElement decorator', () => {
  it('stores elementId in metadata under LINKED_ELEMENT_KEY', () => {
    const { meta } = applyDecorator('menu-sessions', 'sidebar');
    expect(meta?.elementId).toBe('menu-sessions');
  });

  it('stores interfaceName in metadata under LINKED_ELEMENT_KEY', () => {
    const { meta } = applyDecorator('menu-sessions', 'sidebar');
    expect(meta?.interfaceName).toBe('sidebar');
  });

  it('stores the exact metadata shape expected by the interceptor', () => {
    const { meta } = applyDecorator('menu-reports', 'sidebar');
    expect(meta).toEqual<LinkedElementMeta>({
      elementId: 'menu-reports',
      interfaceName: 'sidebar',
    });
  });

  it('uses the provided LINKED_ELEMENT_KEY constant as the metadata key', () => {
    const descriptor: PropertyDescriptor = {
      value: function handler() {
        return undefined;
      },
    };

    class Dummy {}
    LinkedElement('menu-students', 'sidebar')(Dummy.prototype, 'handler', descriptor);

    // Raw Reflect read (bypassing Reflector) confirms the key used
    const raw = Reflect.getMetadata(LINKED_ELEMENT_KEY, descriptor.value);
    expect(raw).toBeDefined();
    expect(raw.elementId).toBe('menu-students');
  });

  it('produces independent metadata for different methods', () => {
    const { meta: meta1 } = applyDecorator('menu-sessions', 'sidebar');
    const { meta: meta2 } = applyDecorator('menu-reports', 'sidebar');

    expect(meta1?.elementId).not.toBe(meta2?.elementId);
    expect(meta1?.elementId).toBe('menu-sessions');
    expect(meta2?.elementId).toBe('menu-reports');
  });

  it.each([
    ['menu-sessions', 'sidebar'],
    ['menu-reports', 'sidebar'],
    ['menu-students', 'sidebar'],
    ['menu-admins', 'sidebar'],
    ['menu-activities', 'sidebar'],
    ['menu-programs', 'sidebar'],
  ])('correctly stores (%s, %s)', (elementId, interfaceName) => {
    const { meta } = applyDecorator(elementId, interfaceName);
    expect(meta).toEqual({ elementId, interfaceName });
  });
});
