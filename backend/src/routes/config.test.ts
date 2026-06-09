import configRouter from './config';

describe('config router', () => {
  it('returns supported locales and marker categories', () => {
    const route = configRouter.stack.find((layer) => layer.route?.path === '/config');
    const handler = route?.route?.stack[0]?.handle;
    const json = jest.fn();

    expect(handler).toBeDefined();

    handler?.({} as never, { json } as never, jest.fn());

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supported_locales: ['zh-CN', 'en', 'hi'],
          marker_categories: expect.objectContaining({
            risk: expect.arrayContaining(['abuse', 'poison']),
            help: expect.arrayContaining(['station', 'nearby_adoption']),
          }),
        }),
      })
    );
  });
});
